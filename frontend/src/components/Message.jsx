import { useState, useEffect } from "react";
import emojiRegex from "emoji-regex";
import { marked } from "marked";
import { FiUser, FiImage, FiMusic, FiFile, FiCpu, FiVolume2, FiVolumeX, FiCopy, FiThumbsUp, FiThumbsDown, FiCheck, FiMonitor } from "react-icons/fi";
import AvatarModal from "./AvatarModal";
import { LuBookOpen } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import ToolStep from "./ToolStep";
import { apiFetch } from "../api";

export default function Message({ role, content, toolSteps, isStreaming, attachments, thinking, messageId, initialFeedback }) {
  const isUser = role === "user";
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(initialFeedback || null); // "like" | "dislike" | null
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const toPlainText = (md) => {
      const html = marked(md);
      const el = document.createElement("div");
      el.innerHTML = html;
      return (el.textContent ?? "").replace(emojiRegex(), "").replace(/\s+/g, " ").trim();
    };
    const cleaned = toPlainText(content);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Clear speaking state if this message unmounts mid-speech
  useEffect(() => {
    return () => { if (isSpeaking) window.speechSynthesis.cancel(); };
  }, [isSpeaking]);

  const copyText = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const giveFeedback = async (value) => {
    const next = feedback === value ? null : value; // toggle off if same
    setFeedback(next);
    if (messageId) {
      await apiFetch(`/api/messages/${messageId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ feedback: next }),
      });
    }
  };

  return (
    <div className={`message ${isUser ? "message-user" : "message-assistant"}`}>
      <div className="message-avatar">{isUser ? <FiUser size={18} /> : <LuBookOpen size={18} />}</div>
      <div className="message-content">
        {/* File attachment chips above user message */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="message-attachments">
            {attachments.map((a, i) => (
              <span key={i} className="attachment-chip">
                {a.type === "image" ? <FiImage size={12} /> : a.type === "audio" ? <FiMusic size={12} /> : <FiFile size={12} />} {a.name}
              </span>
            ))}
          </div>
        )}

        {/* Thinking/reasoning block */}
        {thinking && (
          <div className={`thinking-block ${isStreaming && !content ? "thinking-block-active" : ""}`}>
            <div className="thinking-header" onClick={() => setThinkingExpanded(!thinkingExpanded)}>
              <FiCpu className="thinking-icon" />
              <span className="thinking-label">
                {isStreaming && !content ? "Thinking..." : "Thought process"}
              </span>
              {isStreaming && !content && <span className="tool-spinner" />}
              <span className="tool-expand">{thinkingExpanded ? "▾" : "▸"}</span>
            </div>
            {thinkingExpanded && (
              <div className="thinking-body">{thinking}</div>
            )}
          </div>
        )}

        {/* Tool call steps for assistant */}
        {toolSteps && toolSteps.length > 0 && (
          <div className="tool-steps">
            {toolSteps.map((step, i) => (
              <ToolStep key={i} {...step} isStreaming={isStreaming} />
            ))}
          </div>
        )}

        {content && (
          <div className="message-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ borderRadius: "8px", margin: "8px 0" }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
                img({ src, alt }) {
                  return <img src={src} alt={alt || ""} className="message-image" loading="lazy" />;
                },
                table({ children }) {
                  return (
                    <div className="table-wrapper">
                      <table>{children}</table>
                    </div>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && <span className="streaming-cursor">▊</span>}

        {/* Action buttons — assistant only, after streaming complete */}
        {!isUser && content && !isStreaming && (
          <div className="message-actions">
            <button className="action-btn" onClick={copyText} title="Copy">
              {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
            </button>
            <button
              className={`action-btn ${feedback === "like" ? "action-active" : ""}`}
              onClick={() => giveFeedback("like")}
              title="Like"
            >
              <FiThumbsUp size={14} />
            </button>
            {/* Show dislike only when not liked (and always when disliked) */}
            {feedback !== "like" && (
              <button
                className={`action-btn ${feedback === "dislike" ? "action-active action-dislike" : ""}`}
                onClick={() => giveFeedback("dislike")}
                title="Dislike"
              >
                <FiThumbsDown size={14} />
              </button>
            )}
            <button
              className={`action-btn ${isSpeaking ? "action-active" : ""}`}
              onClick={speak}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              {isSpeaking ? <FiVolumeX size={14} /> : <FiVolume2 size={14} />}
            </button>
            <button
              className={`action-btn ${showAvatar ? "action-active" : ""}`}
              onClick={() => setShowAvatar((v) => !v)}
              title={showAvatar ? "Hide avatar" : "Show avatar"}
            >
              <FiMonitor size={14} />
            </button>
          </div>
        )}
        {showAvatar && (
          <AvatarModal text={content} onClose={() => setShowAvatar(false)} />
        )}
      </div>
    </div>
  );
}
