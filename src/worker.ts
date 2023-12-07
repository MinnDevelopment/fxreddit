import { Router, html as HtmlResponse } from 'itty-router';
import { Sentry } from '@borderless/worker-sentry';
import { HTMLElement } from 'node-html-parser';
import { httpEquiv } from './html';
import { handleProfilePost, handleSubredditPost } from './endpoints/post';
import { handleShare } from './endpoints/share';
import { getVideo } from './endpoints/video';
import { GITHUB_LINK } from './constants';
import { fallbackRedirect, getOriginalUrl, redirectPage } from './util';

const sentry = new Sentry({
    dsn: SENTRY_ENDPOINT,

    // Performance Monitoring
    // tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
});

const router = Router();

const ROBOTS_TXT = () => new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } });
const SECURITY_TXT = () => new Response('Contact: https://github.com/MinnDevelopment/fxreddit/issues/new', { headers: { 'Content-Type': 'text/plain' } });
const NOT_FOUND = () => new Response('Not Found', { status: 404 });

router
    .get('/', () => HtmlResponse(redirectPage(GITHUB_LINK).toString(), { status: 302, headers: { Location: GITHUB_LINK } }))
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
    // Video proxying
    .get('/v/r/:name/comments/:id/:slug?', getVideo)
    .get('/v/:id', getVideo)
    .get('/v/user/:name/comments/:id/:slug?', getVideo)
    .get('/v/u/:name/comments/:id/:slug?', getVideo)
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
        const html = new HTMLElement('html', {});
        const head = html.appendChild(new HTMLElement('head', {}));
        head.appendChild(httpEquiv(getOriginalUrl(event.request.url)));
        head.meta('og:description', `Failed to parse reddit post, please report bug!\n\n${GITHUB_LINK}/issues/new`);
        head.meta('theme-color', '#e3242b');
        const body = html.appendChild(new HTMLElement('body', {}));
        body.appendChild(new HTMLElement('h1', {}, 'Internal Server Error'));
        body.appendChild(new HTMLElement('p', {}, err.message));
        return HtmlResponse(html.toString());
    }));
});
