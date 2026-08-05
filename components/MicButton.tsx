"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Dictation button using the browser's built-in Web Speech API (Chrome/Edge).
// Calls onText with each finalized chunk of transcribed speech.
export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => {
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, []);

  function toggle() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      try {
        recRef.current?.stop();
      } catch {}
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      const clean = text.trim();
      if (clean) onText(clean);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    try {
      rec.start(); // triggers the browser's mic permission prompt on first use
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        ...baseStyle,
        background: listening ? "#dc2626" : "transparent",
        color: listening ? "#fff" : "var(--text-muted)",
        borderColor: listening ? "#dc2626" : "var(--border)",
      }}
      title={listening ? "Stop dictation" : "Dictate with your microphone"}
    >
      {listening ? "● Listening… (click to stop)" : "🎙 Dictate"}
    </button>
  );
}

const baseStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "0.3rem 0.6rem",
  fontSize: "0.85rem",
  cursor: "pointer",
};
