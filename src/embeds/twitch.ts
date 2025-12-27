import { RedditPost } from '../reddit/types';
import { HTMLElement } from 'node-html-parser';
import '../html';
import { isString } from 'remeda';

const TWITCH_ANCESTORS = [
    'twitter.com',
    'x.com', // 🤡
    'cards-frame.twitter.com',
    'tweetdeck.twitter.com',
    'discordapp.com',
    'discord.com',
    'ptb.discordapp.com',
    'ptb.discord.com',
    'canary.discordapp.com',
    'canary.discord.com',
    'embedly.com',
    'cdn.embedly.com',
    'facebook.com',
    'www.facebook.com',
    'meta.com', // 🤡
    'www.meta.com',
    'vk.com',
];

type ExtractorFunction = (url: URL) => string | null | undefined;

const SLUG_EXTRACTOR: Record<string, ExtractorFunction | undefined> = {
    // https://www.twitch.tv/username/clip/abcd1234
    'www.twitch.tv': (url: URL) => {
        // The slug is always the part after 'clip/' in the path
        const pathParts = url.pathname.split('/');
        const clipIndex = pathParts.indexOf('clip');
        return clipIndex >= 0 && clipIndex + 1 < pathParts.length
            ? pathParts[clipIndex + 1]
            : url.pathname.substring(1);
    },
    // https://clips.twitch.tv/abcd1234
    'clips.twitch.tv': (url: URL) => url.pathname.substring(1),
};

/** Converts the twitch clip link to a video embed url */
export async function twitchClipEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const url: URL = new URL(link);

    const extractor = SLUG_EXTRACTOR[url.hostname];
    const slug = extractor?.(url);

    if (!isString(slug)) {
        return;
    }

    const embeddingUrl = new URL('https://clips.twitch.tv/embed');
    embeddingUrl.searchParams.set('clip', slug);

    // This is required so the csp allows us to embed the video
    // idk what twitch was thinking on this one my dudes
    for (const parent of TWITCH_ANCESTORS) {
        embeddingUrl.searchParams.append('parent', parent);
    }

    const resolution = {
        width: post.oembed?.width ?? 1920,
        height: post.oembed?.height ?? 1080,
    };

    head.meta('twitter:card', 'player');
    head.video(embeddingUrl.toString(), resolution.width, resolution.height, 'text/html');

    if (post.oembed?.thumbnail_url) {
        head.image(post.oembed.thumbnail_url, post.oembed?.thumbnail_width ?? resolution.width, post.oembed?.thumbnail_height ?? resolution.height);
    } else if (post.preview_image_url) {
        head.image(post.preview_image_url, resolution.width, resolution.height);
    }
}