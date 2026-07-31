import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../errors';
import { JWT_SECRET } from '../config/jwt';

/**
 * Express middleware to authenticate requests using JSON Web Tokens (JWT).
 * Expects the token to be sent in the 'Authorization' header in format: Bearer <token>
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    // Extract the token part from the 'Bearer <token>' string
    const token = authHeader && authHeader.split(' ')[1];

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
