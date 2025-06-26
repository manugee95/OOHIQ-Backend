const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { transporter } = require("../Helpers/email");
const { profileToGCS } = require("../Helpers/gcs");
const { generateRandomPassword, sendEmail } = require("../Helpers/mailer");

const prisma = new PrismaClient();

//Sign up a new user
exports.signup = async (req, res) => {
  const { email, password, fullName, role, country } = req.body;

  // Validation
  const requiredFields = { email, password, fullName, role, country };

  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value) {
      return res.status(400).json(`${key} is required`);
    }
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
        country,
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
      google_api_key: process.env.GOOGLE_MAPS_API_KEY,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing up user.", error });
  }
};

//Admin to create client and media owner user
exports.createUser = async (req, res) => {
  try {
    const { fullName, email, role, country } = req.body;

    const requiredFields = { fullName, email, role, country };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json(`${key} is required`);
      }
    }

    const normalizedEmail = email.toLowerCase();

    //Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exist!" });
    }

    //Generate Password and hash it
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    //Create user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role,
        country,
      },
    });

    //Send account creation email
    await sendEmail(
      normalizedEmail,
      "Your OOHIQ Account Details",
      `Your account has been created. Here is your login information: 
      Email - ${normalizedEmail} 
      Password - ${generatedPassword}`
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Field Auditor Login
exports.mobileLogin = async (req, res) => {
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

    if (user.role !== "FIELD_AUDITOR") {
      return res.status(403).json("You can only login as a field auditor");
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
      google_api_key: process.env.GOOGLE_MAPS_API_KEY,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in.", error });
  }
};

//Web login for admin, client and media owner
exports.webLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const requiredFields = { email, password };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json(`${key} is required`);
      }
    }

    // Convert email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase();

    // Find the user (case-insensitive search)
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "FIELD_AUDITOR") {
      return res.status(403).json("You are not authorized to access this page");
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
        role: user.role,
      },
      google_api_key: process.env.GOOGLE_MAPS_API_KEY,
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
        auditCount: true,
        approvedAudits: true,
        task: true,
        walletBalance: true,
        level: true,
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

exports.getUserById = async (req, res) => {
  try {
    const { id: userId } = req.params;

    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
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
  const { id } = req.user;
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
      publicUrl = await profileToGCS(req.file);
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

exports.saveUserToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save Push Token" });
  }
};

exports.getFieldAuditors = async (req, res) => {
  try {
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch field auditors with pagination
    const [auditors, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "FIELD_AUDITOR" },
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePicture: true,
          level: true,
          auditCount: true,
          approvedAudits: true,
        },
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { role: "FIELD_AUDITOR" } }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      auditors,
    });
  } catch (error) {
    console.error("Error fetching field auditors:", error);
    res.status(500).json({ error: "Failed to fetch field auditors" });
  }
};

exports.getClients = async (req, res) => {
  try {
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch clients with pagination
    const [clients, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CLIENT" },
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePicture: true,
        },
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { role: "CLIENT" } }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      clients,
    });
  } catch (error) {
    console.error("Error fetching field clients:", error);
    res.status(500).json({ error: "Failed to fetch field clients" });
  }
};

exports.getMediaOwners = async (req, res) => {
  try {
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch clients with pagination
    const [mediaOwners, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "MEDIA_OWNER" },
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePicture: true,
        },
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { role: "MEDIA_OWNER" } }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      mediaOwners,
    });
  } catch (error) {
    console.error("Error fetching field media owners:", error);
    res.status(500).json({ error: "Failed to fetch field media owners" });
  }
};
