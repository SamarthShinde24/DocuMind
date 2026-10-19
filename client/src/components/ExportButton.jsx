import { Download } from "lucide-react";

export default function ExportButton({ messages }) {
  const handleExport = () => {
    if (messages.length === 0) return;

    const lines = messages.map((m) => {
      if (m.role === "user") {
        return `YOU\n${m.content}\n`;
      }
      const { answer, sources = [] } = m.data || {};
      const srcLine = sources.length
        ? `\nSources: ${sources.join(", ")}`
        : "";
      return `DOCUMIND\n${answer}${srcLine}\n`;
    });

    const content = [
      "DocuMind — Chat Export",
      `Exported: ${new Date().toLocaleString()}`,
      "─".repeat(50),
      "",
      ...lines,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documind-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={messages.length === 0}
      title="Export chat"
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        color: "var(--text-secondary)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)";
        e.currentTarget.style.color = "var(--accent-light)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--glass-border)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      <Download className="w-3.5 h-3.5" />
      Export
    </button>
  );
}
