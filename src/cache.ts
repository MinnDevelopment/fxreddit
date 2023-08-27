export const CACHE_CONFIG = {
    cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
            '200-299': 86400, // Cache for 1 day
            '404': 1,
            '500-599': 0
        }
    }
};