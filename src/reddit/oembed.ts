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
    const encoder = new TextEncoder();
    const bytes = encoder.encode(JSON.stringify(obj));
    return Base64.fromUint8Array(bytes, true);
}

function base64ToObjectUrlSafe(base64: string) {
    const decoder = new TextDecoder();
    const bytes = Base64.toUint8Array(base64);
    const decoded = decoder.decode(bytes);
    return JSON.parse(decoded);
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
        type: json.type,
        author_name: json.author_name,
        author_url: json.author_url?.startsWith('https://www.reddit.com/') ? json.author_url : undefined,
        provider_name: json.provider_name,
        version: json.version,
    };

    return new Response(JSON.stringify(responseBody), {
        headers: {
            'content-type': 'application/json'
        }
    });
}