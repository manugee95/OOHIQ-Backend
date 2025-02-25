const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { transporter } = require("../Helpers/email");
const { uploadToGCS } = require("../Helpers/gcs");

const prisma = new PrismaClient();

//Sign up a new user
exports.signup = async (req, res) => {
  const { email, password, fullName, role } = req.body;

  // Validation
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({
      message: "All fields (email, password, name, role) are required.",
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  // Ensure valid role value
  const validRoles = ["FIELD_AUDITOR", "ADMIN"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      message:
        "Invalid role provided. Role must be either 'FIELD_AUDITOR' or 'ADMIN'.",
    });
  }

  try {
    // Convert email to lowercase for consistency
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail, // Store email in lowercase
        password: hashedPassword,
        fullName,
        role,
      },
    });

    // Generate a JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.fullName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing up user.", error });
  }
};

//User Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Both email and password are required." });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    // Convert email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase();

    // Find the user (case-insensitive search)
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        level: user.level,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in.", error });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Validate input
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ message: "No user found with this email." });
    }

    // Generate a 4-digit random verification code
    const code = Math.floor(1000 + Math.random() * 9000); // 4-digit code

    // Set code expiration (e.g., 15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Store verification code in the database
    await prisma.verificationCode.create({
      data: {
        code: code.toString(),
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification code via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${code}. It will expire in 15 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: "Error sending email.", error });
      }
      res
        .status(200)
        .json({ message: "Verification code sent to your email." });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing request.", error });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({
      message: "Email, verification code, and new password are required.",
    });
  }

  try {
    // Validate user and verification code
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email." });
    }

    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        expiresAt: { gt: new Date() }, // Ensure the code is still valid
      },
    });

    if (!verification) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the verification code after successful password reset
    await prisma.verificationCode.delete({ where: { id: verification.id } });

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Error processing request." });
  }
};

exports.getUser = async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from the token's payload

    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        profilePicture: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Error retrieving user details." });
  }
};

//Update User Account
exports.updateUser = async (req, res) => {
  const { id } = req.params; // User ID to update
  const { fullName } = req.body;

  try {
    // Fetch the user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!userToUpdate) {
      return res.status(404).json({ error: "User not found." });
    }

    // Upload image to Google Cloud Storage using the file buffer (if provided)
    let publicUrl = userToUpdate.profilePicture;
    if (req.file) {
      publicUrl = await uploadToGCS(req.file);
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        fullName,
        profilePicture: publicUrl,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user." });
  }
};
