import express from "express";
import nodemailer from "nodemailer";
import { Game } from "./models/Game.js";

const router = express.Router();

// GET /?roomID=XXXX  -> returns gameState or 404/400
router.get("/", async (req, res) => {
  const roomID = req.query.roomID || "";
  if (roomID && roomID.length === 10) {
    const doc = await Game.findOne({ roomID }).lean();
    if (doc && doc.gameState) return res.json(doc.gameState);
    return res.status(404).send({ error: "Room not found" });
  }
  return res.status(400).send({ error: "Bad request" });
});

// POST /feedback  -> send feedback email (expects body { data: { name, email, feedback } })
router.post("/feedback", async (req, res) => {
  try {
    const info = req.body.data;
    if (!info || !info.name || !info.email || !info.feedback) {
      return res.status(400).send({ error: "Missing fields" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_DEFAULT_SENDER || process.env.MAIL_USERNAME,
      to: "hangmanonlinefeedback@gmail.com",
      subject: `Feedback from ${info.name}`,
      text: `${info.email}\n\n${info.feedback}`
    });

    return res.send({ status: "Sent" });
  } catch (err) {
    console.error("Feedback send error:", err);
    return res.status(500).send({ error: "Failed to send feedback" });
  }
});

export default router;