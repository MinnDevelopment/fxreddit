import { RedditPost } from '../reddit/types';
import { HTMLElement, parse as parseHTML } from 'node-html-parser';
import '../html';

const LINK_REGEX = new RegExp('^https?://(?:www\\.)?(?:twitter|x)\\.com/(?:#!/)?([^/]+)/status(?:es)?/([^/]+)$', 'i');

interface TwitterEmbed {
    url: string;
    author_name: string;
    author_url: string;
    html: string;
    width: number;
    height: number;
    type: string;
    cache_age: string;
    provider_name: string;
    provider_url: string;
    version: string;
}

function getDescription(embed: TwitterEmbed): string | undefined {
    const html = parseHTML(embed.html);
    const content = html.querySelector('p');

    if (content) {
        const description = content.structuredText.trim();
        const author = embed.author_name;

        return `${description}\n- ${author} on Twitter`;
    }
}


export async function twitterLinkEmbed(post: RedditPost, link: string, head: HTMLElement) {
    const result = LINK_REGEX.exec(link);
    const [, username, id] = result ?? [];

    if (username && id) {
        const embed: TwitterEmbed = await fetch(`https://publish.twitter.com/oembed?url=https://twitter.com/${username}/status/${id}`).then(r => r.json());

        const description = getDescription(embed);
        if (description) {
            head.meta('twitter:card', 'summary');
            head.meta('og:description', description);
            head.meta('twitter:description', description);
        }
        if (embed.author_name) {
            head.meta('twitter:creator', embed.author_name);
        }
    }
}