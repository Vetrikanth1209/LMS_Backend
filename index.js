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
const cors = require("cors");
require("dotenv").config();

// ================= ROUTES =================
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

// ================= JWT =================
const jwt = require("./auth");

// ================= DNS =================
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const app = express();

// ======================================================
// CORS FIX
// ======================================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://your-frontend-domain.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {

    // allow requests with no origin
    // like mobile apps or postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(null, true);
    }

    return callback(null, true);
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ],

  credentials: true
}));

// Handle preflight requests
app.options("*", cors());

// ======================================================
// BODY PARSER
// ======================================================
app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// ======================================================
// HEALTH CHECK
// ======================================================
app.get("/", (req, res) => {
  res.status(200).send("API Running...");
});

// ======================================================
// PUBLIC ROUTES
// ======================================================
app.use("/api", loginRoutes);

// ======================================================
// JWT PROTECTED ROUTES
// ======================================================
app.use("/api", jwt);

app.use("/api", routes);
app.use("/api", orgRoutes);
app.use("/api", userRoutes);
app.use("/api", pocRoutes);
app.use("/api", expertRoutes);
app.use("/api", testcaseRoutes);
app.use("/api", mcqRoutes);
app.use("/api", codingRoutes);
app.use("/api", testRoutes);
app.use("/api", reportRoutes);
app.use("/api", individualRoutes);

// ======================================================
// ERROR HANDLER
// ======================================================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message
  });
});

// ======================================================
// MONGODB CONNECTION
// ======================================================
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ MONGO_URI missing in .env");
  process.exit(1);
}

console.log("⏳ Connecting to MongoDB...");

mongoose.connect(mongoURI)
.then(() => {

  console.log("✅ MongoDB Connected");

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

})
.catch((err) => {

  console.error("❌ MongoDB Connection Error");
  console.error(err);

});