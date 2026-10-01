import { User, Bot, FileText } from "lucide-react";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="bg-violet-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[75%]">
          <p className="text-sm">{message.content}</p>
        </div>
        <div className="bg-gray-700 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-300" />
        </div>
      </div>
    );
  }

  const { answer, sources = [], chunks_used } = message.data || {};

  return (
    <div className="flex gap-3">
      <div className="bg-violet-900 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-4 h-4 text-violet-400" />
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[75%] space-y-3">
        <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">
          {answer}
        </p>

        {sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
              Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-gray-700 text-violet-300 text-xs px-2 py-1 rounded-full"
                >
                  <FileText className="w-3 h-3" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}

        {chunks_used != null && (
          <p className="text-gray-600 text-xs">
            {chunks_used} relevant chunk{chunks_used !== 1 ? "s" : ""} retrieved
          </p>
        )}
      </div>
    </div>
  );
}
