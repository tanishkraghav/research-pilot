import os
import uuid
from typing import List, Dict, Any
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.schema import Document

from app.core.config import settings


class VectorStoreManager:
    def __init__(self):
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        os.makedirs(settings.upload_dir, exist_ok=True)

        # 100% free — runs on CPU
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        self.store = Chroma(
            collection_name="researchpilot_docs",
            embedding_function=self.embeddings,
            persist_directory=settings.chroma_persist_dir,
        )

    def add_document(self, file_path: str, filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(filename)[1].lower()
        loader = PyPDFLoader(file_path) if ext == ".pdf" else TextLoader(file_path, encoding="utf-8")
        raw = loader.load()
        chunks = self.splitter.split_documents(raw)
        doc_id = str(uuid.uuid4())
        for chunk in chunks:
            chunk.metadata.update({"doc_id": doc_id, "filename": filename})
        self.store.add_documents(chunks)
        return {"doc_id": doc_id, "filename": filename, "chunks": len(chunks)}

    def similarity_search(self, query: str, k: int = 5) -> List[Document]:
        retriever = self.store.as_retriever(
            search_type="mmr",
            search_kwargs={"k": k, "fetch_k": k * 3},
        )
        return retriever.invoke(query)

    def list_documents(self) -> List[str]:
        col = self.store._collection
        data = col.get(limit=2000)
        return list(set(
            m.get("filename", "unknown")
            for m in (data.get("metadatas") or [])
        ))

    def delete_document(self, filename: str) -> bool:
        col = self.store._collection
        res = col.get(where={"filename": filename})
        if res["ids"]:
            col.delete(ids=res["ids"])
            return True
        return False


vector_store = VectorStoreManager()
