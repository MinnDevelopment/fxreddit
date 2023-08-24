import { HTMLElement } from 'node-html-parser';
import { Image, RedditListingResponse, RedditPost } from './types';

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

    const media_metadata: Image[] = [];
    if (metadata.media_metadata && metadata.gallery_data?.items) {
        for (const { media_id } of metadata.gallery_data.items) {
            const value = metadata.media_metadata[media_id];
            media_metadata.push({
                width: value.s.x,
                height: value.s.y,
                url: value.s.u,
            });
        }
    }

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
        oembed: metadata.media?.oembed,
        media_metadata,
    };
}

declare module 'node-html-parser' {
    interface HTMLElement {
        meta(propertyName: string, content?: string): HTMLElement;

        image(url: string, width?: number, height?: number): HTMLElement;
    }
}

HTMLElement.prototype.meta = function (propertyName: string, content?: string): HTMLElement {
    const node = this.appendChild(new HTMLElement('meta', {}));
    node.setAttribute('property', propertyName);
    node.setAttribute('content', content ?? '');
    return node;
};

HTMLElement.prototype.image = function (url: string, width?: number, height?: number): HTMLElement {
    this.meta('twitter:image:src', url);
    this.meta('og:image', url);
    if (width && height) {
        this.meta('og:image:width', width.toString());
        this.meta('og:image:height', height.toString());
    }
    return this;
};

export function postToHtml(post: RedditPost): string {
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

    switch (post.post_hint) {
        case 'image':
            head.meta('og:type', 'object');
            head.meta('twitter:card', 'summary_large_image');
            head.image(post.url, post.resolution?.width, post.resolution?.height);
            break;
        case 'hosted:video':
            head.meta('og:video', post.video_url);
            head.meta('og:type', 'video.other');
            head.meta('og:video:type', 'video/mp4');
            if (post.video_url) {
                head.meta('og:video:url', post.video_url);
                head.meta('og:video:secure_url', post.video_url);
                head.meta('twitter:player', post.video_url);
            }
            if (post.resolution) {
                head.meta('og:video:width', post.resolution.width.toString());
                head.meta('og:video:height', post.resolution.height.toString());
                head.meta('twitter:player:width', post.resolution.width.toString());
                head.meta('twitter:player:height', post.resolution.height.toString());
            }
            break;
        default:
            head.meta('og:type', 'object');
            if (post.oembed) {
                head.image(post.oembed.thumbnail_url);
                descriptionText += post.oembed.title;
            } else if (post.preview_image_url) {
                head.image(post.preview_image_url);
            } else if (post.media_metadata && post.media_metadata.length) {
                head.meta('twitter:card', 'summary_large_image');
                if (post.media_metadata.length > 1) {
                    head.meta('twitter:image:alt', `Image 1 of ${post.media_metadata.length}`);
                    head.meta('og:image:alt', `Image 1 of ${post.media_metadata.length}`);
                    descriptionStatus.push(`🖼️ Gallery: ${post.media_metadata.length} Images`);
                }

                for (const image of post.media_metadata) {
                    head.image(image.url, image.width, image.height);
                }
            }
            break;
    }

    // Set the description based on the post content and status
    const description = (descriptionStatus.join(' ') + '\n\n' + descriptionText).trim();
    if (description.length) {
        head.meta('og:description', description);
        head.meta('twitter:description', description);
    }

    return '<!DOCTYPE html>' + html.toString();
}