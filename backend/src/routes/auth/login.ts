import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../prisma';
import { HttpError } from '../../errors';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from environment variables");
}

interface OauthProfile {
    email: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    bio: string;
    fallbackLogin?: string;
}

async function findOrCreateOauthUser({ email, firstName, lastName, photoUrl, bio, fallbackLogin }: OauthProfile) {
    // 1. Look up the existing user
    let user = await prisma.user.findUnique({
        where: { email }
    });

    // 2. If the user doesn't exist yet, create them with a unique username
    if (!user) {
        let baseUsername = (fallbackLogin || firstName || "user")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""); // Strip spaces and special characters

        if (!baseUsername) baseUsername = "user";

        let uniqueUsername = baseUsername;
        let usernameExists = await prisma.user.findUnique({
            where: { username: uniqueUsername }
        });

        let counter = 1;
        while (usernameExists) {
            uniqueUsername = `${baseUsername}${counter}`;
            usernameExists = await prisma.user.findUnique({
                where: { username: uniqueUsername }
            });
            counter++;
        }

        const randomPassword = crypto.randomBytes(18).toString('base64');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = await prisma.user.create({
            data: {
                email,
                username: uniqueUsername,
                firstName,
                lastName,
                photo: photoUrl,
                password: hashedPassword,
                bio
            }
        });
    }

    // 3. Update last login timestamp
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    });

    // 4. Generate JWT token
    const token = jwt.sign(
        { userId: updatedUser.id, email: updatedUser.email, username: updatedUser.username },
        JWT_SECRET,
        { expiresIn: '1d' }
    );

    return { token, user: updatedUser };
}

// Login Endpoint (mounted at /api/auth/login)
router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Basic payload validation
    if (!username || !password) {
        throw new HttpError(400, "Username and password are required");
    }

    // Search for user in database by normalized username
    const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase().trim() }
    });

    // Fail if user is not found
    if (!user) {
        throw new HttpError(401, "Invalid credentials");
    }

    // Verify password match using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new HttpError(401, "Invalid credentials");
    }

    // Update last login timestamp in the database
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    });

    // Sign a new JWT token containing user details, valid for 1 day
    const token = jwt.sign(
        { userId: updatedUser.id, email: updatedUser.email, username: updatedUser.username },
        JWT_SECRET,
        { expiresIn: '1d' }
    );

    // Send successful response with signed token and user profile details
    res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            photo: updatedUser.photo,
            bio: updatedUser.bio,
            lastLogin: updatedUser.lastLogin
        }
    });
});

router.get("/42", (req: Request, res: Response) => {
    const clientId = process.env.FORTYTWO_CLIENT_ID || '' ;
    const uriRedirect = process.env.FORTYTWO_REDIRECT_URI || '' ;

    const url = new URL("https://api.intra.42.fr/oauth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", uriRedirect);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "public");

    res.redirect(url.toString());
});

router.post("/42", async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
        throw new HttpError(400, "Missing authorization code");
    }

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://api.intra.42.fr/oauth/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.FORTYTWO_CLIENT_ID || "",
            client_secret: process.env.FORTYTWO_CLIENT_SECRET || "",
            code: code,
            redirect_uri: process.env.FORTYTWO_REDIRECT_URI || ""
        })
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenResponse.ok) {
        throw new HttpError(400, "Failed to retrieve 42 token");
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user information from 42 API
    const userResponse = await fetch("https://api.intra.42.fr/v2/me", {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });

    const userData = await userResponse.json() as any;

    if (!userResponse.ok) {
        throw new HttpError(400, "Failed to retrieve 42 user info");
    }

    const email = userData.email?.toLowerCase().trim();
    const firstName = userData.first_name || userData.displayname || userData.login;
    const lastName = userData.last_name || '';
    const photoUrl = userData.image?.link || userData.image?.versions?.medium || null;

    if (!email) {
        throw new HttpError(400, "Missing email address on 42 account");
    }

    // 3. Find or create the user in the database
    const { token, user } = await findOrCreateOauthUser({
        email,
        firstName,
        lastName,
        photoUrl,
        bio: "42 student",
        fallbackLogin: userData.login
    });

    res.json({
        success: true,
        message: "42 login successful",
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            photo: user.photo,
            bio: user.bio,
            lastLogin: user.lastLogin
        }
    });
});

router.get("/google", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || '' ;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "openid email profile");

    res.redirect(url.toString());
});

router.post("/google", async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
        throw new HttpError(400, "Missing authorization code");
    }

    // STEP A: Exchange the authorization code for a Google access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            code: code,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI || ""
        })
    });

    const tokenData = await tokenResponse.json() as any;
    if (!tokenResponse.ok) {
        throw new HttpError(400, "Failed to retrieve Google token");
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });

    const userData = await userResponse.json() as any;
    if (!userResponse.ok) {
        throw new HttpError(400, "Failed to retrieve Google profile");
    }

    const email = userData.email?.toLowerCase().trim();
    const firstName = userData.given_name || userData.name || "Google";
    const lastName = userData.family_name || '';
    const photoUrl = userData.picture || null;

    if (!email) {
        throw new HttpError(400, "Missing email from Google");
    }

    // STEP B: Find or create the user
    const { token, user } = await findOrCreateOauthUser({
        email,
        firstName,
        lastName,
        photoUrl,
        bio: "Google user",
        fallbackLogin: userData.given_name
    });

    res.json({
        success: true,
        message: "Google login successful",
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            photo: user.photo,
            bio: user.bio,
            lastLogin: user.lastLogin
        }
    });
});

export default router;
