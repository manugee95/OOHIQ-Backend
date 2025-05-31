const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createCountry = async (req, res) => {
  try {
    const { name } = req.body;

    const country = await prisma.country.create({
      data: { name },
    });

    res.status(201).json(country);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getCountries = async (req, res) => {
  try {
    const country = await prisma.country.findMany();
    res.json(country);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
