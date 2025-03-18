import { HTMLElement } from 'node-html-parser';
import { PollData, RedditPost } from './types';
import { youtubeEmbed } from '../embeds/youtube';
import { twitchClipEmbed } from '../embeds/twitch';
import { twitterLinkEmbed } from '../embeds/twitter';
import '../html';
import { get_packaged_video } from '../util';
import { isNonNullish } from 'remeda';
import { externalImgurEmbed } from '../embeds/imgur';
import { encodeOEmbed } from './oembed';

const imageExtensions = [
    'png',
    'jpg',
    'jpeg',
    'gif',
];

function isImageUrl(url: URL) {
    return imageExtensions.some(extension => url.pathname.endsWith(`.${extension}`));
}

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
        case 'imgur.com':
        case 'i.imgur.com':
            return {
                handler: externalImgurEmbed,
                type: 'video.other',
            };
        default:
            return null;
    }
}

export async function postToHtml(post: RedditPost): Promise<HTMLElement> {
    const html = new HTMLElement('html', {});
    const head = html.appendChild(new HTMLElement('head', {}));
    const originalUrl = `https://www.reddit.com${post.permalink}`;
    const authorName = `u/${post.author} on r/${post.subreddit}`;

    head.meta('og:title', authorName);
    head.meta('twitter:title', authorName);
    head.meta('twitter:creator', post.title);

    const oembed = head.appendChild(new HTMLElement('link', {}));
    oembed.setAttribute('rel', 'alternate');
    oembed.setAttribute('type', 'application/json+oembed');
    oembed.setAttribute('title', authorName);
    oembed.setAttribute('href', encodeOEmbed({
        type: 'link',
        author_name: post.title,
        author_url: originalUrl,
        provider_name: 'rxddit.com',
        version: '1.0',
    }));

    const canonical = head.appendChild(new HTMLElement('link', {}));
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', originalUrl);
    head.meta('og:url', originalUrl);

    head.meta('og:site_name', 'rxddit.com');
    head.meta('twitter:site', 'rxddit.com');
    head.meta('theme-color', '#ff581a');

    let descriptionText = post.description;
    const descriptionStatus = [];

    let type = 'object';

    switch (post.post_hint) {
        case 'image':
            type = 'photo';
            head.image(post.url, post.resolution?.width, post.resolution?.height, 'large');
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
                head.image(post.oembed.thumbnail_url, undefined, undefined, post.is_media_only ? 'large' : 'thumbnail');
                descriptionText += post.oembed.title;
            } else if (post.preview_image_url) {
                head.image(post.preview_image_url, post.resolution?.width, post.resolution?.height, post.is_media_only ? 'large' : 'thumbnail');
            } else if (post.url?.startsWith('https://')) {
                const url = new URL(post.url);
                if (isImageUrl(url)) {
                    head.image(post.url, post.resolution?.width, post.resolution?.height, 'large');
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

    const pollDescription = isNonNullish(post.poll_data) ? compilePollData(post.poll_data) : '';

    // Set the description based on the post content and status
    const description = [descriptionStatus.join(' '), descriptionText, pollDescription].join('\n\n').trim();
    if (description.length) {
        head.meta('og:description', description);
        head.meta('twitter:description', description);
    }

    return html;
}

function compilePollData({ options, total_vote_count }: PollData) {
    const maxVotes = options.map(({ vote_count }) => vote_count).filter(isNonNullish).reduce((a, b) => Math.max(a, b), 0);
    const answers = options.map(({ text, vote_count }) => {
        const decoration = vote_count === maxVotes ? ' 🥇' : '';
        if (isNonNullish(vote_count)) {
            return `${text} (${vote_count} votes)\n${getPollAnswerBar(vote_count, total_vote_count)}${decoration}`;
        } else {
            return `- ${text}`;
        }
    }).join('\n');

    return `📊 Poll:\n\n${answers}\n\nTotal Votes: ${total_vote_count}`;
}

function getPollAnswerBar(votes: number, total_votes: number) {
    const percentage = Math.min(votes / total_votes, 1.0);
    return '\u2587'.repeat(20 * percentage);
}
