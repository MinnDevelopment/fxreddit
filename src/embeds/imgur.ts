
import { HTMLElement, parse as parseHTML } from 'node-html-parser';
import { RedditPost } from '../reddit/types';
import { isDefined } from 'remeda';
import { CACHE_CONFIG } from '../cache';

export async function externalImgurEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const html = await fetch(link, { ...CACHE_CONFIG }).then(r => r.text()).then(parseHTML);

    const videoUrl = html.querySelector('meta[property="og:video"]')?.getAttribute('content');
    const twitterPlayerStream = html.querySelector('meta[name="twitter:player:stream"]')?.getAttribute('content');

    const videoSource = videoUrl || twitterPlayerStream;

    const thumbnail = html.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

    if (videoSource) {
        if (thumbnail) {
            head.image(thumbnail, post.resolution?.width, post.resolution?.height);
        }

        head.video(videoSource, post.resolution?.width, post.resolution?.height, 'video/mp4');
    } else if (isDefined(post.preview_image_url)) {
        head.image(post.preview_image_url, post.resolution?.width, post.resolution?.height, 'large');
    } else if (thumbnail) {
        head.image(thumbnail, post.resolution?.width, post.resolution?.height, 'large');
    }
}