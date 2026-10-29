import io
import re
import hashlib
from typing import List, Dict, Any, Tuple
from app.core.config import settings

class DocumentService:
    def __init__(self):
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP

    def calculate_hash(self, content_bytes: bytes) -> str:
        return hashlib.sha256(content_bytes).hexdigest()

    def parse_document(self, filename: str, content_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Parses document bytes based on file extension.
        Returns a list of dicts: [{"text": str, "page": Optional[int]}]
        """
        ext = filename.lower().split(".")[-1]
        if ext == "pdf":
            return self._parse_pdf(content_bytes)
        elif ext in ["txt", "md", "markdown", "csv", "json"]:
            text = content_bytes.decode("utf-8", errors="replace")
            return [{"text": text, "page": 1}]
        else:
            raise ValueError(f"Unsupported file format: .{ext}")

    def _parse_pdf(self, content_bytes: bytes) -> List[Dict[str, Any]]:
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content_bytes))
            pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                clean_text = self._clean_text(text)
                if clean_text:
                    pages.append({"text": clean_text, "page": i + 1})
            return pages if pages else [{"text": "", "page": 1}]
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {str(e)}")

    def _clean_text(self, text: str) -> str:
        text = re.sub(r'\r\n|\r', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def chunk_document(self, parsed_pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Splits text into overlapping chunks while preserving page numbers and indices.
        Returns: [{"text": str, "page": int, "chunk_index": int}]
        """
        chunks = []
        global_chunk_idx = 0

        for page_data in parsed_pages:
            text = page_data["text"]
            page_num = page_data.get("page", 1)

            if not text:
                continue

            # Recursive character splitting logic
            page_chunks = self._split_text(text, self.chunk_size, self.chunk_overlap)
            for chunk_str in page_chunks:
                if chunk_str.strip():
                    chunks.append({
                        "text": chunk_str.strip(),
                        "page": page_num,
                        "chunk_index": global_chunk_idx
                    })
                    global_chunk_idx += 1

        return chunks

    def _split_text(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        if len(text) <= chunk_size:
            return [text]

        splits = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end >= len(text):
                splits.append(text[start:])
                break

            # Find natural break point (newline or period or space)
            break_point = -1
            for sep in ["\n\n", "\n", ". ", " "]:
                pos = text.rfind(sep, start + chunk_size // 2, end)
                if pos != -1:
                    break_point = pos + len(sep)
                    break

            if break_point == -1 or break_point <= start:
                break_point = end

            splits.append(text[start:break_point])
            start = max(start + 1, break_point - chunk_overlap)

        return splits

document_service = DocumentService()

