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
                is_reddit_media_domain: boolean;
                num_comments?: number; // number of comments
                upvate_ratio?: number; // percentage of upvotes
                media?: {
                    reddit_video?: {
                        fallback_url: string;
                        height: number;
                        width: number;
                    };
                    oembed?: {
                        thumbnail_url: string;
                        width: number;
                        height: number;
                        title: string;
                    };
                };
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
    is_reddit_media: boolean;
    preview_image_url?: string;
    resolution?: {
        width: number;
        height: number;
    };
    video_url?: string;
    oembed?: {
        thumbnail_url: string;
        width: number;
        height: number;
        title: string;
    };
}