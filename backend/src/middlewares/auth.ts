import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Secret key used to sign and verify JSON Web Tokens.
const JWT_SECRET = process.env.JWT_SECRET || 'magneto_super_secret_key';

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
        res.status(401).json({ success: false, message: "Token d'authentification manquant" });
        return;
    }

    // Verify the validity of the token using the secret key
    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
        // If verification fails (e.g. token expired, tampered with, or signed with old secret), return 403 Forbidden
        if (err) {
            res.status(403).json({ success: false, message: "Token invalide ou expiré" });
            return;
        }
        
        // Attach the decoded token payload (containing user info) to the request object for downstream routes
        (req as any).user = decoded;
        next();
    });
};
