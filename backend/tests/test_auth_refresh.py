from app.core.security import create_access_token, create_refresh_token


async def test_login_returns_refresh_token(client, admin_user):
    response = await client.post("/api/v1/auth/login", json={"email": "admin@test.mx", "password": "test1234"})
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] and body["refresh_token"]


async def test_refresh_returns_new_session(client, admin_user):
    refresh_token = create_refresh_token(str(admin_user.id), admin_user.role.value)
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {response.json()['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == "admin@test.mx"


async def test_refresh_rejects_access_token(client, admin_user):
    access = create_access_token(str(admin_user.id), admin_user.role.value)
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": access})
    assert response.status_code == 401


async def test_refresh_token_cannot_be_used_as_access_token(client, admin_user):
    refresh_token = create_refresh_token(str(admin_user.id), admin_user.role.value)
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert response.status_code == 401


async def test_refresh_rejects_inactive_user(client, db_session, admin_user):
    admin_user.is_active = False
    await db_session.commit()
    refresh_token = create_refresh_token(str(admin_user.id), admin_user.role.value)
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401
