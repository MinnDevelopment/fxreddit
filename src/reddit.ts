export interface RedditListingResponse {
    kind: string; // 'Listing'
    data: {
        children: {
            kind: string; // 't3'
            data: {
                subreddit: string;
                title: string;
                post_hint: string; // 'image'
                url: string;
                preview?: {
                    images?: {
                        resolutions: { url: string, width: number, height: number }[];
                    }[]
                }
            }
        }[];
    };
}
export interface RedditPost {
    kind: string; // 'Listing'
    subreddit: string;
    title: string;
    post_hint: string; // 'image'
    url: string;
    resolution?: {
        width: number;
        height: number;
    };
}

export function parseRedditPost(record: RedditListingResponse): RedditPost {
    const metadata = record.data.children[0].data;
    const resolutions = metadata.post_hint === 'image' ? metadata.preview?.images?.[0].resolutions : undefined;
    const resolution = resolutions?.[resolutions?.length - 1];
    return {
        kind: record.kind,
        subreddit: metadata.subreddit,
        title: metadata.title,
        post_hint: metadata.post_hint,
        url: metadata.url,
        resolution: resolution ? { width: resolution.width, height: resolution.height } : undefined
    };
}
