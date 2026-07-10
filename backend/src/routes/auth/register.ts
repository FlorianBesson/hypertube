import { Request, Response } from 'express';
import * as z from "zod"
import { prisma } from '../../prisma';
import bcrypt from 'bcrypt'
import { HttpError } from '../../errors';


const RegisterSchema = z.object({
    email: z.
        email("Field is required"),
    
    username: z
        .string("Field is required")
        .min(3, {
            error: (iss) => {
                iss.minimum;
                iss.inclusive;
                return `Username must have ${iss.minimum} characters or more`
            }
        }),
    password: z
        .string("Field is required")
        .min(8, {
            error: (iss) => {
                iss.minimum;
                iss.inclusive;
                return `Password must have ${iss.minimum} characters or more`
            }
        })
})

export async function registerHandler(req: Request, res: Response) {
    const result = RegisterSchema.safeParse({ email: req.body.email, username: req.body.username, password: req.body.password })
    const zodErrors = result.error?.issues.map((i) => i.message) || []
    
    if (!result.success)
        throw new HttpError(400, zodErrors)
    
    const { email, username, password } = result.data
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.findUnique({
        where: {
            email: email
        }
    })
    
    if (user)
        throw new HttpError(400, "Email already in use");
    
    await prisma.user.create({
        data: {
            username: username,
            email: email,
            name: username,
            password: hashedPassword
        }
    })
            
    res.status(201).json({ success: true, message: "Succesfully registered" });
}
