import uuid

def test_register_and_login(client):
    unique_username = f"testuser_{uuid.uuid4().hex[:8]}"
    password = "securePassword123!"

    # Test registration
    reg_res = client.post("/api/auth/register", json={
        "username": unique_username,
        "password": password,
        "email": f"{unique_username}@example.com"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["username"] == unique_username

    # Test login
    login_res = client.post("/api/auth/login", json={
        "username": unique_username,
        "password": password
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

def test_guest_session(client):
    res = client.get("/api/auth/guest")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "guest_user"

