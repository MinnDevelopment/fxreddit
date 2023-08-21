import { Router } from 'itty-router';
import { RedditListingResponse, RedditPost, parseRedditPost } from './reddit';

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

function as_embed(post: RedditPost, { name, id, slug }: { name: string, id: string, slug: string }): Response {
    return new Response(`<!DOCTYPE html>
            <html>
            <head>
                <meta property="og:title" content="${post.title}">
                <meta property="og:url" content="${REDDIT_BASE_URL}/r/${name}/comments/${id}/${slug}">
                <meta property="og:image" content="${post.url}">
                ${post.resolution ? `
                <meta property="og:image:width" content="${post.resolution?.width}">
                <meta property="og:image:height" content="${post.resolution?.height}">` : ''}
                
                <meta property="og:type" content="object">
                
                <meta name="twitter:title" content="${post.title}">
                <meta name="twitter:image:src" content="${post.url}">
                <meta name="twitter:card" content="summary_large_image">
            </head>
            </html>`, { headers: { 'Content-Type': 'text/html' } });
}

app.get('/', () => {
    console.log('Hello world!');
    return new Response('Hello world!');
});

app.get('/r/:name/comments/:id/:slug', async (req) => {
    const name = req.params.name;
    const id = req.params.id;
    const slug = req.params.slug;

    return as_embed(await get_post(name, id, slug), req.params);
});

app.all('*', () => new Response('Not found', { status: 404 }));

addEventListener('fetch', (event) => {
    event.respondWith(app.handle(event.request));
});