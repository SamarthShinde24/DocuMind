import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Brain, Trash2 } from "lucide-react";
import DocumentPanel from "./components/DocumentPanel.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import ExportButton from "./components/ExportButton.jsx";
import { getDocuments, queryKnowledgeBase } from "./api.js";

const SUGGESTED = [
  "What are the main topics in my documents?",
  "Summarize the key points across all documents.",
  "What are the most important conclusions?",
  "List any action items or recommendations.",
];

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async (question) => {
    if (!question.trim() || loading) return;
    setInput("");
    setError(null);

    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content || m.data?.answer || "",
      }));
      const result = await queryKnowledgeBase(question, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, data: result },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="h-screen flex relative z-10">
      {/* Left — Document Panel */}
      <DocumentPanel documents={documents} onRefresh={fetchDocuments} />

      {/* Right — Chat */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(109,40,217,0.4))",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <Brain className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Ask your documents
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Answers grounded in your knowledge base
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton messages={messages} />
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                className="p-1.5 rounded-lg transition"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 pb-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(109,40,217,0.2))",
                  border: "1px solid rgba(124,58,237,0.2)",
                  boxShadow: "0 0 40px rgba(124,58,237,0.1)",
                }}
              >
                <Brain className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {documents.length === 0
                    ? "Upload a document to begin"
                    : "Your knowledge base is ready"}
                </h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {documents.length === 0
                    ? "Add PDFs or text files from the left panel"
                    : `${documents.length} document${documents.length !== 1 ? "s" : ""} indexed · ask anything`}
                </p>
              </div>

              {documents.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleAsk(q)}
                      className="glass glass-hover text-sm px-4 py-2 rounded-full transition-all duration-200"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {loading && (
            <div className="flex gap-3 message-enter">
              <div
                className="rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.3))",
                  border: "1px solid rgba(124,58,237,0.4)",
                }}
              >
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              </div>
              <div
                className="glass rounded-2xl rounded-tl-sm px-4 py-4 flex items-center gap-1.5"
              >
                <span className="dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                <span className="dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                <span className="dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
              </div>
            </div>
          )}

          {error && (
            <p
              className="text-center text-sm py-2 px-4 rounded-lg mx-auto"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                maxWidth: "400px",
              }}
            >
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          <div
            className="flex gap-3 glass rounded-2xl px-4 py-3 transition-all duration-200"
            style={{ "--tw-ring-color": "rgba(124,58,237,0.3)" }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk(input)}
              placeholder="Ask anything about your documents..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
              style={{
                color: "var(--text-primary)",
                caretColor: "var(--accent-light)",
              }}
            />
            <button
              onClick={() => handleAsk(input)}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                  : "var(--glass-bg)",
                boxShadow: input.trim() ? "0 4px 12px rgba(124,58,237,0.4)" : "none",
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p
            className="text-center text-xs mt-2"
            style={{ color: "var(--text-muted)" }}
          >
            Answers are grounded in your documents only
          </p>
        </div>
      </div>
    </div>
  );
}
