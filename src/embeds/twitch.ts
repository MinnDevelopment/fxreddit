import { RedditPost } from '../reddit/types';
import { HTMLElement } from 'node-html-parser';
import '../html';

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

/** Converts the twitch clip link to a video embed url */
export async function twitchClipEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const url: URL = new URL(link);
    
    // Handle different URL formats
    const SLUG_EXTRACTOR: Record<string, (url: URL) => string | null> = {
        'www.twitch.tv': (url: URL) => {
            // The slug is always the part after 'clip/' in the path
            const pathParts = url.pathname.split('/');
            const clipIndex = pathParts.indexOf('clip');
            return clipIndex !== -1 && clipIndex + 1 < pathParts.length 
                ? pathParts[clipIndex + 1] 
                : url.pathname.substring(1);
        }, // https://www.twitch.tv/varidetta/clip/xx123
        'clips.twitch.tv': (url: URL) => url.pathname.substring(1), // https://clips.twitch.tv/clip=xx123
    };

    const slug = SLUG_EXTRACTOR[url.hostname]?.(url) ?? null;
    
    if (slug) {
        const embedUrl = new URL('https://clips.twitch.tv/embed');
        embedUrl.searchParams.set('clip', slug);

        // This is required so the csp allows us to embed the video
        // idk what twitch was thinking on this one my dudes
        for (const parent of TWITCH_ANCESTORS) {
            embedUrl.searchParams.append('parent', parent);
        }

        head.video(embedUrl.toString(), post.oembed?.width, post.oembed?.height, 'text/html');
    }
    

    if (post.oembed?.thumbnail_url) {
        head.image(post.oembed.thumbnail_url, post.oembed?.thumbnail_width, post.oembed?.thumbnail_height);
    }
}