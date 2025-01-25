const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes")
const billboardRoutes = require("./routes/billboardRoutes")
const auditRoutes = require("./routes/auditRoutes")

const app = express();
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5000"],
    allowedHeaders: ["Content-Type", "Authorization", "auth-token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json());
app.use("/uploads", express.static('uploads'))
app.use("/", authRoutes);
app.use("/", billboardRoutes);
app.use("/", auditRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
