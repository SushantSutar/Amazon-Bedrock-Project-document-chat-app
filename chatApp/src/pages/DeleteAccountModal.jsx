import { useState } from "react";
import { api } from "../api";

export default function DeleteAccountModal({ onClose, onDeleted }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Danger zone</p>
        <h1>Delete account</h1>
        <p className="muted">
          This permanently deletes your account, all chats, RAG chunks in MySQL, and every uploaded file in Amazon S3.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Confirm with your password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="danger" disabled={loading}>
              {loading ? "Deleting..." : "Delete my account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
