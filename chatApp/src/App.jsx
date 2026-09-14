import { useEffect, useState } from "react";
import { api } from "./api";
import AuthPage from "./pages/AuthPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import PasswordModal from "./pages/PasswordModal.jsx";
import UploadPage from "./pages/UploadPage.jsx";

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [user, setUser] = useState(readUser);
  const [documents, setDocuments] = useState([]);
  const [document, setDocument] = useState(null);
  const [view, setView] = useState("chat");
  const [ready, setReady] = useState(!localStorage.getItem("token"));
  const [showPassword, setShowPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function loadDocuments(preferredId) {
    const listed = await api.listDocuments();
    const items = listed.documents || [];
    setDocuments(items);
    const selected =
      items.find((item) => String(item.id) === String(preferredId)) || items[0] || null;
    setDocument(selected);
    setView(selected ? "chat" : "upload");
    return items;
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }

    const savedId = sessionStorage.getItem("activeDocumentId");
    loadDocuments(savedId)
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (document?.id) {
      sessionStorage.setItem("activeDocumentId", String(document.id));
    }
  }, [document]);

  async function saveAuth(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    await loadDocuments();
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("activeDocumentId");
    setUser(null);
    setDocuments([]);
    setDocument(null);
  }

  function openDocument(item) {
    setDocument(item);
    setView("chat");
    setSidebarOpen(false);
  }

  if (!ready) {
    return <div className="auth-wrap muted">Loading...</div>;
  }

  if (!user) {
    return (
      <AuthPage
        onAuth={{
          login: async (email, password) => {
            saveAuth(await api.login(email, password));
          },
          register: async (email, password) => {
            saveAuth(await api.register(email, password));
          },
        }}
      />
    );
  }

  return (
    <div className="app-frame">
      <nav>
        <button
          type="button"
          className="ghost menu-btn"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          Chats
        </button>
        <div className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <strong>Doc Chat</strong>
        </div>
        <span className="nav-email">{user.email}</span>
        <button type="button" className="ghost" onClick={() => setShowPassword(true)}>
          Change password
        </button>
        <button type="button" className="link" onClick={logout}>
          Log out
        </button>
      </nav>

      <div className="workspace">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <button
            type="button"
            className="new-chat"
            onClick={() => {
              setView("upload");
              setSidebarOpen(false);
            }}
          >
            + New document
          </button>
          <p className="sidebar-label">Previous chats</p>
          <div className="chat-list">
            {documents.length === 0 ? (
              <p className="muted sidebar-empty">No uploads yet. Add a PDF or Word file to start.</p>
            ) : (
              documents.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`chat-item ${document?.id === item.id && view === "chat" ? "active" : ""}`}
                  onClick={() => openDocument(item)}
                >
                  <strong>{item.original_name}</strong>
                  <span>{item.last_message || "No messages yet"}</span>
                  <em>{formatDate(item.created_at)}</em>
                </button>
              ))
            )}
          </div>
        </aside>

        <main>
          {view === "chat" && document ? (
            <ChatPage document={document} />
          ) : (
            <UploadPage
              onUploaded={async (file) => {
                const data = await api.uploadDocument(file);
                const items = await loadDocuments(data.document.id);
                const created = items.find((item) => item.id === data.document.id) || data.document;
                openDocument(created);
              }}
            />
          )}
        </main>
      </div>

      {showPassword ? <PasswordModal onClose={() => setShowPassword(false)} /> : null}
    </div>
  );
}
