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
    const slug = url.pathname.substring(1);
    url.pathname = '/embed';
    url.searchParams.set('clip', slug);

    // This is required so the csp allows us to embed the video
    // idk what twitch was thinking on this one my dudes
    for (const parent of TWITCH_ANCESTORS) {
        url.searchParams.append('parent', parent);
    }

    head.video(url.toString(), post.oembed?.width, post.oembed?.height, 'text/html');

    if (post.oembed?.thumbnail_url) {
        head.image(post.oembed.thumbnail_url, post.oembed?.thumbnail_width, post.oembed?.thumbnail_height);
    }
}