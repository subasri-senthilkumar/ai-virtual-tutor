const API_URL = "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return;
  }
  return res;
}

export async function fetchSSE(message, conversationId, files, onEvent) {
  const token = getToken();
  const formData = new FormData();
  formData.append("message", message);
  formData.append("conversation_id", conversationId || "");
  if (files) {
    for (const f of files) formData.append("files", f);
  }

  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {}
      }
    }
  }
}
