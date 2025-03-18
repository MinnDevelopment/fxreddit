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
    let slug: string;

    // Handle different URL formats
    // https://www.twitch.tv/varidetta/clip/xx123 need to convert to 
    // https://clips.twitch.tv/embed?clip=xx123 for embedding
    if (url.hostname === 'clips.twitch.tv') {
        slug = url.searchParams.get('clip') || '';
    } else {
        const pathParts = url.pathname.split('/');

        // The slug is always the part after 'clip/' in the path
        const clipIndex = pathParts.indexOf('clip');
        if (clipIndex !== -1 && clipIndex + 1 < pathParts.length) {
            slug = pathParts[clipIndex + 1];
        } else {
            // Fallback to the old method if the path structure is different
            slug = url.pathname.substring(1);
        }
    }

    const embedUrl = new URL('https://clips.twitch.tv/embed');
    embedUrl.searchParams.set('clip', slug);

    // This is required so the csp allows us to embed the video
    // idk what twitch was thinking on this one my dudes
    for (const parent of TWITCH_ANCESTORS) {
        embedUrl.searchParams.append('parent', parent);
    }

    head.video(embedUrl.toString(), post.oembed?.width, post.oembed?.height, 'text/html');

    if (post.oembed?.thumbnail_url) {
        head.image(post.oembed.thumbnail_url, post.oembed?.thumbnail_width, post.oembed?.thumbnail_height);
    }
}