import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function ChatPage({ document }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setError("");
    api
      .getMessages(document.id)
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading) return;

    setQuestion("");
    setError("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setLoading(true);

    try {
      const data = await api.ask(document.id, text);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Current document</p>
          <h1>{document.original_name}</h1>
        </div>
      </header>

      <div className="messages">
        {messages.length === 0 && !loading ? (
          <div className="empty-card">
            <p className="eyebrow">Ready</p>
            <h2>Ask this document anything</h2>
            <p className="muted">
              Previous messages load automatically. Answers come from matching RAG chunks via Amazon Bedrock.
            </p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div key={`${message.id || index}-${message.role}`} className={`bubble ${message.role}`}>
            <span>{message.role === "user" ? "You" : "Assistant"}</span>
            <p>{message.content}</p>
          </div>
        ))}

        {loading ? <p className="muted thinking">Thinking...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this document"
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
