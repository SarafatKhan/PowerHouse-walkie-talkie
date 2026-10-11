import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

from sqlalchemy.pool import StaticPool

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_api_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def test_register_and_login_flow():
    client = TestClient(app)

    # 1. Register User Sarafat
    reg_response = client.post(
        "/api/auth/register",
        json={
            "name": "Sarafat",
            "email": "sarafat@example.com",
            "password": "Password123!"
        }
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    user = data["user"]
    assert user["name"] == "Sarafat"
    assert user["email"] == "sarafat@example.com"
    assert user["user_id"].startswith("USR_")
    token = data["access_token"]

    # 2. Duplicate registration should fail
    dup_res = client.post(
        "/api/auth/register",
        json={
            "name": "Sarafat Copy",
            "email": "sarafat@example.com",
            "password": "Password123!"
        }
    )
    assert dup_res.status_code == 400

    # 3. Login with correct credentials
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "sarafat@example.com",
            "password": "Password123!"
        }
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["user_id"] == user["user_id"]

    # 4. Login with invalid password
    bad_login = client.post(
        "/api/auth/login",
        json={
            "email": "sarafat@example.com",
            "password": "WrongPassword!"
        }
    )
    assert bad_login.status_code == 401

    # 5. Access protected /api/auth/me
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["user_id"] == user["user_id"]


def test_user_profile_update():
    client = TestClient(app)

    # Register user
    reg = client.post(
        "/api/auth/register",
        json={"name": "Rahul", "email": "rahul@example.com", "password": "Password123!"}
    ).json()
    token = reg["access_token"]

    # Update profile
    update_res = client.put(
        "/api/users/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Rahul Sharma"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Rahul Sharma"
