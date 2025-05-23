const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createDistanceOfVisibility = async (req, res) => {
  try {
    const { name } = req.body;
    const distance = await prisma.distanceOfVisibility.create({
      data: { name },
    });
    res.status(201).json(distance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDistanceOfVisibility = async (req, res) => {
  try {
    const distance = await prisma.distanceOfVisibility.findMany();
    res.status(200).json(distance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
