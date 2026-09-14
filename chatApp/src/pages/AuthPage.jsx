import { useState } from "react";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const action = mode === "login" ? onAuth.login : onAuth.register;
      await action(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand auth-brand">
          <img src="/favicon.svg" alt="" width="40" height="40" />
          <strong>Doc Chat</strong>
        </div>
        <p className="eyebrow">Document Q&A</p>
        <h1>{mode === "login" ? "Welcome back" : "Create an account"}</h1>
        <p className="muted">
          Sign in, upload a PDF or Word file, then ask questions. Previous chats stay saved for each document.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Register"}
          </button>
        </form>

        <button
          type="button"
          className="link"
          onClick={() => {
            setError("");
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
