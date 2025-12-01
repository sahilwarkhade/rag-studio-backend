import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";
import {
  deleteDocument,
  getAllUserDocuments,
  getDocumentHistory,
  uploadFile,
} from "../controllers/documentController.js";

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadFile);
router.get("/all/documents", protect, getAllUserDocuments);
router.get("/document/history/:docId", protect, getDocumentHistory);
router.delete("/document/:docId", protect, deleteDocument);
export default router;
