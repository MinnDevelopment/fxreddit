import { RedditPost } from '../reddit/types';
import { HTMLElement, parse as parseHTML } from 'node-html-parser';
import { CACHE_CONFIG } from '../cache';
import '../html';

/** Converts the youtube link to a video embed url */
export async function youtubeEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const url: URL = new URL(link);

    // Clip links need another request to extract a proper url for embedding
    if (url.pathname.startsWith('/clip/')) {
        const html = await fetch(link, { ...CACHE_CONFIG }).then(r => r.text()).then(parseHTML);
        const clipEmbed = html.querySelector('meta[name="twitter:player"]')?.getAttribute('content');
        const thumbnail = html.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

        if (thumbnail) {
            head.image(thumbnail, post.oembed?.width, post.oembed?.height);
        }
        if (clipEmbed) {
            head.video(clipEmbed, post.oembed?.width, post.oembed?.height, 'text/html');
        }

        return;
    }

    const YOUTUBE_EXTRACTOR: Record<string, (url: URL) => string | null> = {
        'youtu.be': (url: URL) => url.pathname.substring(1), // https://youtu.be/abc123
        'www.youtube.com': (url: URL) => url.searchParams.get('v'), // https://www.youtube.com/watch?v=abc123
        'youtube.com': (url: URL) => url.searchParams.get('v'), // https://youtube.com/watch?v=abc123
    };

    const id = YOUTUBE_EXTRACTOR[url.hostname]?.(url) ?? null;

    if (id) {
        url.hostname = 'www.youtube.com';
        url.pathname = '/embed/' + id;

        head.video(url.toString(), post.oembed?.width, post.oembed?.height, 'text/html');
        head.image(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`, post.oembed?.width, post.oembed?.height);
    }
}
