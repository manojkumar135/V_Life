import mongoose from "mongoose";

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  await mongoose.connect(process.env.BASE_URL);
  console.log("✅ MongoDB Connected (Cron)");
};
