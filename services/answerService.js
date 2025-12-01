import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { semanticSearch } from "./searchService.js";
import ConversationalHistory from "../models/ConversationalHistory.js";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  streaming: true,
});

export async function answerQuery(query, docId, ws) {
  const filters = {
    must: [
      {
        key: "metadata.docId",
        match: { value: docId },
      },
    ],
  };

  const docs = await semanticSearch(query, 5, filters);
  const context = docs.map((d) => d.pageContent).join("\n\n");
  const prompt = `
You are a helpful assistant. 
Use ONLY the following context to answer the question. If you can't answer using the follwing context tell that i am not able to answer the question using given context.

### CONTEXT:
${context}

### QUESTION:
${query}

Note: Once you find the answer in given context, ellaborate it in a good way, make sure your should be large enough to understand the query

Output: Your output should in a markdown format, make sure markdowm should be proper for headings, titles, code blocks, paragraphs and all remaining components.
`;

  let completeResponse = "";
  const response = await model.stream(prompt);
  for await (const chunk of response.values()) {
    const text = chunk.text;
    if (!text) continue;
    completeResponse += text;
    ws.send(
      JSON.stringify({
        type: "content",
        content: Buffer.from(text).toString("base64"),
      })
    );
  }

  const citations = JSON.stringify(docs);
  ws.send(
    JSON.stringify({
      type: "citations",
      content: Buffer.from(citations).toString("base64"),
    })
  );

  const newMessages = [
    { role: "user", content: query },
    { role: "assistant", content: completeResponse, citations: docs },
  ];

  await ConversationalHistory.findOneAndUpdate(
    { docId },
    { $push: { messages: newMessages }, $set: { lastMessageAt: new Date() } },
    { upsert: true, new: true }
  );
}
