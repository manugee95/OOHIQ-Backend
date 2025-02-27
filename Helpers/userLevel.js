const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//Update User Level
const LEVELS = [
  { name: "Rookie", maxAudits: 10, minApproved: 8 },
  { name: "Challenger", maxAudits: 30, minApproved: 25 },
  { name: "Contender", maxAudits: 50, minApproved: 45 },
  { name: "Professional", maxAudits: 100, minApproved: 90 },
  { name: "Ultimate", maxAudits: 10000, minApproved: 10000 },
];

exports.updateUserLevel = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new Error("User not found");

    const currentLevelIndex = LEVELS.findIndex(
      (level) => level.name === user.level
    );

    if (currentLevelIndex === -1) throw new Error("Invalid user level");

    const currentLevel = LEVELS[currentLevelIndex];

    // Ensure user has completed all required audits
    if (user.auditCount >= currentLevel.maxAudits) {
      if (user.approvedAudits >= currentLevel.minApproved) {
        // Move to next level
        const nextLevel = LEVELS[currentLevelIndex + 1];

        if (nextLevel) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              level: nextLevel.name,
              auditCount: 0,
              approvedAudits: 0,
              task: nextLevel.maxAudits,
            },
          });

          console.log(`User ${userId} promoted to ${nextLevel.name}`);
        }
      } else {
        // Reset the level progress but keep the user at the same level
        await prisma.user.update({
          where: { id: userId },
          data: { auditCount: 0, approvedAudits: 0 },
        });

        console.log(
          `User ${userId} did not meet the required approved audits. Progress reset.`
        );
      }
    }
    // If auditCount is less than required, do nothing (progress continues)
  } catch (error) {
    console.error("Error updating user level:", error);
  }
};
// This helper function updates the user's level based on the number of audits they have completed and the number of audits that have been approved. It uses a predefined set of levels and their corresponding requirements to determine if the user should be promoted, reset, or remain at the current level. The function fetches the user's data from the database, checks their progress against the level requirements, and updates their level and progress accordingly. It also logs the promotion or progress reset to the console for monitoring purposes.