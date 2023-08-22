export interface RedditListingResponse {
    kind: string; // 'Listing'
    data: {
        children: {
            kind: string; // 't3'
            data: {
                id: string;
                subreddit: string;
                permalink: string;
                title: string;
                post_hint: string; // 'image' | 'hosted:video'
                url: string;
                selftext: string; // description of the post
                preview?: {
                    images?: {
                        source?: { url: string, width: number, height: number };
                        resolutions: { url: string, width: number, height: number }[];
                    }[]
                };
                secure_media?: {
                    reddit_video?: {
                        fallback_url: string;
                    };
                };
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
    permalink: string;
    description: string;
    resolution?: {
        width: number;
        height: number;
    };
    video_url?: string;
}