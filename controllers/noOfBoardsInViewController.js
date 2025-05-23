const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createNoOfBoardsInView = async (req, res) => {
  try {
    const { name } = req.body;
    const boards = await prisma.noOfBoardsInView.create({
      data: { name },
    });
    res.status(201).json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNoOfBoardsInView = async (req, res) => {
  try {
    const boards = await prisma.noOfBoardsInView.findMany();
    res.status(200).json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
