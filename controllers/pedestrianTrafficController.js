const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createPedestrianTraffic = async (req, res) => {
  try {
    const { name } = req.body;
    const traffic = await prisma.pedestrianTraffic.create({ data: { name } });
    res.status(201).json(traffic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPedestrianTraffic = async (req, res) => {
  try {
    const traffic = await prisma.pedestrianTraffic.findMany();
    res.status(200).json(traffic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
