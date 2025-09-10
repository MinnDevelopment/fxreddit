import { get_packaged_video, redirectPage } from '../util';
import { IRequest } from 'itty-router';

const notFound = new Response(undefined, {
    status: 404
});

export async function getVideo(request: IRequest) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v/')) {
        return notFound;
    }

    const path = url.pathname.substring('/v'.length);
    const video = await get_packaged_video(path, 5000);
    if (video) {
        const videoUrl = video.url;
        const headers = { 'Location': videoUrl, 'content-type': 'text/html' };
        return new Response(redirectPage(videoUrl).toString(), { headers, status: 302 });
    } else {
        return notFound;
    }
}