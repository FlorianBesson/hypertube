import { Router } from 'express';
import { registerHandler } from './register';
import loginRouter from './login';

const router = Router();

// Register Endpoint (mounted at /api/auth/register)
router.post("/register", registerHandler);

// Login and OAuth Endpoints (mounted under /api/auth/login, /api/auth/42, /api/auth/google, etc.)
router.use("/", loginRouter);

export default router;
