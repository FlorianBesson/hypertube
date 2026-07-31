import jwt from "jsonwebtoken";
import { HttpError } from "../../errors";
import { Request, Response } from 'express';


export async function oauthTokenHandler(req: Request, res: Response) {
    const apiClientSecret = process.env.API_CLIENT_SECRET;
    const apiClientId = process.env.API_CLIENT_ID;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!apiClientSecret || !apiClientId || !JWT_SECRET) {
        throw new Error("API credentials or JWT_SECRET are missing from environment variables");
    }

    const clientId = req.body.client;
    const clientSecret = req.body.secret;

    if (!clientId || !clientSecret)
        throw new HttpError(400, "Id or Secret missing");

    if (clientId !== apiClientId || clientSecret !== apiClientSecret)
        throw new HttpError(401, "Invalid secret or client");

    const token = jwt.sign(
        { clientId: clientId },
        JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.json({
        access_token: token,
        token_type: "Bearer",
        expires_in: 86400
    });
}