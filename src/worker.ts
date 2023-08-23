import { IRequest, Router, html as HtmlResponse } from 'itty-router';
import { parseRedditPost, postToHtml } from './reddit/reddit';
import { RedditListingResponse, RedditPost } from './reddit/types';
import { Sentry } from '@borderless/worker-sentry';

const sentry = new Sentry({
    dsn: SENTRY_ENDPOINT,

    // Performance Monitoring
    // tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
});

const REDDIT_BASE_URL = 'https://www.reddit.com';
const CUSTOM_DOMAIN = 'rxddit.com';
// const WORKER_DOMAIN = 'vxreddit.minn.workers.dev';

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0'
};

const RESPONSE_HEADERS = {
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': 'public, max-age=86400'
};

const CACHE = {
    cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
            '200-299': 86400,
            '404': 1,
            '500-599': 0
        } // Cache for 1 day
    }
};

class ResponseError extends Error {
    constructor(public status: number, public error: string) {
        super(error);
    }
}

async function get_post(subreddit: string, id: string, slug: string): Promise<RedditPost> {
    return await fetch(`${REDDIT_BASE_URL}/r/${subreddit}/comments/${id}/${slug}.json`, { headers: FETCH_HEADERS, ...CACHE })
        .then((r) => r.ok ? r.json<RedditListingResponse[]>() : Promise.reject(new ResponseError(r.status, r.statusText)))
        .then(([json]) => parseRedditPost(json));
}

function isBot({ headers }: IRequest): boolean {
    return headers.get('User-Agent')?.toLowerCase()?.includes('bot') ?? false;
}

function redirectBrowser(req: IRequest, force: boolean = false) {
    if (!force && isBot(req)) {
        return;
    }

    const location = new URL(req.url);

    if (location.hostname.endsWith(CUSTOM_DOMAIN)) {
        location.hostname = location.hostname.replace(CUSTOM_DOMAIN, 'reddit.com');
    } else {
        location.hostname = 'reddit.com';
    }

    location.protocol = 'https:';
    location.port = '';

    const url = location.toString();

    return HtmlResponse(`<head><meta http-equiv="Refresh" content="0; URL=${url.replaceAll('"', '\\"')}" /></head>`, {
        headers: { Location: url }, status: 302
    });
}

const router = Router();

router
    // Redirect all browser usage
    .all('*', (req) => redirectBrowser(req))
    // Otherwise, if its a bot we respond with a meta tag page
    .get('/r/:name/comments/:id/:slug', async ({ params, url, headers: reqHeaders }) => {
        const name = params.name;
        const id = params.id;
        const slug = params.slug;

        const headers: HeadersInit = { ...RESPONSE_HEADERS };
        const { protocol } = new URL(url);
        if (protocol === 'https:') {
            headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
        }

        try {
            const post = await get_post(name, id, slug);
            const html = postToHtml(post);

            return new Response(html, {
                headers
            });
        } catch (err) {
            const { status, error } = err as ResponseError;
            if (status === 404) {
                return new Response('Post not found', {
                    headers,
                    status
                });
            } else {
                sentry.captureException(err as Error, {
                    tags: {
                        name,
                        id,
                        slug
                    },
                    user: {
                        ip: reqHeaders.get('cf-connecting-ip') ?? undefined,
                    },
                });
                return new Response(`Error: ${status} ${error}`, {
                    headers,
                    status: 500,
                    statusText: 'Internal Server Error'
                });
            }
        }
    })
    // On missing routes we simply redirect
    .all('*', (req) => redirectBrowser(req, true));

addEventListener('fetch', (event) => {
    event.respondWith(router.handle(event.request).catch((err) => {
        // Extend the event lifetime until the response from Sentry has resolved.
        // Docs: https://developers.cloudflare.com/workers/runtime-apis/fetch-event#methods
        console.error(err);
        event.waitUntil(
            // Sends a request to Sentry and returns the response promise.
            sentry.captureException(err, {
                tags: {
                    level: 'handler',
                },
                request: {
                    url: event.request.url,
                    method: event.request.method,
                    headers: Object.fromEntries(event.request.headers.entries()),
                },
                user: {
                    ip: event.request.headers.get('cf-connecting-ip') ?? undefined,
                },
            }).catch(console.error)
        );

        // Respond to the original request while the error is being logged (above).
        return new Response(err.message || 'Internal Server Error', { status: 500 });
    }));
});
