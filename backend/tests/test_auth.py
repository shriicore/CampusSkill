def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "name": "Karan Mehra",
        "email": "karan.mehra@test.edu",
        "password": "Password123!",
        "department": "Mechanical Engineering",
        "semester": 5
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "token" in data
    assert data["user"]["name"] == "Karan Mehra"
    assert data["user"]["role"] == "student"

def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "name": "Original",
        "email": "duplicate@test.edu",
        "password": "Password123!"
    })
    res = client.post("/api/auth/register", json={
        "name": "Duplicate",
        "email": "duplicate@test.edu",
        "password": "Password123!"
    })
    assert res.status_code == 409
    assert "already exists" in res.get_json()["error"]

def test_login_success(client):
    client.post("/api/auth/register", json={
        "name": "Login Tester",
        "email": "login@test.edu",
        "password": "SecurePassword123!"
    })
    res = client.post("/api/auth/login", json={
        "email": "login@test.edu",
        "password": "SecurePassword123!"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", json={
        "email": "nonexistent@test.edu",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_protected_route_without_token(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_profile_update(client, test_users):
    token = test_users["student1"]["token"]
    res = client.put(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"bio": "Updated student bio", "hourly_rate_paise": 65000}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["bio"] == "Updated student bio"
    assert data["user"]["hourly_rate_paise"] == 65000
    assert data["user"]["hourly_rate_inr"] == 650.0
