import { app } from "../../server";
import * as z from "zod"

import { Request, Response } from 'express';

const RegisterSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8)
})

app.post("/api/register", async (req: Request, res: Response) => {
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
        console.log("Error calling /api/register");
    }
})