

export default class ResponseError extends Error {
    constructor(public status: number, public error: string) {
        super(`${status}: ${error}`);
    }
}