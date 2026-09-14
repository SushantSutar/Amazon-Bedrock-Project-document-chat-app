const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;
const TOP_K = 5;

export function splitIntoChunks(text) {
  const cleaned = String(text || "").replace(/\s+\n/g, "\n").trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n{2,}/);
  const pieces = [];

  for (const paragraph of paragraphs) {
    const value = paragraph.trim();
    if (!value) continue;
    if (value.length <= CHUNK_SIZE) {
      pieces.push(value);
      continue;
    }
    for (let i = 0; i < value.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      pieces.push(value.slice(i, i + CHUNK_SIZE).trim());
    }
  }

  return pieces.filter(Boolean);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / ((Math.sqrt(magA) * Math.sqrt(magB)) || 1);
}

export function topChunks(chunks, queryEmbedding, k = TOP_K) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
