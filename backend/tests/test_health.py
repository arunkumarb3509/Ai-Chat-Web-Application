def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "AI Chatbot API is operational" in data["message"]
    assert data["docs_url"] == "/docs"

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["rag_ready"] is True
    assert "llm_provider" in data

