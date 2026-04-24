import { Request, Response } from 'express';
import * as z from "zod"


const RegisterSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8)
})

export async function registerHandler(req: Request, res: Response) {
    try
    {
        const result = RegisterSchema.safeParse({ username: req.body.username, password: req.body.password })
        if (!result.success)
            throw new Error("Zod validation failed")
            
            
        res.status(201).json({ success: true, message: "Succesfully registered !" });
    }
    catch (error)
    {
        console.log("Error calling /api/registered");
        console.log(error.message)
        res.status(400).json({success: false , message: error.message})
    }
}
