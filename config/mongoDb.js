import mongoose from "mongoose";
export const connectDb = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("DB Connected Successfully");
  } catch (err) {
    console.log("ERR IN CONNECTING DB :: ", err);
    process.exit(1);
  }
};
