import { IRequest } from 'itty-router';
import { cleanSpoiler, redirectPage } from '../util';
import { FETCH_HEADERS, RESPONSE_HEADERS } from '../constants';
import { CACHE_CONFIG } from '../cache';

/** Determines the original link by using the Location header */
export async function handleShare(request: IRequest) {
    const url = new URL(cleanSpoiler(request.url));
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