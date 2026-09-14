import { useState } from "react";

export default function UploadPage({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF or DOCX file.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onUploaded(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <p className="eyebrow">New document</p>
        <h1>Upload a file to start a chat</h1>
        <p className="muted">
          PDF or Word (.docx). The file is stored in Amazon S3. After upload it appears under Previous chats.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="file-box">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <strong>{file ? file.name : "Drop or choose PDF / DOCX"}</strong>
            <span>Maximum size 10 MB</span>
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Uploading and indexing..." : "Upload and open chat"}
          </button>
        </form>
      </div>
    </div>
  );
}
