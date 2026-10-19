import os
from groq import Groq
from .ingest import get_collection

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "openai/gpt-oss-120b"

def summarize_document(filename: str) -> dict:
    """Retrieve all chunks for a document and generate a summary."""
    collection = get_collection()
    results = collection.get(
        where={"source": filename},
        include=["documents"],
    )

    if not results["documents"]:
        raise ValueError(f"No chunks found for {filename}")

    # Take first 8 chunks (~4000 chars) to keep prompt small
    sample_text = "\n\n".join(results["documents"][:8])

    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": f"""Summarize the following document excerpts in 3-4 concise sentences. 
Focus on the main topic, key points, and conclusions.

DOCUMENT: {filename}
EXCERPTS:
{sample_text}

Summary:"""
        }],
        temperature=0.3,
        max_tokens=200,
    )

    return {
        "filename": filename,
        "summary": response.choices[0].message.content.strip(),
    }
