import { WebSocketServer } from "ws";
import { answerQuery } from "../services/answerService.js";
import { verifyJWT } from "../utils/jwtDecoder.js";
export async function initChatWindowSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, "http://localhost:4000");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "You are not authorize");
      return;
    }

    let decodedToken = null;
    try {
      decodedToken = verifyJWT(token);
    } catch (error) {
      console.log("ERROR IN WS TOKEN :: ",error)
    }
    let userId = null;

    if (decodedToken) {
      userId = decodedToken?.id;
    } else {
      ws.close(4002, "Token is not valid");
      return;
    }

    console.log("connection happend ", { userId });

    ws.on("message", async (message) => {
      const parsedData = JSON.parse(message);
      console.log({ parsedData });
      if (parsedData?.type === "query") {
        if (parsedData?.content?.trim()) {
          await answerQuery(parsedData?.content, parsedData?.docId, ws);
        }
      }
    });
  });
}
