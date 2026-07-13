import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { registerHandler } from './register';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'magneto_super_secret_key';

// Login Endpoint (mounted at /api/auth/login)
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // Basic payload validation
        if (!username || !password) {
            res.status(400).json({ success: false, message: "Nom d'utilisateur et mot de passe requis" });
            return;
        }

        // Search for user in database by normalized email
        const user = await prisma.user.findUnique({
            where: { email: username.toLowerCase().trim() }
        });

        // Fail if user is not found
        if (!user) {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
            return;
        }

        // Verify plain-text password match (simplified authentication for project 42)
        if (user.password !== password) {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
            return;
        }

        // Update last login timestamp in the database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        // Sign a new JWT token containing user details, valid for 1 day
        const token = jwt.sign(
            { userId: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Send successful response with signed token and user profile details
        res.json({
            success: true,
            message: "Connexion réussie",
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                photo: updatedUser.photo,
                bio: updatedUser.bio,
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

router.get("/42", (req: Request, res: Response) => {
        const clientId = process.env.FORTYTWO_CLIENT_ID || '' ;
        const uriRedirect = process.env.FORTYTWO_REDIRECT_URI || '' ;

        console.log("GET /api/auth/42 - Redirecting user to 42 Intra. Client ID:", clientId, "Redirect URI:", uriRedirect);

        const url = new URL("https://api.intra.42.fr/oauth/authorize");
        url.searchParams.append("client_id", clientId);
        url.searchParams.append("redirect_uri", uriRedirect);
        url.searchParams.append("response_type", "code");
        url.searchParams.append("scope", "public");

        res.redirect(url.toString())
});

// Endpoint to handle the OAuth code exchange, register/login the user and issue a JWT
router.post("/42", async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        console.log("POST /api/auth/42 - Received code from frontend:", code);

        if (!code) {
            console.error("POST /api/auth/42 - Missing authorization code");
            res.status(400).json({ success: false, message: "Code d'autorisation manquant" });
            return;
        }

        // 1. Exchange authorization code for access token
        console.log("POST /api/auth/42 - Exchanging code for access token...");
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
            console.error("POST /api/auth/42 - 42 token exchange error:", tokenData);
            res.status(400).json({ success: false, message: "Échec de la récupération du token 42" });
            return;
        }

        const accessToken = tokenData.access_token;
        console.log("POST /api/auth/42 - Access token successfully retrieved");

        // 2. Fetch user information from 42 API
        console.log("POST /api/auth/42 - Fetching user profile from 42 /v2/me...");
        const userResponse = await fetch("https://api.intra.42.fr/v2/me", {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        const userData = await userResponse.json() as any;

        if (!userResponse.ok) {
            console.error("POST /api/auth/42 - 42 user fetch error:", userData);
            res.status(400).json({ success: false, message: "Échec de la récupération des infos utilisateur 42" });
            return;
        }

        const email = userData.email?.toLowerCase().trim();
        const displayName = userData.displayname || userData.login;
        const photoUrl = userData.image?.link || userData.image?.versions?.medium || null;
        console.log("POST /api/auth/42 - 42 profile fetched. Email:", email, "Name:", displayName);

        if (!email) {
            console.error("POST /api/auth/42 - Email field is missing in 42 profile response");
            res.status(400).json({ success: false, message: "Adresse email manquante sur le compte 42" });
            return;
        }

        // 3. Find or create the user in the database
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log("POST /api/auth/42 - User not found in DB. Creating new user...");
            
            // Check if username from 42 login is already taken
            let uniqueUsername = userData.login || `user_${Math.random().toString(36).slice(-6)}`;
            let usernameExists = await prisma.user.findUnique({
                where: { username: uniqueUsername }
            });

            let counter = 1;
            while (usernameExists) {
                uniqueUsername = `${userData.login || 'user'}${counter}`;
                usernameExists = await prisma.user.findUnique({
                    where: { username: uniqueUsername }
                });
                counter++;
            }

            console.log("POST /api/auth/42 - Selected unique username:", uniqueUsername);

            // Create user with a random password because password is required in DB schema
            const randomPassword = Math.random().toString(36).slice(-12) + "A1!";
            user = await prisma.user.create({
                data: {
                    email,
                    username: uniqueUsername,
                    name: displayName,
                    photo: photoUrl,
                    password: randomPassword,
                    bio: "Étudiant de 42"
                }
            });
            console.log("POST /api/auth/42 - New user created in DB. ID:", user.id);
        } else {
            console.log("POST /api/auth/42 - User found in DB. ID:", user.id);
        }

        // Update last login
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        // 4. Generate JWT
        const token = jwt.sign(
            { userId: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        console.log("POST /api/auth/42 - Signed JWT generated for user");

        res.json({
            success: true,
            message: "Connexion 42 réussie",
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                photo: updatedUser.photo,
                bio: updatedUser.bio,
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (error) {
        console.error("POST /api/auth/42 - 42 login route error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la connexion 42" });
    }
});

// Register Endpoint (mounted at /api/auth/register)
router.post("/register", registerHandler);

export default router;
