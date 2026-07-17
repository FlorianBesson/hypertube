import { Request, Response } from 'express';
import * as z from "zod"
import { prisma } from '../../prisma';
import bcrypt from 'bcrypt'
import { HttpError } from '../../errors';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'magneto_super_secret_key';

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
    firstName: z.string("Field is required").trim().min(1, "First name is required"),
    lastName: z.string("Field is required").trim().min(1, "Last name is required"),
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
    const result = RegisterSchema.safeParse({
        email: req.body.email,
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: req.body.password
    })
    const zodErrors = result.error?.issues.map((i) => i.message) || []
    
    if (!result.success)
        throw new HttpError(400, zodErrors)
    
    const { email, username, firstName, lastName, password } = result.data
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.findUnique({
        where: {
            email: email
        }
    })
    
    if (user)
        throw new HttpError(400, "Email already in use");
    
    const newUser = await prisma.user.create({
        data: {
            username: username,
            email: email,
            firstName,
            lastName,
            password: hashedPassword
        }
    })
            
    const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.status(201).json({
        success: true,
        message: "Succesfully registered",
        token,
        user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            photo: newUser.photo,
            bio: newUser.bio,
            lastLogin: newUser.lastLogin
        }
    });
}
