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

export function getOriginalUrl(url: string, short: boolean) {
    const location = new URL(url);

    const targetDomain = short ? 'redd.it' : 'reddit.com';

    if (location.hostname.endsWith(CUSTOM_DOMAIN)) {
        const originalDomain = short ? location.hostname : CUSTOM_DOMAIN;
        location.hostname = location.hostname.replace(originalDomain, targetDomain);
    } else {
        location.hostname = targetDomain;
    }

    location.protocol = 'https:';
    location.port = '';

    return location.toString();
}

export function isBot({ headers }: IRequest): boolean {
    const userAgent = headers.get('User-Agent')?.toLowerCase() ?? '';
    return userAgent.includes('bot') || userAgent.includes('SteamChatURLLookup'.toLowerCase());
}


export function redirectPage(url: string) {
    const html = new HTMLElement('html', {});
    html.appendChild(new HTMLElement('head', {}).appendChild(httpEquiv(url)));
    return html;
}

export function fallbackRedirect(req: IRequest) {
    const url = getOriginalUrl(req.url, false);
    const html = redirectPage(url);

    return HtmlResponse(html.toString(), {
        headers: { Location: url }, status: 302
    });
}

export async function get_packaged_video(path: string, timeout = 1000) {
    try {
        const url = new URL(`https://www.reddit.com${path}`);
        const html = await fetch(url, {
            signal: AbortSignal.timeout(timeout),
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