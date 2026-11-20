import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import hirumiAvatar from "../../assets/hirumi-avatar.png";
import { apiUrl } from "../../config";

const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_HIRUMI_API_URL) ||
  apiUrl("/backend-online-enrollment/ai/php/chat.php");
const GREETING_DURATION_MS = 2600;
const GREETING_COOLDOWN_MS = 180000;

const INITIAL_MESSAGE = {
  id: "welcome",
  sender: "hirumi",
  text: "Hello I'm Hirumi 🤖 Ask me about enrollment rules, requirements, or anything educational I can help with.",
};

const PUBLIC_INITIAL_MESSAGE = {
  id: "welcome",
  sender: "hirumi",
  text: "Hi! I'm Hirumi. Ask me about creating an account, completing this form, required documents, or uploads. I can't see personal application status or live enrollment records. For concerns I can't answer, please contact the school staff.",
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Hirumi({ role = "admin", userId = "", publicAccess = false, enableGreeting = false }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setError] = useState(null);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState(() => [
    publicAccess ? PUBLIC_INITIAL_MESSAGE : INITIAL_MESSAGE,
  ]);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });

  const prefersReducedMotion = useReducedMotion();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const greetingAnimationTimerRef = useRef(null);
  const greetingCooldownTimerRef = useRef(null);
  const nextGreetingAtRef = useRef(null);
  const dragState = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const panelId = publicAccess ? "hirumi-enrollment-panel" : `hirumi-${role}-panel`;

  const clamp = useCallback((value, min, max) => Math.min(Math.max(value, min), max), []);

  useEffect(() => {
    if (!enableGreeting) return undefined;

    const clearGreetingTimers = () => {
      if (greetingAnimationTimerRef.current !== null) {
        window.clearTimeout(greetingAnimationTimerRef.current);
        greetingAnimationTimerRef.current = null;
      }
      if (greetingCooldownTimerRef.current !== null) {
        window.clearTimeout(greetingCooldownTimerRef.current);
        greetingCooldownTimerRef.current = null;
      }
    };

    if (open || hasInteracted) {
      clearGreetingTimers();
      setGreetingVisible(false);
      return clearGreetingTimers;
    }

    const startGreeting = () => {
      greetingCooldownTimerRef.current = null;
      setGreetingVisible(true);
      greetingAnimationTimerRef.current = window.setTimeout(() => {
        greetingAnimationTimerRef.current = null;
        setGreetingVisible(false);
        nextGreetingAtRef.current = Date.now() + GREETING_COOLDOWN_MS;
        greetingCooldownTimerRef.current = window.setTimeout(
          startGreeting,
          GREETING_COOLDOWN_MS,
        );
      }, GREETING_DURATION_MS);
    };

    if (nextGreetingAtRef.current === null) {
      startGreeting();
    } else {
      const delay = Math.max(0, nextGreetingAtRef.current - Date.now());
      greetingCooldownTimerRef.current = window.setTimeout(startGreeting, delay);
    }

    return clearGreetingTimers;
  }, [enableGreeting, hasInteracted, open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: clamp(prev.x, 12, Math.max(window.innerWidth - 84, 12)),
        y: clamp(prev.y, 12, Math.max(window.innerHeight - 84, 12)),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clamp]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragState.current.active || event.pointerId !== dragState.current.pointerId) return;

      const { startX, startY, originX, originY } = dragState.current;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragState.current.moved = true;
      }

      setPosition({
        x: clamp(originX + deltaX, 12, Math.max(window.innerWidth - 84, 12)),
        y: clamp(originY + deltaY, 12, Math.max(window.innerHeight - 84, 12)),
      });
    };

    const handlePointerUp = (event) => {
      if (!dragState.current.active || event.pointerId !== dragState.current.pointerId) return;
      dragState.current.active = false;
      dragState.current.pointerId = null;
      document.body.style.userSelect = "";
    };

    const handlePointerCancel = (event) => {
      handlePointerUp(event);
      dragState.current.moved = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      if (dragState.current.active) {
        dragState.current.active = false;
        dragState.current.pointerId = null;
        document.body.style.userSelect = "";
      }
    };
  }, [clamp]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleHeadPointerDown = (event) => {
    if (event.button !== 0) return;

    dragState.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };

    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHeadClick = (event) => {
    if (dragState.current.moved) {
      dragState.current.moved = false;
      event.preventDefault();
      return;
    }
    toggleOpen();
  };

  const sendMessage = useCallback(async () => {
    const text = message.trim();
    if (!text || loading) return;

    setError(null);
    setHasInteracted(true);
    setMessages((prev) => [...prev, { id: uid(), sender: "admin", text }]);
    setMessage("");
    setLoading(true);

    try {
      const conversation = messages
        .filter((item) => item.id !== "welcome")
        .slice(-12)
        .map((item) => ({
          role: item.sender === "hirumi" ? "assistant" : "user",
          content: item.text,
        }));
      const payload = publicAccess
        ? { message: text, role: "student" }
        : { message: text, role, user_id: userId, conversation };
      if (!publicAccess && role === "student") payload.student_id = userId;
      else if (!publicAccess && role === "staff") payload.staff_id = userId;
      else if (!publicAccess && role === "admin") payload.admin_id = userId;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        ...(publicAccess ? { credentials: "omit" } : {}),
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
        const failText = data?.code === 429 || response.status === 429
          ? "Hirumi is temporarily busy. Please try again shortly."
          : data?.message || raw || "Sorry, I couldn't process that request.";
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
  }, [message, loading, userId, role, open, messages, publicAccess]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none font-sans"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto absolute"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="relative">
          <AnimatePresence>
          {open && (
            <motion.div
              id={panelId}
              role="dialog"
              aria-label={`Hirumi ${publicAccess ? "enrollment" : role} assistant`}
              aria-hidden={!open}
              initial={{ opacity: 0, y: -28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="absolute bottom-[72px] right-0 flex w-[calc(100vw-2rem)] max-w-[340px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-slate-850/30 backdrop-blur-xl shadow-[0_40px_120px_-40px_rgba(15,23,42,0.55)]"
            >
              <div className="flex h-[64px] shrink-0 items-center justify-between bg-slate-950/10 px-4 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_2px_rgba(45,212,191,0.35)]">
                    <img src={hirumiAvatar} alt="Hirumi" className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/hirumi-avatar.svg'; }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-black">Hirumi</p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Assistant
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

              <div className="flex h-[500px] max-h-[70vh] flex-1 flex-col bg-slate-950/10 backdrop-blur-sm">
                <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
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
                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/20 bg-slate-950/0 px-3 py-2.5 shadow-sm text-slate-100">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-slate-950/10 p-4 backdrop-blur-xl">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Hirumi anything about enrollment..."
                    rows={1}
                    disabled={loading}
                    style={{ height: "46px", maxHeight: "120px", overflowY: "auto" }}
                    className="flex-1 resize-none rounded-[28px] border border-white/20 bg-slate-950/15 px-4 py-3 text-[13.5px] text-slate-100 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20 disabled:bg-slate-950/10"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || loading}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-[0_16px_40px_-22px_rgba(20,184,166,0.85)] transition hover:scale-[1.05] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M3 3l18 7-18 7 4-7-4-7z" fill="currentColor" />
                      <path d="M7 10h14" stroke="white" strokeOpacity="0.35" strokeWidth="1.25" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {greetingVisible && !open && (
            <div
              role="status"
              className="pointer-events-none absolute bottom-[calc(100%+0.75rem)] right-0 w-max rounded-2xl border border-[#d6ead2] bg-white px-4 py-2 text-sm font-semibold text-[#155000] shadow-lg"
              style={{ maxWidth: "min(280px, calc(100vw - 24px))" }}
            >
              Hi! I'm Assistant Hirumi
            </div>
          )}

          <button
            type="button"
            onPointerDown={handleHeadPointerDown}
            onClick={handleHeadClick}
            aria-label={open ? "Fold Hirumi chat" : "Open Hirumi chat"}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={panelId}
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-slate-950/20 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.6)] transition-colors duration-200 hover:border-white/60 active:brightness-95 backdrop-blur-3xl"
            style={{ touchAction: "none" }}
          >
            {!open && unread > 0 && (
              <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            {open ? (
              <span className="text-xl text-white" aria-hidden="true">✕</span>
            ) : (
              <motion.img
                src={hirumiAvatar}
                alt="Open Hirumi chat"
                className="h-full w-full object-cover"
                animate={{ rotate: greetingVisible && !prefersReducedMotion ? 360 : 0 }}
                transition={{
                  duration: greetingVisible && !prefersReducedMotion ? GREETING_DURATION_MS / 1000 : 0,
                  ease: [0.45, 0, 0.55, 1],
                }}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/hirumi-avatar.svg'; }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
