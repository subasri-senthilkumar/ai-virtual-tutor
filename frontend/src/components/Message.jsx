import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import ToolStep from "./ToolStep";

export default function Message({ role, content, toolSteps, isStreaming, attachments, thinking }) {
  const isUser = role === "user";
  const [thinkingExpanded, setThinkingExpanded] = useState(true);

  const speak = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`message ${isUser ? "message-user" : "message-assistant"}`}>
      <div className="message-avatar">{isUser ? "👤" : "🎓"}</div>
      <div className="message-content">
        {/* File attachment chips above user message */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="message-attachments">
            {attachments.map((a, i) => (
              <span key={i} className="attachment-chip">
                {a.type === "image" ? "🖼️" : a.type === "audio" ? "🎵" : "📄"} {a.name}
              </span>
            ))}
          </div>
        )}

        {/* Thinking/reasoning block */}
        {thinking && (
          <div className={`thinking-block ${isStreaming && !content ? "thinking-block-active" : ""}`}>
            <div className="thinking-header" onClick={() => setThinkingExpanded(!thinkingExpanded)}>
              <span>🧠</span>
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
        {!isUser && content && !isStreaming && (
          <div className="message-actions">
            <button className="action-btn" onClick={speak} title="Read aloud">
              🔊
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
