const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createTrafficSpeed = async (req, res) => {
  try {
    const { name } = req.body;
    const speed = await prisma.trafficSpeed.create({ data: { name } });
    res.status(201).json(speed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTrafficSpeed = async (req, res) => {
  try {
    const speed = await prisma.trafficSpeed.findMany();
    res.status(200).json(speed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
