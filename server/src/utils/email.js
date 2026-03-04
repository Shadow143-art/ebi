import nodemailer from "nodemailer";

const buildTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
};

const transporter = buildTransporter();

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "Tracker <no-reply@tracker.local>",
    to,
    subject: "Tracker password reset",
    text: `Hi ${name || "User"}, reset your password using this link: ${resetUrl}`,
    html: `<p>Hi ${name || "User"},</p><p>Reset your password using this secure link:</p><p><a href=\"${resetUrl}\">Reset Password</a></p><p>If you did not request this, you can ignore this email.</p>`
  });

  if (!process.env.SMTP_HOST) {
    console.log("Email transport in JSON mode. Message payload:", info.message);
  }
};
