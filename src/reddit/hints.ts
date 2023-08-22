
export const POST_HINT_TO_TYPE = {
    'image': 'image',
    'hosted:video': 'video',
};

export const OG_TYPE = {
    'article': 'article',
    'video.other': 'video',
    'website': 'link',
};

export function getMetatypeForHint(postHint: string) {
    return POST_HINT_TO_TYPE[postHint as keyof typeof POST_HINT_TO_TYPE] || 'article';
}
