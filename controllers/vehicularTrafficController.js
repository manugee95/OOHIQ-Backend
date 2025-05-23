const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createVehicularTraffic = async (req, res) => {
  try {
    const { name } = req.body;
    const traffic = await prisma.vehicularTraffic.create({ data: { name } });
    res.status(201).json(traffic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVehicularTraffic = async (req, res) => {
  try {
    const traffic = await prisma.vehicularTraffic.findMany();
    res.status(200).json(traffic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
