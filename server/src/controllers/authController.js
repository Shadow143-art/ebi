import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import { signToken } from "../utils/token.js";
import { sendPasswordResetEmail } from "../utils/email.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const register = async (req, res, next) => {
  try {
    const { username, password, role, name, email } = req.body;

    if (!username || !password || !role || !email) {
      res.status(400);
      throw new Error("Username, email, password and role are required");
    }

    if (!["student", "staff"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({
      $or: [{ username: username.trim() }, { email: normalizedEmail }]
    });
    if (existing) {
      res.status(409);
      throw new Error("Username or email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      password: passwordHash,
      role,
      name: name || username,
      email: normalizedEmail
    });

    if (role === "student") {
      await StudentProfile.create({ user: user._id });
    }

    const token = signToken({ id: user._id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { loginId, username, email, password, role } = req.body;
    const identifier = String(loginId || username || email || "").trim();

    if (!identifier || !password || !role) {
      res.status(400);
      throw new Error("Email/username, password and role are required");
    }

    const normalizedEmail = identifier.toLowerCase();
    const usernameMatcher = new RegExp(`^${escapeRegex(identifier)}$`, "i");

    const user = await User.findOne({
      $or: [{ username: usernameMatcher }, { email: normalizedEmail }]
    });

    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (user.role !== role) {
      res.status(403);
      throw new Error("Incorrect portal for this account");
    }

    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password || "");
    } catch {
      isValid = false;
    }

    // Backward compatibility: migrate old plain-text passwords to bcrypt after first successful login.
    if (!isValid && user.password === password) {
      isValid = true;
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    if (!isValid) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const token = signToken({ id: user._id, role: user.role });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      res.status(400);
      throw new Error("Email is required");
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || (role && user.role !== role)) {
      return res.json({
        message:
          "If this email exists in Tracker, a password reset link has been sent."
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetUrlBase =
      process.env.CLIENT_URL || "http://localhost:5173";

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const resetUrl = `${resetUrlBase}/reset-password?token=${resetToken}&email=${encodeURIComponent(
      user.email
    )}&role=${user.role}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name || user.username,
      resetUrl
    });

    res.json({
      message:
        "If this email exists in Tracker, a password reset link has been sent."
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!token || !normalizedEmail || !newPassword) {
      res.status(400);
      throw new Error("Token, email and new password are required");
    }

    if (String(newPassword).length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      res.status(400);
      throw new Error("Invalid or expired reset link");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successful. Please login." });
  } catch (error) {
    next(error);
  }
};
