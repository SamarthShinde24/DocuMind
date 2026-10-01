import { useState, useRef } from "react";
import { Upload, FileText, Trash2, Loader2, Plus } from "lucide-react";
import { uploadDocument, deleteDocument } from "../api.js";

export default function DocumentPanel({ documents, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
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
      e.target.value = "";
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

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-violet-400" />
          <h2 className="font-semibold text-white">DocuMind</h2>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
          ) : (
            <><Plus className="w-4 h-4" /> Add Document</>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleUpload}
          className="hidden"
        />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No documents yet</p>
            <p className="text-gray-600 text-xs mt-1">Upload a PDF or TXT file</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc}
              className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 group"
            >
              <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span className="text-gray-300 text-sm truncate flex-1">{doc}</span>
              <button
                onClick={() => handleDelete(doc)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-gray-800">
        <p className="text-gray-600 text-xs text-center">
          {documents.length} document{documents.length !== 1 ? "s" : ""} indexed
        </p>
      </div>
    </div>
  );
}
