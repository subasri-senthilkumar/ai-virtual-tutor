import { useState, useRef, useEffect } from "react";
import { FiPaperclip, FiMic, FiArrowUp } from "react-icons/fi";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  // Stores committed (final) transcript separately so interim doesn't erase typed text
  const committedRef = useRef("");

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [text]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() && files.length === 0) return;
    onSend(text, files);
    setText("");
    committedRef.current = "";
    setFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFiles = (e) => {
    setFiles([...e.target.files]);
  };

  const isRecordingRef = useRef(false);
  const silenceTimerRef = useRef(null);

  const stopRecording = () => {
    clearTimeout(silenceTimerRef.current);
    isRecordingRef.current = false;
    recognitionRef.current?.abort();
    setRecording(false);
  };

  const resetSilenceTimer = () => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(stopRecording, 5000);
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false; // one phrase at a time — most reliable

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          committedRef.current += (committedRef.current ? " " : "") + t.trim();
          resetSilenceTimer(); // got speech, reset the 5s clock
        } else {
          interim = t;
        }
      }
      setText(committedRef.current + (interim ? " " + interim : ""));
    };

    recognition.onend = () => {
      // Auto-restart while mic button is still active
      if (isRecordingRef.current) {
        startRecognition();
      } else {
        setText(committedRef.current);
        setRecording(false);
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "no-speech") return; // just restart on silence
      isRecordingRef.current = false;
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleSpeech = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isRecordingRef.current) {
      stopRecording();
      return;
    }

    committedRef.current = text;
    isRecordingRef.current = true;
    setRecording(true);
    resetSilenceTimer(); // start the 5s silence countdown
    startRecognition();
  };

  return (
    <div className="chat-input-wrapper">
      <form className="chat-input" onSubmit={handleSubmit}>
        {files.length > 0 && (
          <div className="file-chips">
            {files.map((f, i) => (
              <span key={i} className="file-chip">
                <FiPaperclip size={12} /> {f.name}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="input-row">
          <button type="button" className="input-btn" onClick={() => fileRef.current?.click()} title="Upload file" disabled={disabled}>
            <FiPaperclip size={18} />
          </button>
          <input type="file" ref={fileRef} onChange={handleFiles} multiple hidden accept="image/*,audio/*,.pdf,.docx,.txt" />
          <button
            type="button"
            className={`input-btn ${recording ? "recording" : ""}`}
            onClick={toggleSpeech}
            title={recording ? "Stop recording" : "Voice input"}
            disabled={disabled}
          >
            <FiMic size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              committedRef.current = e.target.value;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask your tutor anything..."
            disabled={disabled}
            autoFocus
            rows={1}
            className="chat-textarea"
          />
          <button type="submit" className="send-btn" disabled={disabled || (!text.trim() && files.length === 0)}>
            <FiArrowUp size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
