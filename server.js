const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const billboardRoutes = require("./routes/billboardRoutes");
const auditRoutes = require("./routes/auditRoutes");
const industryRoutes = require("./routes/industryRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const advertiserRoutes = require("./routes/advertiserRoutes");
const evaluationParametersRoutes = require("./routes/evaluationParametersRoutes");
const billboardEvaluationRoutes = require("./routes/billboardEvaluationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reauditRoutes = require("./routes/reauditRoutes");
const countryRoutes = require("./routes/countryRoutes");

const app = express();
require("dotenv").config();
require("./cron");

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://oohiq-frontend-gl9w.vercel.app",
    ],
    allowedHeaders: ["Content-Type", "Authorization", "auth-token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/", authRoutes);
app.use("/", billboardRoutes);
app.use("/", auditRoutes);
app.use("/", industryRoutes);
app.use("/", categoryRoutes);
app.use("/", advertiserRoutes);
app.use("/", evaluationParametersRoutes);
app.use("/", billboardEvaluationRoutes);
app.use("/", analyticsRoutes);
app.use("/", reauditRoutes);
app.use("/", countryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
