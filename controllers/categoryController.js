const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createCategory = async (req, res) => {
  try {
    const { name, industryId } = req.body;
    const category = await prisma.category.create({
      data: { name, industryId },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        industry: true,
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategoriesByIndustry = async (req, res) => {
  try {
    const { industryId } = req.params;
    const categories = await prisma.category.findMany({
      where: { industryId: parseInt(industryId) },
      include: {
        industry: true,
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.status(200).json({
      message: "Category Deleted...",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
