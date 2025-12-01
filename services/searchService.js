import { QdrantVectorStore } from "@langchain/qdrant";
import { embedding } from "./embeddingService.js";

async function loadVectorStore() {
  const store = await QdrantVectorStore.fromExistingCollection(embedding, {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_DB_KEY,
    collectionName: "simple-rag-pdf",
  });

  return store;
}

export async function semanticSearch(query, k = 5, filter) {
  const store = await loadVectorStore();

  const results = await store.similaritySearch(query, k, filter);

  return results;
}

export async function deleteDocs(docId, userId) {
  const store = await loadVectorStore();
  const result = await store.client.delete("simple-rag-pdf", {
    filter: {
      must: [
        { key: "metadata.docId", match: { value: docId } },
        { key: "metadata.userId", match: { value: userId } },
      ],
    },
  });

  return result;
}
