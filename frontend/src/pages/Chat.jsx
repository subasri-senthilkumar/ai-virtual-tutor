import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth";
import { apiFetch, fetchSSE } from "../api";
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList";
import ChatInput from "../components/ChatInput";

export default function Chat() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState(null);

  const loadConversations = useCallback(async () => {
    const res = await apiFetch("/api/conversations");
    if (res) setConversations(await res.json());
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = async (convId) => {
    const res = await apiFetch(`/api/conversations/${convId}/messages`);
    if (res) {
      const data = await res.json();
      setMessages(data.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => ({ name: a.filename, type: a.file_type })),
      })));
    }
  };

  const selectConversation = (id) => {
    setActiveConvId(id);
    loadMessages(id);
    setStreamingMessage(null);
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setStreamingMessage(null);
  };

  const sendMessage = async (text, files) => {
    // Build attachment metadata for display
    const attachments = files
      ? [...files].map((f) => ({
          name: f.name,
          type: f.type?.startsWith("image/") ? "image" : f.type?.startsWith("audio/") ? "audio" : "document",
        }))
      : [];

    const userMsg = { role: "user", content: text, attachments };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamingMessage({ content: "", toolSteps: [], thinking: "" });

    let convId = activeConvId;
    let currentContent = "";
    let currentToolSteps = [];
    let currentThinking = "";

    await fetchSSE(text, convId, files, (event) => {
      switch (event.type) {
        case "conversation_id":
          convId = event.data;
          setActiveConvId(convId);
          break;
        case "tool_call":
          currentToolSteps = [...currentToolSteps, { name: event.data.name, input: event.data.input }];
          setStreamingMessage({ content: currentContent, toolSteps: currentToolSteps, thinking: currentThinking });
          break;
        case "tool_result": {
          const idx = currentToolSteps.findLastIndex((t) => t.name === event.data.name && !t.output);
          if (idx >= 0) {
            currentToolSteps = [...currentToolSteps];
            currentToolSteps[idx] = { ...currentToolSteps[idx], output: event.data.output };
            setStreamingMessage({ content: currentContent, toolSteps: currentToolSteps, thinking: currentThinking });
          }
          break;
        }
        case "thinking":
          currentThinking += event.data;
          setStreamingMessage({ content: currentContent, toolSteps: currentToolSteps, thinking: currentThinking });
          break;
        case "text":
          currentContent += event.data;
          setStreamingMessage({ content: currentContent, toolSteps: currentToolSteps, thinking: currentThinking });
          break;
        case "title":
          loadConversations();
          break;
        case "error":
          currentContent += `\n\n⚠️ Error: ${event.data}`;
          setStreamingMessage({ content: currentContent, toolSteps: currentToolSteps, thinking: currentThinking });
          break;
        case "done":
          break;
      }
    });

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: currentContent, toolSteps: currentToolSteps, thinking: currentThinking },
    ]);
    setStreamingMessage(null);
    setStreaming(false);
    loadConversations();
  };

  const deleteConversation = async (id) => {
    await apiFetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
    loadConversations();
  };

  return (
    <div className="chat-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
        onLogout={logout}
        username={user?.username}
      />
      <main className="chat-main">
        <MessageList messages={messages} streamingMessage={streamingMessage} />
        <ChatInput onSend={sendMessage} disabled={streaming} />
      </main>
    </div>
  );
}
