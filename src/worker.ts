import { IRequest, Router } from 'itty-router';
import { parseRedditPost, postToHtml } from './reddit/reddit';
import { RedditListingResponse, RedditPost } from './reddit/types';

const app = Router();
const REDDIT_BASE_URL = 'https://www.reddit.com';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0'
};

async function get_post(subreddit: string, id: string, slug: string): Promise<RedditPost> {
    return await fetch(`${REDDIT_BASE_URL}/r/${subreddit}/comments/${id}/${slug}.json`, { headers: HEADERS })
        .then((r) => r.json())
        .then(([json]) => parseRedditPost(json as RedditListingResponse));
}

function isBot(request: IRequest): boolean {
    return request.headers.get('User-Agent')?.toLowerCase()?.includes('bot') ?? false;
}

app.get('/r/:name/comments/:id/:slug', async (req) => {
    const name = req.params.name;
    const id = req.params.id;
    const slug = req.params.slug;

    if (isBot(req)) {
        const post = await get_post(name, id, slug);
        const html = postToHtml(post);
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    } else {
        return new Response('', { headers: { Location: `${REDDIT_BASE_URL}/r/${name}/comments/${id}/${slug}` }, status: 302 });
    }
});

app.all('*', (req) => {
    // Redirect to original reddit link with given path
    // Extract path from url
    const path = req.url.substring(req.url.substring('https://'.length).indexOf('/') + 'https://'.length);
    return new Response('', { headers: { Location: `https://www.reddit.com/${path}` }, status: 302 });
});

addEventListener('fetch', (event) => {
    event.respondWith(app.handle(event.request));
});