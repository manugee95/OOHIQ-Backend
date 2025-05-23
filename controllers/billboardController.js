const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createBoardType = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const board = await prisma.billboardType.create({
      data: {
        name,
      },
    });
    res.status(201).json(board);
  } catch (error) {
    console.error("Error creating board type:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getboard = async (req, res) => {
  try {
    const board = await prisma.billboardType.findMany();
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
