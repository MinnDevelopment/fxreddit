import { HTMLElement } from 'node-html-parser';
import { RedditPost } from '../reddit/types';
import { isDefined } from 'remeda';

export async function externalImageEmbed(post: RedditPost, _link: string, head: HTMLElement) {
    if (isDefined(post.preview_image_url)) {
        head.image(post.preview_image_url, post.resolution?.width, post.resolution?.height, 'large');
    }
}