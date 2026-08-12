import React, { useEffect, useRef, useState, useCallback } from "react";
// Use a public asset path so the image doesn't need to be bundled. Place
// `hirumi-avatar.png` in `public/assets/` — the component will try the PNG
// first and fall back to an SVG at `/assets/hirumi-avatar.svg` if the PNG
// is missing.
import hirumiAvatar from "../../assets/hirumi-avatar.png";

/**
 * Hirumi — Admin AI Assistant Chat Widget
 * ----------------------------------------------------------------
 * Messenger-style floating chat head:
 *  - Bubble is always visible, bottom-right.
 *  - Tapping it unfolds a chat panel anchored to that corner.
 *  - Folding it back down (X or bubble tap) hides the panel only —
 *    the conversation stays in memory, so re-opening resumes where
 *    you left off (no state is cleared on fold).
 *  - An unread badge lights up if Hirumi replies while folded.
 *
 * Talks to the SAME chat.php endpoint used by the student widget.
 * Admin vs student behavior is controlled server-side (system prompt /
 * rules), not by this component — so this file only needs to identify
 * the caller, not change how it talks to the API.
 *
 * Configure API_URL via env (Vite: import.meta.env.VITE_HIRUMI_API_URL,
 * CRA: process.env.REACT_APP_HIRUMI_API_URL) so it isn't hardcoded to
 * localhost when you deploy. Falls back to localhost for local dev.
 */

const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_HIRUMI_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_HIRUMI_API_URL) ||
  "http://localhost/backend-online-enrollment/ai/php/chat.php";

const INITIAL_MESSAGE = {
  id: "welcome",
  sender: "hirumi",
  text: "Hi Admin, I'm Hirumi 🤖 Ask me about enrollment rules, requirements, or anything educational I can help with.",
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Hirumi({ role = "admin", userId = "" }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const panelId = "hirumi-admin-panel";

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = message.trim();
    if (!text || loading) return;

    setError(null);
    setMessages((prev) => [...prev, { id: uid(), sender: "admin", text }]);
    setMessage("");
    setLoading(true);

    try {
      const payload = { message: text, role, user_id: userId };
      if (role === "student") payload.student_id = userId;
      else if (role === "staff") payload.staff_id = userId;
      else if (role === "admin") payload.admin_id = userId;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (data?.success) {
        const replyText = data.reply || "No reply received.";
        setMessages((prev) => [...prev, { id: uid(), sender: "hirumi", text: replyText }]);
        if (!open) setUnread((n) => n + 1);
      } else {
        const failText = data?.message || raw || "Sorry, I couldn't process that request.";
        setMessages((prev) => [...prev, { id: uid(), sender: "hirumi", text: failText }]);
        setError("last-failed");
      }
    } catch (err) {
      console.error("Hirumi error:", err);
      setMessages((prev) => [
        ...prev,
        { id: uid(), sender: "hirumi", text: "I can't reach the server right now. Please try again in a moment." },
      ]);
      setError("network");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [message, loading, userId, role, open]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end font-sans">
      {/* ================= CHAT PANEL ================= */}
      <div
        id={panelId}
        role="dialog"
        aria-label="Hirumi admin assistant"
        aria-hidden={!open}
        className={[
          "mb-3 flex w-[340px] flex-col overflow-hidden rounded-[32px] border border-white/15 bg-slate-950/20 backdrop-blur-3xl shadow-[0_40px_120px_-40px_rgba(15,23,42,0.55)]",
          "origin-bottom-right transition-all duration-200 ease-out",
          open
            ? "h-[500px] scale-100 opacity-100"
            : "pointer-events-none h-0 scale-95 opacity-0",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex h-[64px] shrink-0 items-center justify-between bg-slate-950/10 px-4 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_2px_rgba(45,212,191,0.35)]">
              <img src={hirumiAvatar} alt="Hirumi" className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/hirumi-avatar.svg'; }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">Hirumi</p>
              <p className="flex items-center gap-1 text-[11px] text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Admin Assistant
              </p>
            </div>
          </div>
          <button
            onClick={toggleOpen}
            aria-label="Fold chat"
            aria-controls={panelId}
            className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-950/10 px-3 py-4 backdrop-blur-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "admin" ? "justify-end" : "items-end gap-2"}`}
            >
              {msg.sender === "hirumi" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1.5px_rgba(45,212,191,0.35)]">
                  <img src={hirumiAvatar} alt="" className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/hirumi-avatar.svg'; }}
                  />
                </div>
              )}
              <div
                className={[
                  "max-w-[78%] whitespace-pre-wrap break-words px-4 py-3 text-[13.5px] leading-relaxed",
                  msg.sender === "admin"
                    ? "rounded-3xl rounded-br-sm border border-teal-300/40 bg-gradient-to-br from-teal-500/80 to-cyan-400/80 text-white shadow-[0_18px_40px_-28px_rgba(16,185,129,0.55)] backdrop-blur-sm"
                    : "rounded-3xl rounded-bl-sm border border-white/25 bg-white/80 text-slate-950 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.25)] backdrop-blur-sm",
                ].join(" ")}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1.5px_rgba(45,212,191,0.35)]">
                <img src={hirumiAvatar} alt="" className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/hirumi-avatar.svg'; }}
                />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/20 bg-slate-950/10 px-3 py-2.5 shadow-sm text-slate-100">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
          <div className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-slate-950/10 p-4 backdrop-blur-xl">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hirumi anything about enrollment..."
            rows={1}
            disabled={loading}
            className="max-h-24 flex-1 resize-none rounded-[28px] border border-white/20 bg-slate-950/15 px-4 py-3 text-[13.5px] text-slate-100 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20 disabled:bg-slate-950/10"
          />

          <button
            onClick={sendMessage}
            disabled={!message.trim() || loading}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-[0_16px_40px_-22px_rgba(20,184,166,0.85)] transition hover:scale-[1.05] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2 10l16-7-6 7 6 7-16-7z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* ================= CHAT HEAD BUBBLE ================= */}
      <button
        onClick={toggleOpen}
        aria-label={open ? "Fold Hirumi chat" : "Open Hirumi chat"}
        aria-expanded={open}
        aria-controls={panelId}
        className={[
          "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.6)] transition-transform duration-200",
          "hover:scale-105 active:scale-95 backdrop-blur-xl",
        ].join(" ")}
      >
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {open ? (
          <span className="text-xl text-white" aria-hidden="true">
            ✕
          </span>
        ) : (
          <img src={hirumiAvatar} alt="Open Hirumi chat" className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/hirumi-avatar.svg'; }}
          />
        )}
      </button>
    </div>
  );
}
