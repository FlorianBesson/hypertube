import { Request, Response } from 'express';
import * as z from "zod"


const RegisterSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8)
})

export async function registerHandler(req: Request, res: Response) {
    try
    {
        console.log("Calling /api/register");
        const result = RegisterSchema.safeParse({ username: req.body.username, password: req.body.password })
        if (!result.success)
            throw new Error("ERREUR ZOD")
            
            
        res.json({ success: true, message: "Succesfully registed !" });
    }
    catch (error)
    {
        console.log("Error calling /api/registered");
    }
}
