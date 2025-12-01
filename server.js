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

const allowedOrigins = ["http://localhost:5173",  "https://rag.sahilwarkhade.com"]


const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
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
