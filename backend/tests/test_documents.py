import io

def test_document_upload_and_listing(client):
    # Upload a sample markdown file
    md_content = b"# Architecture Overview\nThis document describes system microservices and database clustering."
    files = {"file": ("architecture.md", io.BytesIO(md_content), "text/markdown")}

    upload_res = client.post("/api/documents/upload", files=files)
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert "document" in data
    doc_id = data["document"]["id"]
    assert data["document"]["filename"] == "architecture.md"
    assert data["document"]["chunk_count"] > 0

    # List documents
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    docs = list_res.json()
    assert any(d["id"] == doc_id for d in docs)

    # Delete document
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 204

