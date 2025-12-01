import crypto from "crypto";
import User from "../models/User.js";
import generateTokens from "../utils/generateTokens.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const verificationToken = crypto.randomBytes(20).toString("hex");

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      verificationTokenExpire: Date.now() + 60 * 60 * 1000, // 1 hours
    });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    const message = `
      <h1>Email Verification</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Account Verification",
        message,
      });

      res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email to verify account.",
      });
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res
      .status(200)
      .json({ message: "Email verified successfully. You can now login." });
  } catch (error) {
    console.log({ error });
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email first" });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    console.log({ refreshToken });
    user.refreshToken = [...user.refreshToken, refreshToken];
    await user.save();

    // Send Refresh Token in HTTP-Only Cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const cookies = req.cookies;
    console.log({ cookies });
    if (!cookies?.jwt) return res.sendStatus(401);

    const oldRefreshToken = cookies.jwt;

    const user = await User.findOne({
      refreshToken: { $in: [oldRefreshToken] },
    });

    // If refresh token exists in NO USER → possible reuse attack
    if (!user) {
      try {
        const decoded = jwt.verify(
          oldRefreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        console.log({ decoded });
        const hackedUser = await User.findById(decoded.id);
        if (hackedUser) {
          hackedUser.refreshToken = []; // wipe out stolen tokens
          await hackedUser.save();
        }
      } catch (err) {
        console.log({ err });
        return res.sendStatus(403);
      }
      return res.sendStatus(403);
    }

    // Filter out old refresh token
    const remainingTokens = user.refreshToken.filter(
      (rt) => rt !== oldRefreshToken
    );

    // Validate old token
    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
      if (decoded.id !== user._id.toString()) return res.sendStatus(403);
    } catch (err) {
      user.refreshToken = remainingTokens;
      await user.save();
      return res.sendStatus(403);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id
    );

    // Save new refresh token
    user.refreshToken = [...remainingTokens, newRefreshToken];
    await user.save();

    // Now clear + set new cookie
    res.clearCookie("jwt");
    res.cookie("jwt", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No content

  const refreshToken = cookies.jwt;
  const user = await User.findOne({ refreshToken });

  if (!user) {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    return res.sendStatus(204);
  }

  // Delete refreshToken from DB
  user.refreshToken = user.refreshToken.filter((rt) => rt !== refreshToken);
  await user.save();

  res.clearCookie("jwt", { httpOnly: true, sameSite: "lax", secure: true });
  res.sendStatus(204);
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get Reset Token
    const resetToken = user.getResetPasswordToken();

    await user.save();

    // Create Reset URL (Point to Frontend Route)
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Please go to this link to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>This link expires in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Token",
        message,
      });

      res.status(200).json({ success: true, message: "Email sent" });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  // Hash token from URL to compare with DB
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
