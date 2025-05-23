const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createBoardPositioning = async (req, res) => {
  try {
    const { name } = req.body;
    const position = await prisma.boardPositioning.create({
      data: { name },
    });
    res.status(201).json(position);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBoardPositioning = async (req, res) => {
  try {
    const position = await prisma.boardPositioning.findMany();
    res.status(200).json(position);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
