import { RedditListingResponse, RedditPost } from './types';

export function parseRedditPost(record: RedditListingResponse): RedditPost {
    const metadata = record.data.children[0].data;
    let resolution = undefined;

    let post_hint = metadata.post_hint;
    let video_url = metadata.secure_media?.reddit_video?.fallback_url;

    if (metadata?.media?.reddit_video) {
        resolution = { width: metadata.media.reddit_video.width, height: metadata.media.reddit_video.height };
        video_url = metadata.media.reddit_video.fallback_url;
        post_hint = 'hosted:video';
    } else if (metadata?.preview?.images?.length) {
        if (metadata.preview.images[0].source) {
            resolution = metadata.preview.images[0].source;
        } else {
            const resolutions = metadata.preview?.images?.[0].resolutions;
            resolution = resolutions?.[resolutions?.length - 1];
        }
    }

    // console.log(JSON.stringify(metadata, null, 2));
    return {
        kind: record.kind,
        subreddit: metadata.subreddit,
        title: metadata.title,
        post_hint: post_hint,
        url: metadata.url,
        permalink: metadata.permalink,
        description: metadata.selftext,
        is_reddit_media: metadata.is_reddit_media_domain,
        preview_image_url: metadata.preview?.images?.[0].source?.url,
        resolution: resolution ? { width: resolution.width, height: resolution.height } : undefined,
        video_url: video_url,
        oembed: metadata.media?.oembed
    };
}

export function postToHtml(post: RedditPost): string {
    let html = '<!DOCTYPE html><html><head>';

    html += `<meta property="og:title" content="r/${post.subreddit}: ${post.title.replaceAll('"', '\\"')}" />`;
    html += `<meta property="twitter:title" content="${post.title.replaceAll('"', '\\"')}" />`;
    html += `<meta property="og:url" content="https://www.reddit.com${post.permalink}" />`;

    if (post.description) {
        const description = post.description.replaceAll('"', '\\"');
        html += `<meta property="og:description" content="${description}" />`;
    }

    switch (post.post_hint) {
    case 'image':
        html += '<meta property="og:type" content="object">';
        html += `<meta property="og:image" content="${post.url}" />`;
        html += `<meta name="twitter:image:src" content="${post.url}" />`;
        html += '<meta name="twitter:card" content="summary_large_image" />';
        if (post.resolution) {
            html += `<meta property="og:image:width" content="${post.resolution.width}" />`;
            html += `<meta property="og:image:height" content="${post.resolution.height}" />`;
        }
        break;
    case 'hosted:video':
        html += `<meta property="og:video" content="${post.video_url}" />`;
        html += '<meta property="og:type" content="video.other" />';
        html += '<meta property="og:video:type" content="video/mp4" />';
        if (post.video_url) {
            html += `<meta property="og:video:url" content="${post.video_url}" />`;
            html += `<meta property="og:video:secure_url" content="${post.video_url}" />`;
            html += `<meta property="twitter:player" content="${post.video_url}" />`;
        }
        if (post.resolution) {
            html += `<meta property="og:video:width" content="${post.resolution.width}" />`;
            html += `<meta property="og:video:height" content="${post.resolution.height}" />`;
            html += `<meta property="twitter:player:width" content="${post.resolution.width}" />`;
            html += `<meta property="twitter:player:height" content="${post.resolution.height}" />`;
        }
        break;
    default:
        html += '<meta property="og:type" content="object">';
        if (post.oembed) {
            html += `<meta property="og:image" content="${post.oembed.thumbnail_url}" />`;
            html += `<meta property="og:description" content="${post.oembed.title}" />`;
        } else if (post.preview_image_url) {
            html += `<meta property="og:image" content="${post.preview_image_url}" />`;
        }
        break;
    }

    html += '</head></html>';

    return html;
}