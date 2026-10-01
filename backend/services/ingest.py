import os
import hashlib
from pathlib import Path
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
import chromadb

# Persistent ChromaDB stored in /backend/chroma_db/
CHROMA_PATH = Path(__file__).parent.parent / "chroma_db"
COLLECTION_NAME = "knowledge_base"

# Free local embedding model — no API key needed
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

def get_embeddings():
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

def get_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from a PDF file buffer."""
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()

def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore").strip()

def chunk_text(text: str, source: str):
    """Split text into overlapping chunks for better retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "],
    )
    chunks = splitter.create_documents(
        [text],
        metadatas=[{"source": source}]
    )
    return chunks

def ingest_document(file_bytes: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
    1. Extract text
    2. Chunk
    3. Embed
    4. Store in ChromaDB
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(file_bytes)
    elif ext == ".txt":
        text = extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Use PDF or TXT.")

    if len(text) < 50:
        raise ValueError("Could not extract meaningful text from the document.")

    chunks = chunk_text(text, source=filename)

    # Generate stable IDs so re-uploading the same file doesn't duplicate
    ids = [
        hashlib.md5(f"{filename}_{i}_{chunk.page_content[:50]}".encode()).hexdigest()
        for i, chunk in enumerate(chunks)
    ]

    embeddings_model = get_embeddings()
    texts = [c.page_content for c in chunks]
    metadatas = [c.metadata for c in chunks]
    embeddings = embeddings_model.embed_documents(texts)

    collection = get_collection()
    collection.upsert(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return {
        "filename": filename,
        "chunks": len(chunks),
        "characters": len(text),
    }

def list_documents() -> list:
    """Return unique source documents stored in ChromaDB."""
    collection = get_collection()
    result = collection.get(include=["metadatas"])
    sources = list({m["source"] for m in result["metadatas"]}) if result["metadatas"] else []
    return sorted(sources)

def delete_document(filename: str) -> int:
    """Delete all chunks belonging to a document."""
    collection = get_collection()
    results = collection.get(where={"source": filename}, include=["metadatas"])
    if not results["ids"]:
        return 0
    collection.delete(ids=results["ids"])
    return len(results["ids"])
