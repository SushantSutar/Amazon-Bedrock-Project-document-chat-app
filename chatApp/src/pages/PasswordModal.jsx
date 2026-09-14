import { useState } from "react";
import { api } from "../api";

export default function PasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
        <p className="eyebrow">Account</p>
        <h1>Change password</h1>
        <p className="muted">Enter your current password, then choose a new one.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              minLength={6}
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              minLength={6}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
