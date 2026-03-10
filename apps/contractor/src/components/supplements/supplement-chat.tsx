"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  Wrench,
} from "lucide-react";

/* ─── Types ─── */

interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: unknown;
  tool_results?: unknown;
  created_at: string;
}

export interface SupplementChatProps {
  supplementId: string;
  initialMessages: ChatMessageData[];
}

interface MutationResult {
  success: boolean;
  message: string;
  mutation?: { type: string };
}

interface MutationPayload {
  type: string;
  field?: string;
  newValue?: unknown;
  itemId?: string;
}

/* ─── Helpers ─── */

function formatMutation(m: MutationPayload): string {
  switch (m.type) {
    case "update_item":
      return `Updated ${m.field} to ${m.newValue}`;
    case "add_item":
      return "Added new line item";
    case "remove_item":
      return "Removed line item";
    case "update_measurement":
      return `Updated ${m.field} to ${m.newValue}`;
    case "update_cover_letter":
      return `Updated cover letter ${m.field}`;
    default:
      return m.type;
  }
}

/* ─── ChatMessage sub-component ─── */

function ChatMessage({
  message,
}: {
  message: {
    role: string;
    content: string;
    tool_results?: unknown;
  };
}) {
  const isUser = message.role === "user";

  const toolResults = message.tool_results as MutationResult[] | null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {/* Tool execution badges — only on assistant messages */}
        {!isUser && toolResults && toolResults.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {toolResults.map((tr, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  tr.success
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <Wrench className="h-3 w-3" />
                {tr.message}
              </span>
            ))}
          </div>
        )}

        {/* Message content with whitespace preserved */}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export function SupplementChat({
  supplementId,
  initialMessages,
}: SupplementChatProps) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    // Optimistically append user message
    const tempId = `temp-${Date.now()}`;
    const userMsg: ChatMessageData = {
      id: tempId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/supplements/${supplementId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send message");
        // Roll back the optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const assistantMsg: ChatMessageData = {
        id: data.messageId || `resp-${Date.now()}`,
        role: "assistant",
        content: data.response,
        tool_results: data.mutations?.map((m: MutationPayload) => ({
          success: true,
          message: formatMutation(m),
        })),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If the AI mutated supplement data, refresh server components
      if (data.mutations && data.mutations.length > 0) {
        router.refresh();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message"
      );
      // Roll back the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  return (
    <Card className="mt-6">
      {/* Collapsible header */}
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle className="text-lg">Chat with 4Margin</CardTitle>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {messages.length} {messages.length === 1 ? "message" : "messages"}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />

          {/* Message list */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto mb-4 pr-2">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Ask me anything about this supplement. I can edit items, rewrite
                justifications, explain confidence scores, and more.
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={scrollRef} />
          </div>

          {/* Input bar */}
          <form onSubmit={handleSend} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask 4Margin to edit items, rewrite justifications, explain scores..."
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
