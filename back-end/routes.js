import express from "express";
import nodemailer from "nodemailer";
import { Game } from "./models/Game.js";

const router = express.Router();

// GET /?roomID=XXXX  -> returns gameState or 404/400
router.get("/", async (req, res) => {
  try {
    const roomID = req.query.roomID || "";
    if (!roomID || roomID.length !== 10) {
      return res.status(400).json({ error: "Bad request" });
    }

    const doc = await Game.findOne({ roomID }).lean();
    if (!doc || !doc.gameState) {
      return res.status(404).json({ error: "Room not found" });
    }

    return res.json(doc.gameState);
  } catch (err) {
    console.error("GET / error:", err);
    // Only send response if headers not sent
    if (!res.headersSent) {
      return res.status(500).json({ error: "Server error" });
    }
  }
});

// POST /feedback -> send feedback email
router.post("/feedback", async (req, res) => {
  try {
    const info = req.body.data;
    if (!info || !info.name || !info.email || !info.feedback) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_DEFAULT_SENDER || process.env.MAIL_USERNAME,
      to: "hangmanonlinefeedback@gmail.com",
      subject: `Feedback from ${info.name}`,
      text: `${info.email}\n\n${info.feedback}`,
    });

    return res.json({ status: "Sent" });
  } catch (err) {
    console.error("Feedback send error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to send feedback" });
    }
  }
});

export default router;
