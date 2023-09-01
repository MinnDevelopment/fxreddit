import { IRequest, Router, html as HtmlResponse } from 'itty-router';
import { postToHtml } from './reddit/compile';
import { parseRedditPost } from './reddit/parse';
import { RedditListingData, RedditListingResponse, RedditPost } from './reddit/types';
import { Sentry } from '@borderless/worker-sentry';
import { HTMLElement } from 'node-html-parser';
import { CACHE_CONFIG } from './cache';
import { httpEquiv } from './html';

const sentry = new Sentry({
    dsn: SENTRY_ENDPOINT,

    // Performance Monitoring
    // tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
});

const REDDIT_BASE_URL = 'https://www.reddit.com';
const CUSTOM_DOMAIN = 'rxddit.com';
// const WORKER_DOMAIN = 'vxreddit.minn.workers.dev';

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.5',
};

const RESPONSE_HEADERS = {
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': 'public, max-age=86400'
};

class ResponseError extends Error {
    constructor(public status: number, public error: string) {
        super(`${status}: ${error}`);
    }
}

function findComment(children: { data: RedditListingData }[], id: string): RedditListingData | null {
    for (const { data } of children) {
        if (!id || data.id == id) {
            return data;
        }

        const comment = data.replies ? findComment(data.replies.data.children, id) : undefined;
        if (comment) {
            return comment;
        }
    }

    return null;
}

async function get_post(url: string, commentRef?: string) {
    return await fetch(url, { headers: FETCH_HEADERS, ...CACHE_CONFIG })
        .then((r) => r.ok ? r.json<RedditListingResponse[]>() : Promise.reject(new ResponseError(r.status, r.statusText)))
        .then(list => {
            const post = parseRedditPost(list[0].data.children[0].data);
            if (commentRef) {
                for (const listing of list) {
                    const comment = findComment(listing.data.children, commentRef);
                    if (comment) {
                        post.comment = parseRedditPost(comment);
                        break;
                    }
                }
            }

            return post;
        });
}

function get_post_url(type: string, id: string, subreddit?: string, slug?: string, commentRef?: string) {
    let url = REDDIT_BASE_URL;
    if (subreddit && slug && commentRef) {
        url += `/${type}/${subreddit}/comments/${id}/${slug}/${commentRef}.json`;
    } else if (subreddit && slug) {
        url += `/${type}/${subreddit}/comments/${id}/${slug}.json`;
    } else if (subreddit) {
        url += `/${type}/${subreddit}/comments/${id}.json`;
    } else {
        url += `/${id}.json`;
    }

    return url;
}

async function get_subreddit_post(id: string, subreddit?: string, slug?: string, commentRef?: string): Promise<RedditPost> {
    const url = get_post_url('r', id, subreddit, slug, commentRef);
    return await get_post(url, commentRef);
}

async function get_profile_post(id: string, user?: string, slug?: string, commentRef?: string): Promise<RedditPost> {
    const url = get_post_url('user', id, user, slug, commentRef);
    return await get_post(url, commentRef);
}

function isBot({ headers }: IRequest): boolean {
    return headers.get('User-Agent')?.toLowerCase()?.includes('bot') ?? false;
}

function getOriginalUrl(url: string) {
    const location = new URL(url);

    if (location.hostname.endsWith(CUSTOM_DOMAIN)) {
        location.hostname = location.hostname.replace(CUSTOM_DOMAIN, 'reddit.com');
    } else {
        location.hostname = 'reddit.com';
    }

    location.protocol = 'https:';
    location.port = '';

    return location.toString();
}

function redirectPage(url: string) {
    const html = new HTMLElement('html', {});
    html.appendChild(new HTMLElement('head', {}).appendChild(httpEquiv(url)));
    return html;
}

function fallbackRedirect(req: IRequest) {
    const url = getOriginalUrl(req.url);
    const html = redirectPage(url);

    return HtmlResponse(html.toString(), {
        headers: { Location: url }, status: 302
    });
}

const router = Router();

async function handlePost(request: IRequest, resolver: (id: string, name?: string, slug?: string, ref?: string) => Promise<RedditPost>) {
    const { params, url } = request;
    const { name, id, slug, ref } = params;
    const originalLink = getOriginalUrl(url);
    const bot = isBot(request);

    const headers: HeadersInit = { ...RESPONSE_HEADERS };
    const { protocol } = new URL(url);
    if (protocol === 'https:') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    if (!bot) { // forcing redirect for browsers
        headers['Location'] = originalLink;
        return new Response(redirectPage(originalLink).toString(), { headers, status: 302 });
    }

    try {
        const post = await resolver(id, name, slug, ref);
        const html = await postToHtml(post);

        html.querySelector('head')?.appendChild(httpEquiv(originalLink));

        return new Response(html.toString(), {
            headers,
            status: 200
        });
    } catch (err) {
        const { status } = err as ResponseError;
        if (status === 404) {
            return new Response('Post not found', {
                headers,
                status
            });
        } else {
            throw err;
        }
    }
}

/** Determines the original link by using the Location header */
async function handleShare(request: IRequest) {
    const url = new URL(request.url);
    url.hostname = 'www.reddit.com';
    url.port = '';
    url.protocol = 'https:';

    const response = await fetch(url.toString(), { headers: FETCH_HEADERS, ...CACHE_CONFIG, redirect: 'manual' });
    const location = response.headers.get('Location');
    if (location) {
        const redirect = new URL(location);
        redirect.hostname = new URL(request.url).hostname;
        return new Response(redirectPage(redirect.toString()).toString(), {
            headers: {
                Location: redirect.toString(),
                ...RESPONSE_HEADERS
            }, status: 302
        });
    } else {
        return new Response('Post not found', { status: 404 });
    }
}

const ROBOTS_TXT = () => new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } });
const SECURITY_TXT = () => new Response('Contact: https://github.com/MinnDevelopment/fxreddit/issues/new', { headers: { 'Content-Type': 'text/plain' } });
const NOT_FOUND = () => new Response('Not Found', { status: 404 });

const handleSubredditPost = (req: IRequest) => handlePost(req, get_subreddit_post);
const handleProfilePost = (req: IRequest) => handlePost(req, get_profile_post);

router
    // Block all robots / crawlers
    .get('/robots.txt', ROBOTS_TXT)
    .get('/security.txt', SECURITY_TXT)
    .get('/blog', fallbackRedirect)
    .get('/new', fallbackRedirect)
    // Some static files we don't support
    .get('/*.ico', NOT_FOUND)
    .get('/*.png', NOT_FOUND)
    .get('/*.jpg', NOT_FOUND)
    .get('/*.jpeg', NOT_FOUND)
    .get('/*.txt', NOT_FOUND)
    .get('/*.xml', NOT_FOUND)
    // Links to posts
    .get('/r/:name/comments/:id/:slug?', handleSubredditPost)
    .get('/:id', handleSubredditPost)
    .get('/user/:name/comments/:id/:slug?', handleProfilePost)
    .get('/u/:name/comments/:id/:slug?', handleProfilePost)
    // Direct links to comments
    .get('/r/:name/comments/:id/:slug/:ref', handleSubredditPost)
    .get('/user/:name/comments/:id/:slug/:ref', handleProfilePost)
    .get('/u/:name/comments/:id/:slug/:ref', handleProfilePost)
    // Share links
    .get('/r/:name/s/:id', handleShare)
    .get('/u/:name/s/:id', handleShare)
    .get('/user/:name/s/:id', handleShare)
    // On missing routes we simply redirect
    .all('*', fallbackRedirect);

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
