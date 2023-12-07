import { HTMLElement, parse as parseHTML } from 'node-html-parser';
import { RedditPost } from './types';
import { CACHE_CONFIG } from '../cache';
import { youtubeEmbed } from '../embeds/youtube';
import { twitchClipEmbed } from '../embeds/twitch';
import { twitterLinkEmbed } from '../embeds/twitter';
import '../html';
import { get_packaged_video } from '../util';

function getDomainHandler(domain?: string) {
    switch (domain) {
        case 'youtu.be':
        case 'www.youtube.com':
        case 'youtube.com':
            return {
                handler: youtubeEmbed,
                type: 'video.other',
            };
        case 'clips.twitch.tv':
            return {
                handler: twitchClipEmbed,
                type: 'video.other',
            };
        case 'twitter.com':
        case 'x.com':
            return {
                handler: twitterLinkEmbed,
                type: 'summary',
            };
        default:
            return null;
    }
}

export async function postToHtml(post: RedditPost): Promise<HTMLElement> {
    const html = new HTMLElement('html', {});
    const head = html.appendChild(new HTMLElement('head', {}));

    head.meta('og:title', `r/${post.subreddit}: ${post.title}`);
    head.meta('twitter:title', post.title);
    head.meta('og:url', `https://www.reddit.com${post.permalink}`);
    head.meta('og:site_name', 'rxddit.com');
    head.meta('twitter:site', 'rxddit.com');
    head.meta('theme-color', '#ff581a');

    let descriptionText = post.description;
    const descriptionStatus = [];

    let type = 'object';

    switch (post.post_hint) {
        case 'image':
            type = 'photo';
            head.meta('twitter:card', 'summary_large_image');
            head.image(post.url, post.resolution?.width, post.resolution?.height);
            break;
        // case 'rich:video':
        case 'hosted:video': {
            type = 'video.other';

            const packagedVideo = await get_packaged_video(post.permalink);
            if (packagedVideo) {
                const { dimensions: { width, height } } = packagedVideo;
                // head.video(packagedVideo.source.url, width, height);
                // Proxied endpoint which resolves to the current video url, to avoid using expiring links
                head.video(`/v${post.permalink}`, width, height);
            } else {
                // If we can't find a video with audio, we'll just settle with the one provided by Reddit
                head.video(post.video_url ?? post.url, post.resolution?.width, post.resolution?.height);
            }
            break;
        }
        case 'link':
        default: {
            const domainHandler = getDomainHandler(post.domain);
            if (domainHandler) {
                type = domainHandler.type;
                await domainHandler.handler(post, post.url, head);
            } else if (post.media_metadata && post.media_metadata.length) {
                head.meta('twitter:card', 'summary_large_image');
                const amount = post.media_metadata.length;

                if (amount > 1) {
                    descriptionStatus.push(`🖼️ Gallery: ${post.media_metadata.length} Images`);
                }

                let index = 1;
                for (const image of post.media_metadata) {
                    head.image(image.url, image.width, image.height);
                    if (image.caption?.length) {
                        head.meta('twitter:image:alt', image.caption);
                        head.meta('og:image:alt', image.caption);
                    } else if (amount > 1) {
                        head.meta('twitter:image:alt', `Image ${index} of ${amount}`);
                        head.meta('og:image:alt', `Image ${index} of ${amount}`);
                        index++;
                    }
                }
            } else if (post.oembed) {
                head.image(post.oembed.thumbnail_url);
                descriptionText += post.oembed.title;
            } else if (post.preview_image_url) {
                head.image(post.preview_image_url, post.resolution?.width, post.resolution?.height);
            } else if (post.url) {
                const url = new URL(post.url);
                if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.gif')) {
                    head.meta('twitter:card', 'summary_large_image');
                    head.image(post.url);
                } else if (url.pathname.endsWith('.mp4')) {
                    head.video(post.url);
                }
            }

            break;
        }
    }

    head.meta('og:type', type);

    if (post.comment?.author) {
        const { author, description: comment } = post.comment;
        const commentText = `Comment by u/${author}${comment ? `:\n${comment}` : ''}`;
        if (commentText.length < 1000) {
            descriptionText = `${commentText}\n\n---- Original Post ----\n\n${descriptionText}`;
        } else {
            descriptionText = commentText;
        }
    }

    // Set the description based on the post content and status
    const description = (descriptionStatus.join(' ') + '\n\n' + descriptionText).trim();
    if (description.length) {
        head.meta('og:description', description);
        head.meta('twitter:description', description);
    }

    return html;
}
