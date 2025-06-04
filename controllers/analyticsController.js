const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getAnalyticsOverview = async (req, res) => {
  try {
    const { country = "Nigeria" } = req.query;
    const selectedCountry = country;

    const [
      totalBoards,
      totalAudits,
      totalClients,
      totalMediaOwners,
      totalFieldAuditors,
    ] = await Promise.all([
      prisma.audit.count({ where: { country: selectedCountry, status: "APPROVED" } }),
      prisma.auditHistory.count({ where: { country: selectedCountry } }),
      prisma.user.count({
        where: { role: "CLIENT", country: selectedCountry },
      }),
      prisma.user.count({
        where: { role: "MEDIA_OWNER", country: selectedCountry },
      }),
      prisma.user.count({
        where: { role: "FIELD_AUDITOR", country: selectedCountry },
      })
    ]);

    res.status(200).json({
      totalBoards: totalBoards,
      totalAudits: totalAudits,
      totalClients: totalClients,
      totalMediaOwners: totalMediaOwners,
      totalFieldAuditors: totalFieldAuditors
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};
