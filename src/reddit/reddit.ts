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
        for (const { media_id, caption } of metadata.gallery_data.items) {
            const value = metadata.media_metadata[media_id];
            media_metadata.push({
                width: value.s.x,
                height: value.s.y,
                url: value.s.u,
                caption: caption,
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
        domain: metadata.domain,
        media_metadata,
    };
}

declare module 'node-html-parser' {
    interface HTMLElement {
        meta(propertyName: string, content?: string): HTMLElement;

        image(url: string, width?: number, height?: number): HTMLElement;

        video(url: string, width?: number, height?: number, type?: string): HTMLElement;
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

HTMLElement.prototype.video = function (url: string, width?: number, height?: number, type: string = 'video/mp4'): HTMLElement {
    this.meta('twitter:player', url);
    this.meta('og:video', url);
    this.meta('og:video:secure_url', url);
    this.meta('og:video:type', type);
    if (width && height) {
        this.meta('og:video:width', width.toString());
        this.meta('og:video:height', height.toString());
        this.meta('twitter:player:width', width.toString());
        this.meta('twitter:player:height', height.toString());
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

    let type = 'object';

    switch (post.post_hint) {
        case 'image':
            type = 'photo';
            head.meta('twitter:card', 'summary_large_image');
            head.image(post.url, post.resolution?.width, post.resolution?.height);
            break;
        // case 'rich:video':
        case 'hosted:video':
            type = 'video.other';
            head.video(post.video_url ?? post.url, post.resolution?.width, post.resolution?.height);
            break;
        default:
            if (post.domain === 'youtu.be' || post.domain === 'www.youtube.com' || post.domain === 'youtube.com') {
                type = 'video.other';
                youtubeEmbed(post, post.url, head);
            } else if (post.oembed) {
                head.image(post.oembed.thumbnail_url);
                descriptionText += post.oembed.title;
            } else if (post.preview_image_url) {
                head.image(post.preview_image_url);
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
            } else {
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

    head.meta('og:type', type);

    // Set the description based on the post content and status
    const description = (descriptionStatus.join(' ') + '\n\n' + descriptionText).trim();
    if (description.length) {
        head.meta('og:description', description);
        head.meta('twitter:description', description);
    }

    return '<!DOCTYPE html>' + html.toString();
}

/** Converts the youtube link to a video embed url */
function youtubeEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const url: URL = new URL(link);

    const YOUTUBE_EXTRACTOR: Record<string, (url: URL) => string | null> = {
        'youtu.be': (url: URL) => url.pathname.substring(1), // https://youtu.be/abc123
        'www.youtube.com': (url: URL) => url.searchParams.get('v'), // https://www.youtube.com/watch?v=abc123
        'youtube.com': (url: URL) => url.searchParams.get('v'), // https://youtube.com/watch?v=abc123
    };

    const id = YOUTUBE_EXTRACTOR[url.hostname]?.(url) ?? null;

    if (id) {
        url.hostname = 'www.youtube.com';
        url.pathname = '/embed/' + id;

        head.video(url.toString(), post.oembed?.width, post.oembed?.height, 'text/html');
        head.image(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`, post.oembed?.width, post.oembed?.height);
    }
}
