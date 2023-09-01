import { HTMLElement } from 'node-html-parser';

declare module 'node-html-parser' {
    interface HTMLElement {
        meta(propertyName: string, content?: string): HTMLElement;

        image(url: string, width?: number, height?: number): HTMLElement;

        video(url: string, width?: number, height?: number, type?: string): HTMLElement;
    }
}

HTMLElement.prototype.meta = function (propertyName: string, content?: string): HTMLElement {
    const node = this.appendChild(new HTMLElement('meta', {}));
    node.setAttribute('property', propertyName);
    node.setAttribute('content', content ?? '');
    return node;
};

HTMLElement.prototype.image = function (url: string, width?: number, height?: number): HTMLElement {
    this.meta('twitter:image:src', url);
    this.meta('og:image', url);
    if (width && height) {
        this.meta('og:image:width', width.toString());
        this.meta('og:image:height', height.toString());
    }
    return this;
};

HTMLElement.prototype.video = function (url: string, width?: number, height?: number, type: string = 'video/mp4'): HTMLElement {
    this.meta('twitter:player', url);
    this.meta('og:video', url);
    this.meta('og:video:secure_url', url);
    this.meta('og:video:type', type);
    if (width && height) {
        this.meta('og:video:width', width.toString());
        this.meta('og:video:height', height.toString());
        this.meta('twitter:player:width', width.toString());
        this.meta('twitter:player:height', height.toString());
    }
    return this;
};

export function httpEquiv(url: string) {
    return new HTMLElement('meta', {})
        .setAttribute('http-equiv', 'Refresh')
        .setAttribute('content', `0; URL=${url}`);
}