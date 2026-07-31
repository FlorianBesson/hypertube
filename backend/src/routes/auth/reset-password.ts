import { Request, Response, RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../prisma';
import * as z from 'zod'
import { HttpError } from '../../errors';

const ResetPasswordSchema = z.object({
    token: z.string("Token is required").min(1, "Token is required"),
    password: z
        .string("New password is required")
        .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères")
        .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
        .regex(/[\p{P}\p{S}]/u, "Le mot de passe doit contenir au moins un caractère spécial")
})

export const resetPasswordHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const result = ResetPasswordSchema.safeParse(req.body)
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0].message);
  }

  const { token, password } = result.data

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: {
        gte: new Date(),
      },
    },
  });

  if (!user) {
    throw new HttpError(400, 'Invalid or expired password reset token');
  }

  // Hash the new password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Update user and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  res.status(200).json({ success: true, message: 'Password has been reset successfully' });
};
