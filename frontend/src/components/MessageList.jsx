import { useEffect, useRef, useCallback } from "react";
import { LuBookOpen } from "react-icons/lu";
import Message from "./Message";

export default function MessageList({ messages, streamingMessage }) {
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const isNearBottom = useRef(true);

  // Track whether user is near the bottom
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 250; // px from bottom
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (isNearBottom.current && listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streamingMessage]);

  return (
    <div className="message-list" ref={listRef} onScroll={handleScroll}>
      {messages.length === 0 && !streamingMessage && (
        <div className="empty-state">
          <div className="empty-icon"><LuBookOpen size={48} /></div>
          <h2>AI Virtual Tutor</h2>
          <p>Ask me anything - upload images, documents!</p>
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
