// db.js
import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  roomID: { type: String, required: true },
  gameState: { type: Object, required: true }
});

export const Game = mongoose.model("Game", GameSchema);

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}
