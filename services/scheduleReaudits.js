const { PrismaClient } = require("@prisma/client");
const { subDays, startOfMonth, subHours, subMinutes } = require("date-fns");

const prisma = new PrismaClient();

const scheduleReaudits = async () => {
  try {
    const today = new Date();
    // const lastWeek = subDays(today, 7);
    const last = subMinutes(today, 10);
    const monthStart = startOfMonth(today);

    //Step 1: Get Audits not updated in the last 7 days
    const outdatedAudits = await prisma.audit.findMany({
      where: {
        updatedAt: { lte: last },
        status: "APPROVED",
      },
    });

    for (const audit of outdatedAudits) {
      //Step 2: Check if a schedule for today already exist
      const alreadyScheduledToday = await prisma.reauditSchedule.findMany({
        where: {
          auditId: audit.id,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          scheduledFor: { gte: monthStart },
        },
      });

      if (alreadyScheduledToday.length > 0) continue;

      //Step 3: Schedule for today 8:00am
      const scheduledTime = new Date();
      scheduledTime.setHours(9, 0, 0, 0);

      await prisma.reauditSchedule.create({
        data: {
          auditId: audit.id,
          scheduledFor: scheduledTime,
          status: "PENDING",
        },
      });

      console.log(`Scheduled re-audit for board ${audit.boardCode} at 8:00 AM`);
    }
  } catch (error) {
    console.error(`Error scheduling re-audits:`, error);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = { scheduleReaudits };
