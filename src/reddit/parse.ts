import { Image, RedditListingData, RedditPost } from './types';

export function parseRedditPost(metadata: RedditListingData): RedditPost {
    let resolution: undefined | { width: number, height: number } = undefined;

    let post_hint = metadata.post_hint;
    let video_url = metadata.secure_media?.reddit_video?.fallback_url;
    let has_audio = true;

    if (metadata?.media?.reddit_video) {
        resolution = { width: metadata.media.reddit_video.width, height: metadata.media.reddit_video.height };
        video_url = metadata.media.reddit_video.fallback_url;
        has_audio = metadata.media.reddit_video.has_audio;
        post_hint = 'hosted:video';
    } else if (metadata?.preview?.images?.length) {
        if (metadata.preview.images[0].source) {
            resolution = metadata.preview.images[0].source;
        } else {
            const resolutions = metadata.preview?.images?.[0].resolutions;
            resolution = resolutions?.[resolutions?.length - 1];
        }
    } else if (metadata?.thumbnail_width && metadata?.thumbnail_height) {
        resolution = { width: metadata.thumbnail_width, height: metadata.thumbnail_height };
    }

    const media_metadata: Image[] = [];
    if (metadata.media_metadata && metadata.gallery_data?.items) {
        for (const { media_id, caption } of metadata.gallery_data.items) {
            const value = metadata.media_metadata[media_id];
            media_metadata.push({
                width: value.s.x,
                height: value.s.y,
                url: value.s.u,
                caption: caption,
            });
        }
    } else if (metadata.media_metadata) {
        for (const { s: { x, y, u } } of Object.values(metadata.media_metadata)) {
            if (!x || !y || !u) continue;
            media_metadata.push({
                width: x,
                height: y,
                url: u,
            });
        }
    }

    return {
        subreddit: metadata.subreddit,
        title: metadata.title,
        post_hint: post_hint,
        url: metadata.url,
        permalink: metadata.permalink,
        description: (metadata.selftext ?? metadata.body)?.replace(/^&amp;#x200B;/, '')?.trim() ?? '',
        is_reddit_media: metadata.is_reddit_media_domain,
        preview_image_url: metadata.preview?.images?.[0].source?.url ?? metadata.thumbnail,
        resolution: resolution ? { width: resolution.width, height: resolution.height } : undefined,
        video_url: video_url,
        video_has_audio: has_audio,
        oembed: metadata.media?.oembed,
        domain: metadata.domain,
        secure_media_embed: metadata.secure_media_embed,
        media_metadata,
        author: metadata.author,
    };
}