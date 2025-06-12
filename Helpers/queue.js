const { Queue } = require("bullmq");
const { Redis } = require("ioredis");
require("dotenv").config();

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, 
});

const auditQueue = new Queue("auditQueue", { connection });

const reauditQueue = new Queue("reauditQueue", { connection });

const addedQueue = new Queue("addedQueue", { connection });

module.exports = { auditQueue, reauditQueue, addedQueue };
