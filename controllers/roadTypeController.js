const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createRoadType = async (req, res) => {
  try {
    const { name } = req.body;
    const roadType = await prisma.roadType.create({ data: { name } });
    res.status(201).json(roadType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoadType = async (req, res) => {
  try {
    const roadType = await prisma.roadType.findMany();
    res.status(200).json(roadType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
