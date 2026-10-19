import os
from groq import Groq
from .ingest import get_embeddings, get_collection

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "openai/gpt-oss-120b"
TOP_K = 5

DIAGRAM_KEYWORDS = [
    "diagram", "draw", "visualize", "visualise", "chart",
    "flowchart", "mindmap", "mind map", "show me", "illustrate",
    "graph", "map out", "sketch", "plot",
]

def wants_diagram(question: str) -> bool:
    q = question.lower()
    return any(kw in q for kw in DIAGRAM_KEYWORDS)

def build_text_prompt(question: str, chunks: list) -> str:
    context = "\n\n".join(
        f"[Source: {c['source']}]\n{c['text']}"
        for c in chunks
    )
    return f"""You are a helpful assistant answering questions strictly based on document excerpts.

DOCUMENT EXCERPTS:
{context}

USER QUESTION: {question}

Rules:
- Answer ONLY from the excerpts. Do not use outside knowledge.
- Always mention which document(s) your answer comes from.
- If the answer is not found, say: "I couldn't find this in your documents."
- Be concise but complete.

Answer:"""

def build_diagram_prompt(question: str, chunks: list) -> str:
    context = "\n\n".join(
        f"[Source: {c['source']}]\n{c['text']}"
        for c in chunks
    )
    return f"""You are an expert at creating Mermaid.js diagrams from document content.

The user asked: "{question}"

Based on the document excerpts below, respond in EXACTLY this format:

EXPLANATION:
Write 2-3 sentences explaining what the diagram shows and what it is based on.

DIAGRAM:
flowchart TD
    A[First concept] --> B[Second concept]
    B --> C[Third concept]
    A --> D[Another branch]

DOCUMENT EXCERPTS:
{context}

STRICT RULES:
- The DIAGRAM section must contain ONLY raw Mermaid.js syntax
- NO markdown fences (no ```), NO explanation inside DIAGRAM section
- NO tables, NO bullet points inside DIAGRAM section
- Start with a valid Mermaid keyword: flowchart, graph, sequenceDiagram, mindmap, classDiagram
- Max 15 nodes with short labels (under 5 words each)
- Base the diagram on actual document content
- The format must be exactly: EXPLANATION: on one line, then text, then blank line, then DIAGRAM: on one line, then mermaid code"""

def extract_diagram_response(raw: str) -> tuple:
    explanation = ""
    diagram = ""

    if "EXPLANATION:" in raw and "DIAGRAM:" in raw:
        parts = raw.split("DIAGRAM:")
        explanation = parts[0].replace("EXPLANATION:", "").strip()
        diagram = parts[1].strip()
        # Aggressively clean fences
        diagram = diagram.replace("```mermaid", "").replace("```", "").strip()
    else:
        # Fallback — try to find any mermaid-like content
        lines = raw.strip().split("\n")
        mermaid_start = None
        for i, line in enumerate(lines):
            if any(line.strip().startswith(kw) for kw in
                   ["flowchart", "graph ", "sequenceDiagram", "mindmap", "classDiagram"]):
                mermaid_start = i
                break

        if mermaid_start is not None:
            explanation = "\n".join(lines[:mermaid_start]).strip()
            diagram = "\n".join(lines[mermaid_start:]).strip()
        else:
            explanation = raw.strip()

    return explanation, diagram

def query_knowledge_base(question: str, history: list = []) -> dict:
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
            "answer": "No documents found. Please upload some documents first.",
            "sources": [],
            "chunks_used": 0,
            "diagram": None,
            "is_diagram": False,
        }

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

    relevant_chunks = [c for c in chunks if c["distance"] < 0.8]

    if not relevant_chunks:
        return {
            "answer": "I couldn't find relevant information in your documents.",
            "sources": [],
            "chunks_used": 0,
            "diagram": None,
            "is_diagram": False,
        }

    sources = list({c["source"] for c in relevant_chunks})
    is_diagram_request = wants_diagram(question)

    messages = []
    for msg in history[-4:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    client = Groq(api_key=GROQ_API_KEY)

    if is_diagram_request:
        prompt = build_diagram_prompt(question, relevant_chunks)
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=1200,
        )

        raw = response.choices[0].message.content.strip()
        explanation, diagram_code = extract_diagram_response(raw)

        return {
            "answer": explanation,
            "sources": sources,
            "chunks_used": len(relevant_chunks),
            "diagram": diagram_code if diagram_code else None,
            "is_diagram": True,
        }
    else:
        prompt = build_text_prompt(question, relevant_chunks)
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=1000,
        )

        return {
            "answer": response.choices[0].message.content.strip(),
            "sources": sources,
            "chunks_used": len(relevant_chunks),
            "diagram": None,
            "is_diagram": False,
        }
