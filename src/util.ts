import { IRequest, html as HtmlResponse } from 'itty-router';
import { CUSTOM_DOMAIN, USER_AGENT } from './constants';
import { HTMLElement, parse as parseHTML } from 'node-html-parser';
import { httpEquiv } from './html';

type PackagedVideo = {
    url: string,
    dimensions: {
        width: number,
        height: number
    }
};

export function cleanSpoiler(string: string): string {
    return string.endsWith('||') ? string.substring(0, string.length - 2) : string;
}

export function getOriginalUrl(url: string) {
    const location = new URL(url);

    if (location.hostname.endsWith(CUSTOM_DOMAIN)) {
        location.hostname = location.hostname.replace(CUSTOM_DOMAIN, 'reddit.com');
    } else {
        location.hostname = 'reddit.com';
    }

    location.protocol = 'https:';
    location.port = '';

    return location.toString();
}

export function isBot({ headers }: IRequest): boolean {
    return headers.get('User-Agent')?.toLowerCase()?.includes('bot') ?? false;
}


export function redirectPage(url: string) {
    const html = new HTMLElement('html', {});
    html.appendChild(new HTMLElement('head', {}).appendChild(httpEquiv(url)));
    return html;
}

export function fallbackRedirect(req: IRequest) {
    const url = getOriginalUrl(req.url);
    const html = redirectPage(url);

    return HtmlResponse(html.toString(), {
        headers: { Location: url }, status: 302
    });
}

export async function get_packaged_video(path: string) {
    try {
        console.log(path);
        const url = new URL(`https://www.reddit.com${path}`);
        const html = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
            },
        }).then(r => r.text()).then(parseHTML);

        const jsonString = html.querySelector('[packaged-media-json]')?.getAttribute('packaged-media-json');

        if (!jsonString) {
            return;
        }

        const json = JSON.parse(jsonString);
        const videos = json.playbackMp4s?.permutations;

        if (videos) {
            return videos[videos.length - 1].source as PackagedVideo;
        }
    } catch (ignored) {
        return;
    }
}