import { Request, Response } from 'express';
import * as z from "zod"
import { prisma } from '../../server';


const RegisterSchema = z.object({
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
    try
    {
        const result = RegisterSchema.safeParse({ username: req.body.username, password: req.body.password })
        const zodErrors = result.error?.issues.map((i) => i.message)
        
        if (!result.success)
            return res.status(400).json({success: false, message: zodErrors})
            
            
        await prisma.user.create({
            data: {
                username: "Hello",
                email: "test@gmail.com",
                password: "world"
            }
        })
        
        res.status(201).json({ success: true, message: "Succesfully registered !" });
    }
    catch (error)
    {
        console.log("Error calling /api/registered");
        console.log(error.message)
        res.status(400).json({success: false , message: error.message})
    }
}
