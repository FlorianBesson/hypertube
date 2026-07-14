import { Request, Response, RequestHandler } from 'express';
import crypto from 'crypto';
import { prisma } from '../../prisma';
import { transporter } from '../../config/mailer';

export const forgotPasswordHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      res.status(200).json({ success: true, message: 'If an account with that email exists, we sent a password reset link.' });
      return;
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });

    // Create the reset link. Note: FRONTEND_URL should be defined in .env
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@hypertube.com',
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click this link to reset your password: ${resetLink} \n\nIf you did not request this, please ignore this email.`,
      html: `<p>You requested a password reset.</p><p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'If an account with that email exists, we sent a password reset link.' });
  } catch (error) {
    console.error('Error in forgotPasswordHandler:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
  }
};
