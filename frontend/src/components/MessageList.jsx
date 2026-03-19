import { useEffect, useRef } from "react";
import Message from "./Message";

export default function MessageList({ messages, streamingMessage }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="message-list">
      {messages.length === 0 && !streamingMessage && (
        <div className="empty-state">
          <div className="empty-icon">🎓</div>
          <h2>AI Virtual Tutor</h2>
          <p>Ask me anything — upload images, documents, or use voice input!</p>
        </div>
      )}
      {messages.map((msg, i) => (
        <Message key={i} {...msg} />
      ))}
      {streamingMessage && (
        <Message
          role="assistant"
          content={streamingMessage.content}
          toolSteps={streamingMessage.toolSteps}
          thinking={streamingMessage.thinking}
          isStreaming={true}
        />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
