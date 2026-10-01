import os
from groq import Groq
from .ingest import get_embeddings, get_collection

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "openai/gpt-oss-120b"
TOP_K = 5  # number of chunks to retrieve

def build_prompt(question: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[Source: {c['source']}]\n{c['text']}"
        for c in chunks
    )

    return f"""You are a helpful assistant that answers questions strictly based on the provided document excerpts below.

DOCUMENT EXCERPTS:
{context}

USER QUESTION: {question}

Rules:
- Answer ONLY from the excerpts above. Do not use outside knowledge.
- Always mention which document(s) your answer comes from.
- If the answer is not in the excerpts, say clearly: "I couldn't find this in your documents."
- Be concise but complete.

Answer:"""

def query_knowledge_base(question: str, history: list = []) -> dict:
    """
    Full RAG pipeline:
    1. Embed the question
    2. Find top-K similar chunks from ChromaDB
    3. Send chunks + question to LLM
    4. Return answer + citations
    """
    embeddings_model = get_embeddings()
    question_embedding = embeddings_model.embed_query(question)

    collection = get_collection()
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=TOP_K,
        include=["documents", "metadatas", "distances"],
    )

    if not results["documents"] or not results["documents"][0]:
        return {
            "answer": "No documents found in your knowledge base. Please upload some documents first.",
            "sources": [],
            "chunks_used": 0,
        }

    # Build context chunks with source info
    chunks = [
        {
            "text": doc,
            "source": meta["source"],
            "distance": dist,
        }
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )
    ]

    # Only use chunks with reasonable similarity (distance < 0.8)
    relevant_chunks = [c for c in chunks if c["distance"] < 0.8]

    if not relevant_chunks:
        return {
            "answer": "I couldn't find relevant information in your documents for this question.",
            "sources": [],
            "chunks_used": 0,
        }

    prompt = build_prompt(question, relevant_chunks)

    # Build messages with optional chat history
    messages = []
    for msg in history[-4:]:  # keep last 4 turns for context
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": prompt})

    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=1000,
    )

    answer = response.choices[0].message.content.strip()
    sources = list({c["source"] for c in relevant_chunks})

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(relevant_chunks),
    }
