def test_conversation_lifecycle(client):
    # 1. Create a conversation
    create_res = client.post("/api/conversations", json={"title": "Test AI Chat"})
    assert create_res.status_code == 201
    conv = create_res.json()
    conv_id = conv["id"]
    assert conv["title"] == "Test AI Chat"

    # 2. List conversations
    list_res = client.get("/api/conversations")
    assert list_res.status_code == 200
    convs = list_res.json()
    assert any(c["id"] == conv_id for c in convs)

    # 3. Rename conversation
    patch_res = client.patch(f"/api/conversations/{conv_id}", json={"title": "Updated Topic"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Topic"

    # 4. Get conversation details
    detail_res = client.get(f"/api/conversations/{conv_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == "Updated Topic"

    # 5. Delete conversation
    del_res = client.delete(f"/api/conversations/{conv_id}")
    assert del_res.status_code == 204

    # Verify deleted
    verify_res = client.get(f"/api/conversations/{conv_id}")
    assert verify_res.status_code == 404

