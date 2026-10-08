import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000
    });

    console.log("=================================");
    console.log("MongoDB Atlas conectado");
    console.log("=================================");
  } catch (error) {
    console.error("Error conectando a MongoDB:");
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;