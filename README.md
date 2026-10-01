# DocuMind (RAG)

A NotebookLM-lite clone — upload your PDFs and text files, ask questions, get answers cited from your own documents. Built with a real RAG pipeline, not just prompt-wrapping.

## How it works

1. Upload PDFs/TXT files via the React UI
2. Python backend extracts text, splits into chunks (500 words, 50 word overlap)
3. Each chunk is embedded using `sentence-transformers/all-MiniLM-L6-v2` (free, runs locally)
4. Embeddings stored in ChromaDB (persistent local vector database)
5. User asks a question → question is embedded → top-5 most similar chunks retrieved via cosine similarity
6. Retrieved chunks + question sent to Groq LLM → grounded answer with source citations
7. Frontend renders answer with source document badges and chunk count

## Why this is real RAG

- **Local embeddings** — no API cost for embedding, runs on your machine
- **Semantic retrieval** — finds relevant chunks by meaning, not keyword matching
- **Grounded generation** — LLM is explicitly forbidden from using outside knowledge
- **Source citations** — every answer shows which document it came from
- **Hallucination guard** — chunks with distance > 0.8 are filtered out before sending to LLM
- **Conversation memory** — last 4 turns of chat history included in each request

## Tech stack

- **Backend** — Python + FastAPI
- **Embeddings** — sentence-transformers (all-MiniLM-L6-v2, free, local)
- **Vector DB** — ChromaDB (persistent, local, no account needed)
- **LLM** — Groq API (free tier)
- **Chunking** — LangChain RecursiveCharacterTextSplitter
- **Frontend** — React + Vite + Tailwind CSS + Lucide icons

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # add GROQ_API_KEY
uvicorn main:app --reload
```

### Frontend (new terminal)
```bash
cd client
npm install
npm run dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`.

## Future improvements

- Add support for `.docx` and `.md` files
- Semantic chunking (split by meaning, not just character count)
- Show the exact chunk text that was used to answer
- Add a "confidence score" based on retrieval distance
- Deploy backend to Railway, frontend to Vercel
