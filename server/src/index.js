import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import documentRoutes from "./routes/documents.js";

const required = [
  "JWT_SECRET",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "BEDROCK_MODEL_ID",
  "BEDROCK_EMBED_MODEL_ID",
  "MYSQL_DATABASE",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (!process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSWORD === "PUT_YOUR_MYSQL_ROOT_PASSWORD_HERE") {
  console.error("Set MYSQL_PASSWORD in server/.env to your MySQL root password, then restart.");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File is too large. Max size is 10 MB." });
  }
  res.status(400).json({ error: error.message || "Request failed." });
});

const port = Number(process.env.PORT || 5000);

try {
  await initDb();
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
} catch (error) {
  console.error("MySQL connection failed.");
  console.error(error.message);
  console.error("Check MYSQL_USER, MYSQL_PASSWORD, and that database amazonbedrock exists.");
  process.exit(1);
}
