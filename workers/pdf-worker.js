import { Worker } from "bullmq";
import fs from "node:fs/promises";
import fscd from "node:fs";
import { connectionOptions, FILE_UPLOAD_QUEUE } from "../config/bullMq.js";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { vectorStore } from "../services/qdrant.js";
import Document from "../models/Document.js";
import { connectDb } from "../config/mongoDb.js";
import path from "node:path";
import "dotenv/config.js"

await connectDb();

const pdfWorker = new Worker(
  FILE_UPLOAD_QUEUE,
  async (job) => {
    let doc = null;

    try {
      const { docId } = job.data;
      doc = await Document.findById(docId);

      if (!doc) throw new Error("Document not found");

      doc.status = "processing";
      await doc.save();

      const filePath = doc.fileUrl;
      console.log("📄 PDF Worker Started ::", { docId, filePath });

      // Load PDF
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();

      // Chunk PDF
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
      });

      const chunks = await splitter.splitDocuments(docs);

      doc.chunkCount = chunks.length;
      doc.pageCount = chunks[0]?.metadata?.pdf?.totalPages || 0;

      // Extract text + metadata
      const textChunks = chunks.map((chunk) => chunk.pageContent);
      const metadataChunks = chunks.map((chunk) => ({
        ...chunk.metadata,
        docId,
        userId: doc.userId,
      }));

      // Store in Qdrant
      await vectorStore(textChunks, metadataChunks);

      doc.status = "completed";
      await doc.save();

      console.log("🎉 PDF Worker completed successfully!");
    } catch (error) {
      console.log("❌ ERROR IN PDF WORKER :: ", error);

      if (doc) {
        doc.status = "failed";
        await doc.save();
      }

      // File cleanup
      // if (doc?.fileUrl) {
      //   try {
      //     if (fscd.existsSync(doc.fileUrl)) {
      //       await fs.unlink(doc.fileUrl);
      //       console.log("🗑️ File deleted after failure");
      //     }
      //     console.log("File Not exist");
      //   } catch (e) {
      //     console.log("⚠️ Failed to delete failed file", e.message);
      //   }
      // }

      throw error;
    }
  },
  {
    concurrency: 3,
    connection: connectionOptions,
  }
);

export default pdfWorker;
