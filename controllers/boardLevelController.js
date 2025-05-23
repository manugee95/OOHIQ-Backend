const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createBoardLevel = async (req, res) => {
  try {
    const { name } = req.body;
    const level = await prisma.boardLevel.create({
      data: { name },
    });
    res.status(201).json(level);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBoardLevel = async (req, res) => {
  try {
    const level = await prisma.boardLevel.findMany();
    res.status(200).json(level);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
