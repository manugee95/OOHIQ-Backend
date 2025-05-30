const cron = require("node-cron");
const { scheduleReaudits } = require("./services/scheduleReaudits");
const { expireOverdueReaudits } = require("./controllers/reauditsController");

//Runs once a day at 6AM to schedule eligible locations for re-audit
cron.schedule(
  "0 12 * * *",
  async () => {
    await scheduleReaudits();
    console.log("Running 12:00 lagos time");
  },
  {
    timezone: "Africa/Lagos",
  }
);

//Runs every 5 minutes to expire audits that were accepted but not completed within the period of time
cron.schedule("*/5 * * * *", async () => {
  await expireOverdueReaudits();
});
