const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createPosterCondition = async (req, res) => {
  try {
    const { name } = req.body;
    const condition = await prisma.posterCondition.create({ data: { name } });
    res.status(201).json(condition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPosterCondition = async (req, res) => {
  try {
    const condition = await prisma.posterCondition.findMany();
    res.status(200).json(condition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
