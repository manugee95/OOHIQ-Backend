module.exports = {
  apps: [
    {
      name: "server",
      script: "server.js",
    },
    {
      name: "worker",
      script: "utils/worker.js",
    },
    {
      name: "reauditWorker",
      script: "utils/reauditWorker.js"
    }
  ],
};
