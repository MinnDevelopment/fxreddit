import { isDefined, isNonNullish } from 'remeda';
import { Image, RedditListingData, RedditPost } from './types';

export function parseRedditPost(metadata: RedditListingData): RedditPost {
    const crosspost = metadata.crosspost_parent_list?.length ? parseRedditPost(metadata.crosspost_parent_list[0]) : undefined;

    let resolution: undefined | { width: number, height: number } = undefined;

    let post_hint = metadata.post_hint ?? 'unknown';
    let video_url = metadata.secure_media?.reddit_video?.fallback_url;
    let has_audio = true;

    if (metadata?.media?.reddit_video) {
        resolution = { width: metadata.media.reddit_video.width, height: metadata.media.reddit_video.height };
        video_url = metadata.media.reddit_video.fallback_url;
        has_audio = metadata.media.reddit_video.has_audio;
        post_hint = 'hosted:video';
    } else if (crosspost) {
        video_url = crosspost.video_url;
        resolution = crosspost.resolution;
        post_hint = crosspost.post_hint;
        has_audio = crosspost.video_has_audio === true;
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
            if (!value.s) continue;
            media_metadata.push({
                width: value.s.x,
                height: value.s.y,
                url: value.s.u,
                caption: caption,
            });
        }
    } else if (metadata.media_metadata) {
        for (const values of Object.values(metadata.media_metadata)) {
            if (!values.s) continue;
            media_metadata.push({
                width: values.s.x,
                height: values.s.y,
                url: values.s.u,
            });
        }
    } else if (isDefined(crosspost?.media_metadata)) {
        media_metadata.push(...crosspost.media_metadata);
    }

    const preview_image_url = firstNotEmpty(metadata.preview?.images?.[0].source?.url, metadata.thumbnail, crosspost?.preview_image_url);

    return {
        subreddit: metadata.subreddit,
        title: metadata.title,
        post_hint: post_hint,
        url: metadata.url,
        permalink: metadata.permalink,
        description: getDescription(metadata),
        is_reddit_media: metadata.is_reddit_media_domain,
        preview_image_url,
        resolution: resolution ? { width: resolution.width, height: resolution.height } : undefined,
        video_url: video_url,
        video_has_audio: has_audio,
        oembed: metadata.media?.oembed,
        domain: metadata.domain,
        secure_media_embed: metadata.secure_media_embed,
        media_metadata,
        author: metadata.author,
        poll_data: metadata.poll_data,
    };
}

function getDescription(metadata: RedditListingData): string {
    let text = metadata.selftext ?? metadata.body;
    if (isNonNullish(metadata.poll_data)) {
        text = text?.replace(/^\s*\[View Poll\]\([^)]+\)/gi, '');
    }
    return text?.replace(/^&amp;#x200B;/, '')?.trim() ?? '';
}

function firstNotEmpty(...strings: (string | undefined)[]) {
    for (const s of strings) {
        if (isNonNullish(s) && s.trim().length > 0) {
            return s;
        }
    }

    return undefined;
}