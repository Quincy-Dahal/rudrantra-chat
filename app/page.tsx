"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, ThumbsUp, ThumbsDown, X, RotateCcw } from "lucide-react";

type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  time: string;
  feedback?: "up" | "down" | null;
};

const QUICK_ACTIONS = [
  { label: "Browse Products", message: "What products do you have?" },
  { label: "Shipping & Returns", message: "What is your shipping and return policy?" },
];

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Configurable so this can point at a real hosted backend later (Phase 7)
// without touching code - just set NEXT_PUBLIC_API_URL in .env.local.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Namaste! I'm Gyaan. Ask me anything about Rudraksha beads, their meanings, and our products.",
      time: formatTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function handleSend(overrideText?: string) {
    const text = overrideText ?? input;
    if (!text.trim() || isLoading) return;

    setWasCancelled(false);
    setLastUserMessage(text);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, time: formatTime() },
    ]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `${API_URL}/api/conversations/send-message/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            ...(conversationId ? { conversation_id: conversationId } : {}),
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id,
          role: "assistant",
          content: data.reply,
          time: formatTime(),
          feedback: null,
        },
      ]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled on purpose - show a retry affordance, not an error.
        setWasCancelled(true);
      } else {
        console.error("Failed to reach Gyaan backend:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
            time: formatTime(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  function handleRetry() {
    if (!lastUserMessage) return;
    // Drop the message we're retrying so handleSend can re-add it cleanly,
    // instead of ending up with two copies of the same question.
    setMessages((prev) => prev.slice(0, -1));
    setWasCancelled(false);
    handleSend(lastUserMessage);
  }

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  async function handleFeedback(index: number, value: "up" | "down") {
    const target = messages[index];
    if (!target.id) return; // shouldn't happen for a real bot reply, but be safe

    const newValue = target.feedback === value ? null : value;

    // Update immediately so the UI feels instant, then confirm with the server.
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, feedback: newValue } : m))
    );

    try {
      const response = await fetch(
        `${API_URL}/api/messages/${target.id}/feedback/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: newValue }),
        }
      );
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to save feedback:", error);
      // Revert the optimistic update since it didn't actually save.
      setMessages((prev) =>
        prev.map((m, i) =>
          i === index ? { ...m, feedback: target.feedback } : m
        )
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5F2] p-6">
      <div className="flex h-[680px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#e8ddd0] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#f0e6d8] bg-white px-5 py-4">
          <div className="relative">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-[#9B1B1F]">
              <Image
                src="/logo.jpeg"
                alt="Rudrantra"
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#4CAF50]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#9B1B1F]">Gyaan</h1>
            <p className="text-xs text-[#651216]">Your Rudraksha guide</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-[#FBF9F6] px-4 py-4">
          <div className="flex justify-center">
            <span className="rounded-full bg-[#F0E6D8] px-3 py-1 text-xs text-[#651216]">
              Today
            </span>
          </div>

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-[#9B1B1F] text-white"
                    : "border border-[#f0e6d8] bg-white text-[#252525]"
                }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-1.5 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-1.5 ml-4 list-disc last:mb-0">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-1.5 ml-4 list-decimal last:mb-0">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>

              <div className="mt-1 flex items-center gap-2 px-1">
                <span className="text-[10px] text-[#a89a8a]">{m.time}</span>

                {m.role === "assistant" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(m.content, i)}
                      title="Copy"
                      className="rounded p-1 text-[#a89a8a] hover:bg-[#F0E6D8] hover:text-[#651216]"
                    >
                      {copiedIndex === i ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => handleFeedback(i, "up")}
                      title="Good response"
                      className={`rounded p-1 hover:bg-[#F0E6D8] ${
                        m.feedback === "up"
                          ? "text-[#9B1B1F]"
                          : "text-[#a89a8a] hover:text-[#651216]"
                      }`}
                    >
                      <ThumbsUp
                        size={12}
                        fill={m.feedback === "up" ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      onClick={() => handleFeedback(i, "down")}
                      title="Poor response"
                      className={`rounded p-1 hover:bg-[#F0E6D8] ${
                        m.feedback === "down"
                          ? "text-[#9B1B1F]"
                          : "text-[#a89a8a] hover:text-[#651216]"
                      }`}
                    >
                      <ThumbsDown
                        size={12}
                        fill={m.feedback === "down" ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 rounded-2xl border border-[#f0e6d8] bg-white px-4 py-2.5 text-sm text-[#651216]">
                <span>Thinking...</span>
                <button
                  onClick={handleCancel}
                  title="Cancel"
                  className="rounded-full p-0.5 text-[#a89a8a] hover:bg-[#F0E6D8] hover:text-[#9B1B1F]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {wasCancelled && !isLoading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 rounded-2xl border border-[#e8ddd0] bg-[#F0E6D8] px-4 py-2.5 text-sm text-[#651216]">
                <span>Request cancelled.</span>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 rounded-full border border-[#C6A15B] px-2 py-0.5 text-xs font-medium text-[#9B1B1F] hover:bg-white"
                >
                  <RotateCcw size={11} />
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 border-t border-[#f0e6d8] bg-white px-4 py-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(action.message)}
              disabled={isLoading}
              className="rounded-full border border-[#C6A15B] px-3 py-1.5 text-xs font-medium text-[#9B1B1F] hover:bg-[#FBF3E2] disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-[#f0e6d8] bg-white px-3 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 rounded-full border border-[#e8ddd0] bg-[#FBF9F6] px-4 py-2.5 text-sm text-[#252525] outline-none focus:border-[#C6A15B]"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C6A15B] text-[#651216] disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              strokegit ="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Footer disclaimer */}
        <div className="flex items-center justify-between border-t border-[#f5eee2] bg-white px-4 py-2">
          <span className="text-[10px] text-[#a89a8a]">
            Gyaan can make mistakes. Verify important details.
          </span>
          <span className="text-[10px] font-medium text-[#9B1B1F]">Rudrantra</span>
        </div>
      </div>
    </main>
  );
}