import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { askWithContext, embedText } from "../services/bedrock.js";
import { topChunks } from "../services/rag.js";

const router = Router();
router.use(authRequired);

function parseEmbedding(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

router.get("/:documentId", async (req, res) => {
  try {
    const [docs] = await pool.query(
      "SELECT id FROM documents WHERE id = ? AND user_id = ?",
      [req.params.documentId, req.user.id],
    );
    if (!docs.length) {
      return res.status(404).json({ error: "Document not found." });
    }

    const [messages] = await pool.query(
      `SELECT id, role, content, created_at
       FROM messages
       WHERE user_id = ? AND document_id = ?
       ORDER BY id ASC`,
      [req.user.id, docs[0].id],
    );

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load chat." });
  }
});

router.post("/:documentId", async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "Type a question first." });
    }

    const [docs] = await pool.query(
      "SELECT id FROM documents WHERE id = ? AND user_id = ?",
      [req.params.documentId, req.user.id],
    );
    if (!docs.length) {
      return res.status(404).json({ error: "Upload a document before chatting." });
    }

    const documentId = docs[0].id;
    const [chunkRows] = await pool.query(
      "SELECT chunk_text, embedding FROM document_chunks WHERE document_id = ?",
      [documentId],
    );
    if (!chunkRows.length) {
      return res.status(400).json({ error: "This document has no RAG chunks yet. Upload it again." });
    }

    const queryEmbedding = await embedText(question);
    const ranked = topChunks(
      chunkRows.map((row) => ({
        text: row.chunk_text,
        embedding: parseEmbedding(row.embedding),
      })),
      queryEmbedding,
    );

    const context = ranked.map((chunk, index) => `Chunk ${index + 1}:\n${chunk.text}`).join("\n\n");

    const [historyRows] = await pool.query(
      `SELECT role, content
       FROM messages
       WHERE user_id = ? AND document_id = ?
       ORDER BY id DESC
       LIMIT 8`,
      [req.user.id, documentId],
    );

    const answer = await askWithContext({
      context,
      history: historyRows.reverse(),
      question,
    });

    await pool.query(
      `INSERT INTO messages (user_id, document_id, role, content)
       VALUES (?, ?, 'user', ?), (?, ?, 'assistant', ?)`,
      [req.user.id, documentId, question, req.user.id, documentId, answer],
    );

    res.json({ answer });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Could not get an answer from Bedrock.",
    });
  }
});

export default router;
