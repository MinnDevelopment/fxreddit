import { RedditPost } from '../reddit/types';
import { HTMLElement, parse as parseHTML } from 'node-html-parser';
import '../html';

const LINK_REGEX = new RegExp('^https?://(?:www\\.)?(?:twitter|x)\\.com/(?:#!/)?([^/]+)/status(?:es)?/([^/]+)$', 'i');

const FXTWITTER_HEADERS = {
    'User-Agent': 'Discordbot 2.0',
};

export async function twitterLinkEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const result = LINK_REGEX.exec(link);
    const [, username, id] = result ?? [];

    if (username && id) {
        const html = await fetch(`https://fxtwitter.com/${username}/status/${id}`, { headers: FXTWITTER_HEADERS }).then(r => r.text()).then(parseHTML);

        const description = html.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const image = html.querySelector('meta[property="og:image"]')?.getAttribute('content');
        const video = html.querySelector('meta[property="og:video"]')?.getAttribute('content');
        const title = html.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const card = html.querySelector('meta[property="twitter:card"]')?.getAttribute('content');

        if (card) {
            head.meta('twitter:card', card);
        }

        if (description) {
            const richText = `${description}\n- ${title} on Twitter`;
            head.meta('og:description', richText);
            head.meta('twitter:description', richText);
        } else {
            head.meta('og:description', `${title} on Twitter`);
            head.meta('twitter:description', `${title} on Twitter`);
        }

        if (image) {
            const width = toNum(html.querySelector('meta[property="og:image:width"]')?.getAttribute('content'));
            const height = toNum(html.querySelector('meta[property="og:image:height"]')?.getAttribute('content'));

            head.image(image, width, height);
        }

        if (video) {
            const type = html.querySelector('meta[property="og:video:type"]')?.getAttribute('content') ?? 'video/mp4';
            const width = toNum(html.querySelector('meta[property="og:video:width"]')?.getAttribute('content'));
            const height = toNum(html.querySelector('meta[property="og:video:height"]')?.getAttribute('content'));

            head.video(video, width, height, type);
        }
    }
}

function toNum(str: string | null | undefined) {
    return str ? parseInt(str) : undefined;
}
