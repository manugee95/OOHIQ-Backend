const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createBoardCondition = async (req, res) => {
  try {
    const { name } = req.body;
    const condition = await prisma.boardCondition.create({ data: { name } });
    res.status(201).json(condition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBoardCondition = async(req, res)=>{
    try {
        const condition = await prisma.boardCondition.findMany()
        res.status(200).json(condition)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}
