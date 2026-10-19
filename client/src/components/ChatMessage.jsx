import { useEffect, useRef, useState } from "react";
import { User, Cpu, FileText, Layers, Download, AlertCircle, GitBranch } from "lucide-react";

function InlineDiagram({ code }) {
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code?.trim() || !containerRef.current) return;

    let cancelled = false;

    const render = async () => {
      setLoading(true);
      setError(null);
      setRendered(false);

      try {
        // Load Mermaid if not already loaded
        if (!window.mermaid) {
          await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[src*="mermaid"]');
            if (existing) { resolve(); return; }
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load Mermaid"));
            document.head.appendChild(script);
          });
        }

// Wait for mermaid to be fully ready
await new Promise(r => setTimeout(r, 800));
if (!window.mermaid?.initialize) {
  await new Promise(r => setTimeout(r, 1000));
}

        if (cancelled) return;
        if (!window.mermaid?.initialize) {
  throw new Error("Mermaid library not ready. Please try again.");
}
window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          themeVariables: {
            background: "#0f0f1a",
            primaryColor: "#7c3aed",
            primaryTextColor: "#f1f0ff",
            primaryBorderColor: "#a78bfa",
            lineColor: "#7c6aed",
            secondaryColor: "#1a1a2e",
            tertiaryColor: "#13131f",
            nodeTextColor: "#f1f0ff",
            mainBkg: "#1a1a2e",
            nodeBorder: "#7c3aed",
            clusterBkg: "#1a1a2e",
            titleColor: "#a78bfa",
            edgeLabelBackground: "#1a1a2e",
          },
        });

        // Clean the code one more time
        const cleanCode = code
          .replace(/```mermaid/gi, "")
          .replace(/```/g, "")
          .trim();

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const { svg } = await window.mermaid.render(id, cleanCode);

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;

        // Make responsive
        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("height");
          svgEl.style.width = "100%";
          svgEl.style.maxHeight = "420px";
          svgEl.style.height = "auto";
        }

        setRendered(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Mermaid error:", err);
          setError(`Render failed: ${err.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [code]);

  const handleDownload = () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-xl overflow-hidden mt-3"
      style={{
        background: "rgba(124,58,237,0.05)",
        border: "1px solid rgba(124,58,237,0.2)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-medium" style={{ color: "var(--accent-light)" }}>
            Generated Diagram
          </span>
        </div>
        {rendered && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "var(--accent-light)",
            }}
          >
            <Download className="w-3 h-3" />
            Save SVG
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && !rendered && (
          <div className="flex items-center justify-center gap-2 py-8">
            <span className="dot w-2 h-2 rounded-full bg-violet-400 inline-block" />
            <span className="dot w-2 h-2 rounded-full bg-violet-400 inline-block" />
            <span className="dot w-2 h-2 rounded-full bg-violet-400 inline-block" />
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-400 mb-2">{error}</p>
              <pre
                className="text-xs overflow-auto rounded p-2"
                style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-muted)", maxHeight: "120px" }}
              >
                {code}
              </pre>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          style={{ display: rendered ? "block" : "none" }}
        />
      </div>
    </div>
  );
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 message-enter">
        <div
          className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-[72%]"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            boxShadow: "0 4px 20px rgba(124,58,237,0.25)",
          }}
        >
          <p className="text-sm text-white leading-relaxed">{message.content}</p>
        </div>
        <div
          className="rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
      </div>
    );
  }

  const { answer, sources = [], chunks_used, diagram, is_diagram } = message.data || {};

  return (
    <div className="flex gap-3 message-enter">
      <div
        className="rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.3))",
          border: "1px solid rgba(124,58,237,0.4)",
        }}
      >
        <Cpu className="w-4 h-4 text-violet-400" />
      </div>

      <div
        className="glass rounded-2xl rounded-tl-sm px-4 py-4 space-y-3"
        style={{
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          maxWidth: diagram ? "85%" : "72%",
        }}
      >
        {/* Answer text */}
        {answer && (
          <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
        )}

        {/* Inline diagram */}
        {diagram && <InlineDiagram code={diagram} />}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <span
                  key={i}
                  className="mono inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    color: "var(--accent-light)",
                  }}
                >
                  <FileText className="w-3 h-3" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 flex-wrap">
          {chunks_used != null && (
            <p className="mono text-xs" style={{ color: "var(--text-muted)" }}>
              {chunks_used} chunk{chunks_used !== 1 ? "s" : ""} retrieved
            </p>
          )}
          {is_diagram && (
            <span
              className="mono text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.15)",
                color: "var(--accent-light)",
              }}
            >
              diagram mode
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
