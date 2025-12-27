import { IRequest } from 'itty-router';
import { isString } from 'remeda';
import { CUSTOM_DOMAIN } from '../constants';
import { Base64 } from 'js-base64';

interface OEmbed {
    type: string;
    author_name: string;
    author_url: string;
    provider_name: string;
    version: '1.0';
}

function objectToBase64UrlSafe(obj: object) {
    return Base64.encode(JSON.stringify(obj), true);
}

function base64ToObjectUrlSafe(base64: string) {
    return JSON.parse(Base64.decode(base64));
}

function getString(value: unknown): string | undefined {
    return isString(value) ? value : undefined;
}

export function encodeOEmbed(embed: OEmbed) {
    const base64 = objectToBase64UrlSafe(embed);
    return `https://${CUSTOM_DOMAIN}/oembed?embed=${base64}`;
}

export function handleOEmbed(req: IRequest) {
    const base64 = req.query.embed;

    if (!isString(base64) || !Base64.isValid(base64)) {
        return new Response(undefined, {
            status: 404,
            statusText: 'Not Found'
        });
    }

    const json = base64ToObjectUrlSafe(base64);

    const responseBody = {
        type: getString(json.type),
        author_name: getString(json.author_name),
        author_url: getString(json.author_url)?.startsWith('https://www.reddit.com/') ? getString(json.author_url) : undefined,
        provider_name: getString(json.provider_name),
        version: getString(json.version),
    };

    return new Response(JSON.stringify(responseBody), {
        headers: {
            'content-type': 'application/json'
        }
    });
}