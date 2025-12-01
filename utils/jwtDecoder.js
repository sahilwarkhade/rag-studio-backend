import jwt from "jsonwebtoken";

export function verifyJWT(token) {
  try {
    const decoded = jwt.decode(token, process.env.JWT_ACCESS_SECRET);
    if (!decoded) {
      throw new Error("Invalid token");
    }
    return decoded;
  } catch (error) {
    console.error("JWT decode error:", error.message);
    return null;
  }
}
