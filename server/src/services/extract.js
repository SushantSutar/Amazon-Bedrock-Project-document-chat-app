import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(buffer) {
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return cleanText(pages.join("\n"));
}

export async function extractText(file) {
  const name = (file.originalname || "").toLowerCase();
  const mime = file.mimetype || "";

  if (name.endsWith(".pdf") || mime === "application/pdf") {
    const text = await extractPdfText(file.buffer);
    if (!text) {
      throw new Error("This PDF has no readable text. Try a text-based PDF, not a scanned image.");
    }
    return text;
  }

  if (
    name.endsWith(".docx") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = cleanText(result.value);
    if (!text) {
      throw new Error("Could not read text from this Word file.");
    }
    return text;
  }

  throw new Error("Only PDF and DOCX files are supported.");
}
