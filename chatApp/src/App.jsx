import { useEffect, useState } from "react";
import { api } from "./api";
import AuthPage from "./pages/AuthPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import PasswordModal from "./pages/PasswordModal.jsx";
import DeleteAccountModal from "./pages/DeleteAccountModal.jsx";
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
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

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

  useEffect(() => {
    setShowPassword(false);
    setShowDeleteAccount(false);
  }, [user?.id]);

  function closeOverlays() {
    setShowPassword(false);
    setShowDeleteAccount(false);
    setDeleteError("");
    setDeletingId(null);
  }

  async function saveAuth(data) {
    closeOverlays();
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    await loadDocuments();
  }

  function logout() {
    closeOverlays();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("activeDocumentId");
    setUser(null);
    setDocuments([]);
    setDocument(null);
    setView("upload");
  }

  function openDocument(item) {
    setDocument(item);
    setView("chat");
    setSidebarOpen(false);
  }

  async function deleteDocument(item) {
    const confirmed = window.confirm(
      `Delete "${item.original_name}"?\n\nThis removes the file from Amazon S3 and all chat messages for this document. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError("");
    setDeletingId(item.id);
    try {
      await api.deleteDocument(item.id);
      const remaining = documents.filter((doc) => doc.id !== item.id);
      setDocuments(remaining);
      if (document?.id === item.id) {
        const next = remaining[0] || null;
        setDocument(next);
        setView(next ? "chat" : "upload");
        if (next) {
          sessionStorage.setItem("activeDocumentId", String(next.id));
        } else {
          sessionStorage.removeItem("activeDocumentId");
        }
      }
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeletingId(null);
    }
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
        <div className="nav-actions">
          <span className="nav-user">
            <span className="nav-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
            <span className="nav-email">{user.email}</span>
          </span>
          <button type="button" className="ghost" onClick={() => setShowPassword(true)}>
            Change password
          </button>
          <button type="button" className="link danger-link" onClick={() => setShowDeleteAccount(true)}>
            Delete account
          </button>
          <button type="button" className="link" onClick={logout}>
            Log out
          </button>
        </div>
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
                <div
                  key={item.id}
                  className={`chat-item ${document?.id === item.id && view === "chat" ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="chat-item-open"
                    onClick={() => openDocument(item)}
                  >
                    <strong>{item.original_name}</strong>
                    <span>{item.last_message || "No messages yet"}</span>
                    <em>{formatDate(item.created_at)}</em>
                  </button>
                  <button
                    type="button"
                    className="chat-item-delete"
                    disabled={deletingId === item.id}
                    onClick={() => deleteDocument(item)}
                  >
                    {deletingId === item.id ? "..." : "Delete"}
                  </button>
                </div>
              ))
            )}
          </div>
          {deleteError ? <p className="error sidebar-error">{deleteError}</p> : null}
        </aside>

        <main>
          {view === "chat" && document ? (
            <ChatPage
              document={document}
              deleting={deletingId === document.id}
              onDelete={deleteDocument}
            />
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
      {showDeleteAccount ? (
        <DeleteAccountModal
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => {
            setShowDeleteAccount(false);
            logout();
          }}
        />
      ) : null}
    </div>
  );
}
