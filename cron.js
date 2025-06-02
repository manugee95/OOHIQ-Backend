const cron = require("node-cron");
const { scheduleReaudits } = require("./services/scheduleReaudits");
const { expireOverdueReaudits } = require("./controllers/reauditsController");

//Runs once a day at 6AM to schedule eligible locations for re-audit
cron.schedule(
  "0 6 * * *",
  async () => {
    await scheduleReaudits();
    console.log("Running 6:00am lagos time");
  },
  {
    timezone: "Africa/Lagos",
  }
);

//Expire audits by 6pm
cron.schedule("0 18 * * *", async () => {
  await expireOverdueReaudits();
});
