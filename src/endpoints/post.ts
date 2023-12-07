import { IRequest } from 'itty-router';
import { RedditListingData, RedditListingResponse, RedditPost } from '../reddit/types';
import { cleanSpoiler, getOriginalUrl, isBot, redirectPage } from '../util';
import { FETCH_HEADERS, REDDIT_BASE_URL, RESPONSE_HEADERS } from '../constants';
import { httpEquiv } from '../html';
import ResponseError from '../response_error';
import { postToHtml } from '../reddit/compile';
import { parseRedditPost } from '../reddit/parse';
import { CACHE_CONFIG } from '../cache';

export async function handlePost(request: IRequest, resolver: (id: string, name?: string, slug?: string, ref?: string) => Promise<RedditPost>) {
    const { params } = request;
    const url = cleanSpoiler(request.url);
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
        url += `/${type}/${subreddit}/comments/${id}/${slug}/${cleanSpoiler(commentRef)}.json`;
    } else if (subreddit && slug) {
        url += `/${type}/${subreddit}/comments/${id}/${cleanSpoiler(slug)}.json`;
    } else if (subreddit) {
        url += `/${type}/${subreddit}/comments/${cleanSpoiler(id)}.json`;
    } else {
        url += `/${cleanSpoiler(id)}.json`;
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

export const handleSubredditPost = (req: IRequest) => handlePost(req, get_subreddit_post);
export const handleProfilePost = (req: IRequest) => handlePost(req, get_profile_post);