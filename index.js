// const express = require("express");
// const mongoose = require("mongoose");
// const routes = require("./Modules/mod_controller"); 
// const orgRoutes = require("./Organisation/org_controller");
// const userRoutes = require("./User/user_controller");
// const loginRoutes = require("./User/login_controller");
// const pocRoutes = require("./Poc/poc_controller");
// const expertRoutes = require("./Poc/expert_controller");
// const testcaseRoutes = require("./Test/testcase_controller");
// const mcqRoutes = require("./Test/mcq_controller");
// const codingRoutes = require("./Test/coding_controller");
// const testRoutes = require("./Test/test_controller");
// const reportRoutes = require("./Report/result_controller");
// const individualRoutes = require("./Report/individual_controller");
// const cors = require('cors');


// require('dotenv').config();



// // Initialize Express app
// const app = express();

// // Middleware to parse JSON
// app.use(express.json());
// app.use(cors());

// // Mount the routes
// app.use("/api", routes);
// app.use("/api", orgRoutes);
// app.use("/api", userRoutes);
// app.use("/api", loginRoutes);
// app.use("/api", pocRoutes);
// app.use("/api", expertRoutes);
// app.use("/api", testcaseRoutes);
// app.use("/api", mcqRoutes);
// app.use("/api", codingRoutes);
// app.use("/api", testRoutes);
// app.use("/api", reportRoutes);
// app.use("/api",individualRoutes);


// // MongoDB connection
// const mongoURI = process.env.MONGO_URI ; 
// mongoose.connect(mongoURI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((error) => console.error("MongoDB connection error:", error));

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });



const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");
const routes = require("./Modules/mod_controller");
const orgRoutes = require("./Organisation/org_controller");
const userRoutes = require("./User/user_controller");
const loginRoutes = require("./User/login_controller");
const pocRoutes = require("./Poc/poc_controller");
const expertRoutes = require("./Poc/expert_controller");
const testcaseRoutes = require("./Test/testcase_controller");
const mcqRoutes = require("./Test/mcq_controller");
const codingRoutes = require("./Test/coding_controller");
const testRoutes = require("./Test/test_controller");
const reportRoutes = require("./Report/result_controller");
const individualRoutes = require("./Report/individual_controller");
const cors = require("cors");

require("dotenv").config();

// ✅ Force Node.js to use Google DNS directly (fixes ECONNREFUSED on SRV lookup)
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());

// Mount the routes
app.use("/api", routes);
app.use("/api", orgRoutes);
app.use("/api", userRoutes);
app.use("/api", loginRoutes);
app.use("/api", pocRoutes);
app.use("/api", expertRoutes);
app.use("/api", testcaseRoutes);
app.use("/api", mcqRoutes);
app.use("/api", codingRoutes);
app.use("/api", testRoutes);
app.use("/api", reportRoutes);
app.use("/api", individualRoutes);

// MongoDB connection
const mongoURI = process.env.MONGO_URI;

console.log("MONGO_URI:", mongoURI);

const connectWithRetry = () => {
  mongoose
    .connect(mongoURI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error.message);
      console.log("🔄 Retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000); // retry every 5 seconds
    });
};

connectWithRetry();

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});