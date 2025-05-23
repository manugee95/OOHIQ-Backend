const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createVisibilityPoints = async (req, res) => {
  try {
    const { name } = req.body;
    const point = await prisma.visibilityPoints.create({
      data: { name },
    });
    res.status(201).json(point);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVisibilityPoints = async (req, res) => {
  try {
    const point = await prisma.visibilityPoints.findMany();
    res.status(200).json(point);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
