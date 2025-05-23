const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createSpecialFeatures = async (req, res) => {
  try {
    const { name } = req.body;
    const feature = await prisma.specialFeatures.create({
      data: { name },
    });
    res.status(201).json(feature);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSpecialFeatures = async (req, res) => {
  try {
    const feature = await prisma.specialFeatures.findMany();
    res.status(200).json(feature);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
