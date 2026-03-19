import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import emojiRegex from "emoji-regex";
import { marked } from "marked";
import { apiFetch } from "../api";

const SDK_URL = "https://aka.ms/csspeech/jsbrowserpackageraw";

function toPlainText(md) {
  const html = marked(md);
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent ?? "").replace(emojiRegex(), "").replace(/\s+/g, " ").trim();
}

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (window.SpeechSDK) return resolve(window.SpeechSDK);
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => resolve(window.SpeechSDK);
    script.onerror = () => reject(new Error("Failed to load Azure Speech SDK"));
    document.head.appendChild(script);
  });
}

export default function AvatarModal({ text, onClose }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const synthRef = useRef(null);
  const peerRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | speaking | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const SDK = await loadSdk();
        if (cancelled) return;

        // 1. Fetch ICE token and Speech auth token from our backend (key stays server-side)
        const [iceData, speechData] = await Promise.all([
          apiFetch("/api/avatar/ice-token").then((r) => r.json()),
          apiFetch("/api/avatar/speech-token").then((r) => r.json()),
        ]);
        if (cancelled) return;

        // 2. Create WebRTC peer connection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: iceData.Urls, username: iceData.Username, credential: iceData.Password }],
        });
        peerRef.current = pc;

        pc.ontrack = (event) => {
          if (event.track.kind === "video" && videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
          if (event.track.kind === "audio" && audioRef.current) {
            audioRef.current.srcObject = event.streams[0];
          }
        };

        pc.addTransceiver("video", { direction: "sendrecv" });
        pc.addTransceiver("audio", { direction: "sendrecv" });

        // 3. Azure Speech config using the short-lived token (not the raw key)
        const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(
          speechData.token,
          speechData.region
        );
        speechConfig.speechSynthesisVoiceName = "en-US-AvaMultilingualNeural";

        const avatarConfig = new SDK.AvatarConfig("lisa", "casual-sitting");
        avatarConfig.backgroundColor = "#1a1a1aff";

        const synth = new SDK.AvatarSynthesizer(speechConfig, avatarConfig);
        synthRef.current = synth;

        // 4. Start avatar session
        await synth.startAvatarAsync(pc);
        if (cancelled) { synth.close(); return; }

        setStatus("speaking");

        // 5. Speak the plain-text version of the message
        const plain = toPlainText(text);
        const result = await synth.speakTextAsync(plain);
        if (result.reason === SDK.ResultReason.SynthesizingAudioCompleted) {
          setStatus("ready");
        } else {
          throw new Error("Avatar synthesis failed: " + result.reason);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err.message);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      synthRef.current?.close();
      peerRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
        <button className="avatar-close" onClick={onClose} title="Close">
          <FiX size={18} />
        </button>

        {status === "loading" && (
          <div className="avatar-status">
            <span className="tool-spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
            <p>Connecting to avatar…</p>
          </div>
        )}

        {status === "error" && (
          <div className="avatar-status avatar-error">
            <p>Failed to start avatar</p>
            <small>{errorMsg}</small>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="avatar-video"
          style={{ display: status === "speaking" || status === "ready" ? "block" : "none" }}
        />
        <audio ref={audioRef} autoPlay style={{ display: "none" }} />
      </div>
    </div>
  );
}
