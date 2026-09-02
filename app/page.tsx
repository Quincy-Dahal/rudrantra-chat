"use client";

import Image from "next/image";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  time: string;
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
      content: "Namaste! I'm Gyaan. Ask me anything about Rudraksha beads, their meanings, and our products.",
      time: formatTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function handleSend(overrideText?: string) {
    const text = overrideText ?? input;
    if (!text.trim() || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, time: formatTime() },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/conversations/send-message/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            // Only include conversation_id once we have one - the first
            // message in a fresh visit should start a new conversation.
            ...(conversationId ? { conversation_id: conversationId } : {}),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, time: formatTime() },
      ]);
    } catch (error) {
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
    } finally {
      setIsLoading(false);
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
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
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
                    li: ({ children }) => (
                      <li className="mb-0.5">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
              <span className="mt-1 px-1 text-[10px] text-[#a89a8a]">{m.time}</span>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="rounded-2xl border border-[#f0e6d8] bg-white px-4 py-2.5 text-sm text-[#651216]">
                Thinking...
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
              stroke="currentColor"
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