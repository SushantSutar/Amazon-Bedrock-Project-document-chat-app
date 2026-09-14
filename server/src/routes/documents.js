import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { extractText } from "../services/extract.js";
import { uploadToS3 } from "../services/s3.js";
import { embedText } from "../services/bedrock.js";
import { splitIntoChunks } from "../services/rag.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = (file.originalname || "").toLowerCase();
    if (name.endsWith(".pdf") || name.endsWith(".docx")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PDF and DOCX files are allowed."));
  },
});

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const [documents] = await pool.query(
      `SELECT
         d.id,
         d.original_name,
         d.s3_key,
         d.created_at,
         (
           SELECT m.content
           FROM messages m
           WHERE m.document_id = d.id
           ORDER BY m.id DESC
           LIMIT 1
         ) AS last_message
       FROM documents d
       WHERE d.user_id = ?
       ORDER BY d.id DESC`,
      [req.user.id],
    );
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load documents." });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Choose a PDF or DOCX file to upload." });
    }

    const extractedText = await extractText(req.file);
    const chunks = splitIntoChunks(extractedText);
    if (!chunks.length) {
      return res.status(400).json({ error: "No readable text found in this file." });
    }

    const embeddings = [];
    for (const chunk of chunks) {
      embeddings.push(await embedText(chunk));
    }

    const extension = req.file.originalname.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
    const key = `users/${req.user.id}/${Date.now()}-${randomUUID()}.${extension}`;

    await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype || "application/octet-stream",
    });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [docResult] = await connection.query(
        `INSERT INTO documents (user_id, original_name, s3_key)
         VALUES (?, ?, ?)`,
        [req.user.id, req.file.originalname, key],
      );

      for (let i = 0; i < chunks.length; i += 1) {
        await connection.query(
          `INSERT INTO document_chunks (document_id, chunk_index, chunk_text, embedding)
           VALUES (?, ?, ?, ?)`,
          [docResult.insertId, i, chunks[i], JSON.stringify(embeddings[i])],
        );
      }

      await connection.commit();
      res.status(201).json({
        document: {
          id: docResult.insertId,
          original_name: req.file.originalname,
          s3_key: key,
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(400).json({ error: error.message || "Upload failed." });
  }
});

export default router;
