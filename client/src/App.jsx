import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Brain } from "lucide-react";
import DocumentPanel from "./components/DocumentPanel.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import { getDocuments, queryKnowledgeBase } from "./api.js";

const SUGGESTED = [
  "What are the main topics covered in my documents?",
  "Summarize the key points across all documents.",
  "What conclusions can you draw from the uploaded content?",
];

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

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
    }
  };

  return (
    <div className="h-screen bg-gray-950 flex">
      {/* Left panel — documents */}
      <DocumentPanel documents={documents} onRefresh={fetchDocuments} />

      {/* Right panel — chat */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
          <Brain className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-white font-semibold">DocuMind</h1>
            <p className="text-gray-500 text-xs">
              Ask anything — answers are grounded in your documents
            </p>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium mb-2">
                {documents.length === 0
                  ? "Upload documents to get started"
                  : "Your DocuMind is ready"}
              </p>
              <p className="text-gray-600 text-sm mb-8">
                {documents.length === 0
                  ? "Add PDFs or text files from the left panel"
                  : `${documents.length} document${documents.length !== 1 ? "s" : ""} indexed — ask anything`}
              </p>
              {documents.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleAsk(q)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-full border border-gray-700 transition"
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
            <div className="flex gap-3">
              <div className="bg-violet-900 rounded-full p-2 h-8 w-8 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-red-400 text-sm">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk(input)}
              placeholder="Ask a question about your documents..."
              disabled={loading}
              className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50"
            />
            <button
              onClick={() => handleAsk(input)}
              disabled={loading || !input.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
