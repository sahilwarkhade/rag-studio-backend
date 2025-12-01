import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    docId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant", "system"] },
        content: { type: String },
        citations: [{ type: mongoose.Schema.Types.Mixed }],
      },
    ],

    lastMessageAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);
