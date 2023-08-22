import { IRequest, Router, html as HtmlResponse } from 'itty-router';
import { parseRedditPost, postToHtml } from './reddit/reddit';
import { RedditListingResponse, RedditPost } from './reddit/types';

const REDDIT_BASE_URL = 'https://www.reddit.com';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0'
};

async function get_post(subreddit: string, id: string, slug: string): Promise<RedditPost> {
    return await fetch(`${REDDIT_BASE_URL}/r/${subreddit}/comments/${id}/${slug}.json`, { headers: HEADERS })
        .then((r) => r.json<RedditListingResponse[]>())
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

    if (location.hostname.endsWith('rxddit.com')) {
        location.hostname = location.hostname.replace('rxddit.com', 'reddit.com');
    } else {
        location.hostname = 'reddit.com';
    }

    location.protocol = 'https:';
    location.port = '';

    return HtmlResponse(`<head><meta http-equiv="Refresh" content="0; URL=${location.toString().replaceAll('"', '\\"')}" /></head>`, {
        headers: { Location: location.toString() }, status: 302
    });
}

const router = Router();

router
    // Redirect all browser usage
    .all('*', redirectBrowser)
    // Otherwise, if its a bot we respond with a meta tag page
    .get('/r/:name/comments/:id/:slug', async ({ params }) => {
        const name = params.name;
        const id = params.id;
        const slug = params.slug;

        const post = await get_post(name, id, slug);
        const html = postToHtml(post);
        return HtmlResponse(html);
    })
    // On missing routes we simply redirect
    .all('*', (req) => redirectBrowser(req, true));

addEventListener('fetch', (event) => {
    event.respondWith(router.handle(event.request).catch(console.error));
});
