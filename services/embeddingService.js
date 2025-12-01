import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// import { VertexAIEmbeddings } from "@langchain/google-vertexai";

// export const embedding = new VertexAIEmbeddings({
//   model: "gemini-embedding-001"
// });
console.log("API KEY ::", process.env.GEMINI_API_KEY)
export const embedding = new GoogleGenerativeAIEmbeddings({
  apiKey:process.env.GEMINI_API_KEY,
  model:"text-embedding-004"
})

export async function embedDocuments(documents) {
  const vectorEmbeddings = await embedding.embedDocuments(documents);
  return vectorEmbeddings;
}

export async function embedQuery(query) {
  const vectorEmbedding = await embedding.embedQuery(query);
  return vectorEmbedding;
}
