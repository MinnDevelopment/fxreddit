import { get_packaged_video, redirectPage } from '../util';
import { IRequest } from 'itty-router';

export async function getVideo(request: IRequest) {
    const path = request.url.split('/v')[1];
    const video = await get_packaged_video(path);
    if (video) {
        const videoUrl = video.url;
        const headers = { 'Location': videoUrl, 'content-type': 'text/html' };
        return new Response(redirectPage(videoUrl).toString(), { headers, status: 302 });
    } else {
        return new Response(undefined, {
            status: 404
        });
    }
}