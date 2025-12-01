import { QdrantVectorStore } from "@langchain/qdrant";
import { embedding } from "./embeddingService.js";

export async function vectorStore(textChunks, metadataChunks) {
  const store = await QdrantVectorStore.fromTexts(
    textChunks,
    metadataChunks,
    embedding,
    {
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_DB_KEY,
      collectionName: "simple-rag-pdf",
    }
  );

  console.log("✅ Stored in Qdrant successfully!");
  return store;
}
