const API_URL = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export const api = {
  register(email, password) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  login(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  listDocuments() {
    return request("/documents");
  },
  uploadDocument(file) {
    const body = new FormData();
    body.append("file", file);
    return request("/documents/upload", { method: "POST", body });
  },
  getMessages(documentId) {
    return request(`/chat/${documentId}`);
  },
  ask(documentId, question) {
    return request(`/chat/${documentId}`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },
  changePassword(currentPassword, newPassword) {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
