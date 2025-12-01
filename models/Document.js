import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // docId: { type: String, required: true, unique: true },

    fileName: { type: String, required: true },

    fileUrl: { type: String, required: true },

    pageCount: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed", "deleted"],
      default: "uploaded",
    },

    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Document", DocumentSchema);
