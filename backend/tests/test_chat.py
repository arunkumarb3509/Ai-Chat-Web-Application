def test_chat_empty_message_rejected(client):
    res = client.post("/api/chat", json={"message": "   "})
    assert res.status_code == 400

def test_chat_general_turn(client):
    res = client.post("/api/chat", json={
        "message": "Explain what a REST API is and write code in python.",
        "mode": "general"
    })
    assert res.status_code == 200
    data = res.json()
    assert "conversation_id" in data
    assert "message_id" in data
    assert len(data["content"]) > 10
    assert data["role"] == "assistant"

def test_chat_tamil_support(client):
    res = client.post("/api/chat", json={
        "message": "Vanakkam, epdi irukinga?",
        "mode": "general"
    })
    assert res.status_code == 200
    data = res.json()
    assert "வணக்கம்" in data["content"] or "Tamil" in data["content"]

def test_chat_multi_turn_context(client):
    # First turn
    turn1 = client.post("/api/chat", json={"message": "My name is John Doe."})
    assert turn1.status_code == 200
    conv_id = turn1.json()["conversation_id"]

    # Follow-up turn using same conversation_id
    turn2 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "What is my name?"
    })
    assert turn2.status_code == 200
    assert turn2.json()["conversation_id"] == conv_id

