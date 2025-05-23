const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createEvaluationTime = async (req, res) => {
  try {
    const { name } = req.body;
    const time = await prisma.evaluationTime.create({ data: { name } });
    res.status(201).json(time);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvaluationTime = async (req, res) => {
  try {
    const time = await prisma.evaluationTime.findMany();
    res.status(200).json(time);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
