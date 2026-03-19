import { useState, useRef } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    onSend(text, files);
    setText("");
    setFiles([]);
  };

  const handleFiles = (e) => {
    setFiles([...e.target.files]);
  };

  const toggleSpeech = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (recording) {
      setRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? prev + " " + transcript : transcript));
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognition.start();
    setRecording(true);
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      {files.length > 0 && (
        <div className="file-chips">
          {files.map((f, i) => (
            <span key={i} className="file-chip">
              📎 {f.name}
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="input-row">
        <button type="button" className="input-btn" onClick={() => fileRef.current?.click()} title="Upload file" disabled={disabled}>
          📎
        </button>
        <input type="file" ref={fileRef} onChange={handleFiles} multiple hidden accept="image/*,audio/*,.pdf,.docx,.txt" />
        <button
          type="button"
          className={`input-btn ${recording ? "recording" : ""}`}
          onClick={toggleSpeech}
          title="Voice input"
          disabled={disabled}
        >
          🎤
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask your tutor anything..."
          disabled={disabled}
          autoFocus
        />
        <button type="submit" className="send-btn" disabled={disabled || (!text.trim() && files.length === 0)}>
          ➤
        </button>
      </div>
    </form>
  );
}
