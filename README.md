[image-post-embed]: https://raw.githubusercontent.com/MinnDevelopment/fxreddit/master/assets/image-post-embed.png
[gallery-post-embed]: https://raw.githubusercontent.com/MinnDevelopment/fxreddit/master/assets/gallery-post-embed.png
[video-post-embed]: https://raw.githubusercontent.com/MinnDevelopment/fxreddit/master/assets/video-post-embed.mp4
[youtube-post-embed]: https://raw.githubusercontent.com/MinnDevelopment/fxreddit/master/assets/youtube-post-embed.mp4
[article-post-embed]: https://raw.githubusercontent.com/MinnDevelopment/fxreddit/master/assets/article-post-embed.png

# FixReddit

Provides improved reddit embeds for services such as Discord.

## About

This app is a cloudflare worker service which proxies links for reddit posts and transforms them into [Open Graph](https://ogp.me/) and [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup) meta data for unfurlers.

The main instance is currently hosted on `rxddit.com` and also works with `old.rxddit.com` and `www.rxddit.com`.

### Disclaimer

This service is provided as a best-effort and has no guarantees for availability. I take no responsibility for the uptime or whether it stops working entirely.

I do not plan on maintaining this actively or accepting further changes through pull requests. If I accept something, that does not imply I'm open for any other additions!

## Example Embeds

This has specialized handling for various types of reddit posts.

### Image Posts

An image post is a reddit post with just an uploaded image. This provides the title and image as a large image card.

![image post embed][image-post-embed]

### Gallery Posts

A gallery post is a reddit post with multiple attached images. Since Discord can only show a single image for link embeds, the description includes a tag line that indicates the existence of multiple images.

![gallery post embed][gallery-post-embed]

### Video Posts

A video post works exactly like an image post, except for providing a video instead. Note that the videos are muted due to the simply being a preview provided by reddit.

![video post embed][video-post-embed]

### YouTube Posts

A YouTube post is a video post that links to a youtube video. The service will instead provide a link to the embed iframe, which can be handled by Discord as a youtube iframe instead.

![youtube post embed][youtube-post-embed]

### Article Posts

Article posts are simply external links, and sometimes provide a thumbnail.

![article post embed][article-post-embed]