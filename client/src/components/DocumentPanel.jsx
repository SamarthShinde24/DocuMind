import { useState, useRef } from "react";
import {
  Upload, FileText, Trash2, Loader2,
  Plus, Sparkles, ChevronDown, ChevronUp, X
} from "lucide-react";
import { uploadDocument, deleteDocument, summarizeDocument } from "../api.js";

function DocItem({ doc, onDelete, onSummarize }) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async (e) => {
    e.stopPropagation();
    if (summary) { setExpanded(!expanded); return; }
    setSummarizing(true);
    try {
      const res = await onSummarize(doc);
      setSummary(res.summary);
      setExpanded(true);
    } catch { setSummary("Could not generate summary."); setExpanded(true); }
    finally { setSummarizing(false); }
  };

  return (
    <div className="glass rounded-xl overflow-hidden glass-hover transition-all duration-200">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="bg-violet-500/10 rounded-lg p-1.5 flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <span className="text-sm text-[var(--text-primary)] truncate flex-1 font-medium">
          {doc}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleSummarize}
            title="Summarize"
            className="text-[var(--text-muted)] hover:text-violet-400 transition p-1 rounded"
          >
            {summarizing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : expanded
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <Sparkles className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(doc)}
            title="Delete"
            className="text-[var(--text-muted)] hover:text-red-400 transition p-1 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && summary && (
        <div className="px-3 pb-3">
          <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-2.5">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentPanel({ documents, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(file);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await deleteDocument(filename);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className="w-72 flex flex-col h-full relative z-10"
      style={{ borderRight: "1px solid var(--glass-border)" }}
    >
      {/* Header */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <span className="font-semibold text-[var(--text-primary)]">DocuMind</span>
        </div>

        {/* Drop zone / upload button */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200
            ${dragOver
              ? "border-violet-400 bg-violet-500/10"
              : "border-[var(--glass-border)] hover:border-violet-500/50 hover:bg-violet-500/5"}
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <span className="text-xs text-[var(--text-secondary)]">Indexing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-violet-500/10 rounded-lg p-2">
                <Upload className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Drop files here
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  PDF or TXT · click to browse
                </p>
              </div>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
          className="hidden"
        />
        {error && (
          <div className="flex items-center gap-1 mt-2">
            <X className="w-3 h-3 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {documents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[var(--text-muted)] text-sm">No documents yet</p>
            <p className="text-[var(--text-muted)] text-xs mt-1 opacity-60">
              Upload to start asking questions
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <DocItem
              key={doc}
              doc={doc}
              onDelete={handleDelete}
              onSummarize={summarizeDocument}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="p-3 text-center"
        style={{ borderTop: "1px solid var(--glass-border)" }}
      >
        <span className="mono text-xs text-[var(--text-muted)]">
          {documents.length} doc{documents.length !== 1 ? "s" : ""} indexed
        </span>
      </div>
    </div>
  );
}
