import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../errors';
import { JWT_SECRET } from '../config/jwt';

const extractBearerToken = (req: Request): string | undefined => {
    const authHeader = req.headers['authorization'];
    return authHeader?.split(' ')[1];
};

const extractQueryToken = (req: Request): string | undefined => {
    const rawToken = req.query.token;
    return Array.isArray(rawToken) ? (rawToken[0] as string) : (rawToken as string | undefined);
};

/**
 * Whichever token authenticated this request (header or query). Used by the HLS playlist
 * route to reattach the token to segment URIs, since resolving a relative URL against the
 * playlist's own URL drops its query string.
 */
export const extractRequestToken = (req: Request): string | undefined => {
    return extractBearerToken(req) ?? extractQueryToken(req);
};

const verifyRequestToken = (req: Request, next: NextFunction, token: string | undefined) => {
    // If no token is provided, deny access with a 401 Unauthorized status
    if (!token) {
        return next(new HttpError(401, "Missing authentication token"));
    }

    // Verify the validity of the token using the secret key.
    // jwt.verify's callback runs outside Express's call stack, so errors must
    // be forwarded via next() rather than thrown.
    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
        if (err) {
            return next(new HttpError(403, "Invalid or expired token"));
        }

        // Attach the decoded token payload (containing user info) to the request object for downstream routes
        (req as any).user = decoded;
        next();
    });
};

/**
 * Express middleware to authenticate requests using JSON Web Tokens (JWT).
 * Expects the token to be sent in the 'Authorization' header in format: Bearer <token>
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    verifyRequestToken(req, next, extractBearerToken(req));
};

/**
 * Same as authenticateToken, but also accepts the token as a `token` query parameter:
 * <video src> and <track src> load their URLs natively and cannot carry an Authorization header.
 */
export const authenticateMediaToken = (req: Request, res: Response, next: NextFunction) => {
    verifyRequestToken(req, next, extractBearerToken(req) ?? extractQueryToken(req));
};
