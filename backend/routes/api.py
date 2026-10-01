from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.ingest import ingest_document, list_documents, delete_document
from services.query import query_knowledge_base

router = APIRouter()

# ── Ingest ──────────────────────────────────────────────
@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed = {".pdf", ".txt"}
    ext = "." + file.filename.split(".")[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, "Only PDF and TXT files are supported.")

    contents = await file.read()
    try:
        result = ingest_document(contents, file.filename)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Ingestion failed: {str(e)}")

@router.get("/documents")
def get_documents():
    return {"documents": list_documents()}

@router.delete("/documents/{filename}")
def remove_document(filename: str):
    deleted = delete_document(filename)
    if deleted == 0:
        raise HTTPException(404, "Document not found.")
    return {"deleted": filename, "chunks_removed": deleted}

# ── Query ───────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str
    history: list = []

@router.post("/query")
def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")
    try:
        result = query_knowledge_base(req.question, req.history)
        return result
    except Exception as e:
        raise HTTPException(500, f"Query failed: {str(e)}")
