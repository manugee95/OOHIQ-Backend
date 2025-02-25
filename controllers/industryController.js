const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createIndustry = async (req, res) => {
  try {
    const { name } = req.body;
    const industry = await prisma.industry.create({ data: { name } });
    res.status(201).json(industry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllIndustries = async (req, res) => {
  try {
    const industries = await prisma.industry.findMany({
      include: { categories: true },
    });
    res.status(200).json(industries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateIndustry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedIndustry = await prisma.industry.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(updatedIndustry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteIndustry = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.industry.delete({ where: { id: parseInt(id) } });
    res.status(200).json({
      message: "Industry Deleted...",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
