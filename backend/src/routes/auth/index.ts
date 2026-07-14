import { Router } from 'express';
import { registerHandler } from './register';
import loginRouter from './login';
import { forgotPasswordHandler } from './forgot-password';
import { resetPasswordHandler } from './reset-password';

const router = Router();

// Register Endpoint (mounted at /api/auth/register)
router.post("/register", registerHandler);

// Forgot & Reset Password Endpoints
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// Login and OAuth Endpoints (mounted under /api/auth/login, /api/auth/42, /api/auth/google, etc.)
router.use("/", loginRouter);

export default router;
