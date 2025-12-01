import { fileDeleteQueue, fileUploadQueue } from "../config/bullMq.js";
import ConversationalHistory from "../models/ConversationalHistory.js";
import Document from "../models/Document.js";

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const user = req.user;
    const doc = new Document({
      userId: user,
      fileName: file?.originalname,
      fileSize: file?.size,
      fileUrl: file?.path,
      status: "processing",
    });

    await doc.save();
    await fileUploadQueue.add("file-uploaded", { docId: doc?._id.toString() });

    return res.status(200).json({
      success: true,
      message: "File Uploaded successfully",
    });
  } catch (error) {
    console.log("ERROR IN UPLOADING FILE :: ", error);
    return res.status(500).json({
      success: false,
      message: "Sorry",
    });
  }
};

export const getAllUserDocuments = async (req, res) => {
  try {
    const user = req.user;

    const allUserDocs = await Document.find({
      userId: user,
      status: { $in: ["processing", "completed", "failed"] },
    })
      .select("fileName fileSize pageCount status _id")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      allUserDocs,
    });
  } catch (error) {
    console.log("ERROR IN GETTING ALL USER DOCUMENTS :: ", error);
    return res.status(500).json({
      success: false,
      message: "Sorry",
    });
  }
};

export const getDocumentHistory = async (req, res) => {
  try {
    const { docId } = req.params;
    const history = await ConversationalHistory.find({ docId })
      .select("messages")
      .lean();

    return res.status(200).json({
      success: true,
      history: history[0]?.messages || [],
    });
  } catch (error) {
    console.log("ERROR IN GETTING DOCUMENT HISTORY :: ", error);
    return res.status(500).json({
      success: false,
      message: "Sorry",
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const userId = req.user;

    await Document.findByIdAndUpdate(docId, { $set: { status: "deleted" } });
    await fileDeleteQueue.add("delete-document", { docId, userId });
    return res.status(200).json({
      success: true,
      message: "Document successfully deleted",
    });
  } catch (error) {
    console.log("ERROR WHILE DELETING DOCUMENT :: ", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurs, please try again later",
    });
  }
};
