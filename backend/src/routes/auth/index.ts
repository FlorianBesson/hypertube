import { Router } from 'express';

// Handlers
import { registerHandler } from './register';

const authRouter = Router()

authRouter.post("/register", registerHandler)

export default authRouter