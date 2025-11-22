import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  roomID: { type: String, required: true },
  gameState: { type: Object, required: true }
});

// Prevent OverwriteModelError
export const Game =
  mongoose.models.Game || mongoose.model("Game", GameSchema);

export default Game;
