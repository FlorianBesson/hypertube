export class HttpError extends Error {
    constructor(public status: number, message: string | string[]) {
        super(Array.isArray(message) ? message.join(", ") : message);
    }
}
