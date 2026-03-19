import { useState, useEffect } from "react";
import { FiCheckCircle, FiLoader } from "react-icons/fi";

export default function ToolStep({ name, input, output, isStreaming }) {
  const [expanded, setExpanded] = useState(true);

  // Auto-collapse when output arrives (tool is done)
  useEffect(() => {
    if (output && !isStreaming) {
      setExpanded(false);
    }
  }, [output, isStreaming]);

  const statusIcon = output ? <FiCheckCircle size={14} color="var(--success)" /> : <FiLoader size={14} className="tool-spinner-icon" />;

  return (
    <div className={`tool-step ${!output ? "tool-step-active" : ""}`}>
      <div className="tool-step-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">{statusIcon}</span>
        <span className="tool-name">{name}</span>
        {!output && <span className="tool-spinner" />}
        <span className="tool-expand">{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && (
        <div className="tool-step-body">
          {input && (
            <div className="tool-section">
              <span className="tool-label">Input:</span>
              <pre>{typeof input === "string" ? input : JSON.stringify(input, null, 2)}</pre>
            </div>
          )}
          {output && (
            <div className="tool-section">
              <span className="tool-label">Output:</span>
              <pre>{typeof output === "string" ? output : JSON.stringify(output, null, 2)}</pre>
            </div>
          )}
          {!output && (
            <div className="tool-thinking">Running...</div>
          )}
        </div>
      )}
    </div>
  );
}
