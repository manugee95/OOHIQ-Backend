const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createAdvertiser = async (req, res) => {
  try {
    const { name } = req.body;
    const advertiser = await prisma.advertiser.create({ data: { name } });
    res.status(201).json(advertiser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdvertiser = async (req, res) => {
  try {
    const advertiser = await prisma.advertiser.findMany();
    res.status(200).json(advertiser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAdvertiser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedAdvertiser = await prisma.advertiser.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(updatedAdvertiser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAdvertiser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.advertiser.delete({ where: { id: parseInt(id) } });
    res.status(200).json({
      message: "Advertiser Deleted...",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
