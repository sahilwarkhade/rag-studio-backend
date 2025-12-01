import { Worker } from "bullmq";
import fs from "node:fs/promises";
import { connectDb } from "../config/mongoDb.js";
import { connectionOptions, FILE_DELETE_QUEUE } from "../config/bullMq.js";
import Document from "../models/Document.js";
import ConversationalHistory from "../models/ConversationalHistory.js";
import { deleteDocs } from "../services/searchService.js";
import "dotenv/config.js"
await connectDb();

const deleteWorker = new Worker(
  FILE_DELETE_QUEUE,
  async (job) => {
    if (job.name !== "delete-document") {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    const { docId, userId } = job.data;
    console.log("🗑️ Delete Worker Started ::", { docId, userId });

    try {
      const document = await Document.findById(docId);

      if (!document) {
        console.log("⚠️ Document not found, skipping delete");
        return;
      }

      const filePath = document.fileUrl;

      // 1. Delete from Qdrant
      const response = await deleteDocs(docId, userId);
      console.log("🧹 Qdrant cleanup done ::", response);

      // 2. Delete DB references
      await Document.findByIdAndDelete(docId);
      await ConversationalHistory.findOneAndDelete({ docId });

      // 3. Delete File (last step)
      try {
        if (filePath) {
          await fs.unlink(filePath);
          console.log("📁 File deleted ::", filePath);
        }
      } catch (fileErr) {
        console.log("⚠️ Failed to delete file (ignored) ::", fileErr.message);
      }

      console.log("✅ Document completely deleted");
    } catch (error) {
      console.log("❌ ERROR IN DELETE WORKER ::", error);
      throw error;
    }
  },
  {
    concurrency: 5,
    connection: connectionOptions,
  }
);

export default deleteWorker;
