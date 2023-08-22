import { Router } from 'itty-router';
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

app.get('/', () => {
    console.log('Hello world!');
    return new Response('Hello world!');
});

app.get('/r/:name/comments/:id/:slug', async (req) => {
    const name = req.params.name;
    const id = req.params.id;
    const slug = req.params.slug;

    const post = await get_post(name, id, slug);
    const html = postToHtml(post);
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
});

app.all('*', () => new Response('Not found', { status: 404 }));

addEventListener('fetch', (event) => {
    event.respondWith(app.handle(event.request));
});