import "dotenv/config.js";
import express from "express";
import cors from "cors";
import http from "http";
import { initChatWindowSocket } from "./websockets/chatWindow.js";
import { connectDb } from "./config/mongoDb.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "https://rag.sahilwarkhade.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("/*", cors());


app.use(express.json());
app.use(cookieParser());

await connectDb();
await initChatWindowSocket(server);

app.use("/auth", authRoutes);
app.use(documentRoutes);

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Working fine",
  });
});

server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`SERVER IS RUNNING ON PORT ${process.env.PORT}`);
});
