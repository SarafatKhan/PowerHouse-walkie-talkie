import asyncio
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.services.auth_service import (
    generate_unique_user_id,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.services.speaker_service import SpeakerService

from sqlalchemy.pool import StaticPool

# Use in-memory SQLite for fast, isolated test execution
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def test_unique_user_id_generation():
    db = TestingSessionLocal()
    try:
        user_ids = set()
        for i in range(25):
            uid = generate_unique_user_id(db)
            assert uid.startswith("USR_")
            assert len(uid) == 11  # USR_ (4) + 7 chars
            assert uid not in user_ids
            user_ids.add(uid)

            # Insert dummy user to ensure conflict checking works
            user = User(
                user_id=uid,
                name=f"User {i}",
                email=f"user{i}@example.com",
                password_hash="hash",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                last_seen=datetime.now(timezone.utc),
            )
            db.add(user)
            db.commit()
    finally:
        db.close()


def test_password_hashing():
    pwd = "MySecretPassword123!"
    h = hash_password(pwd)
    assert h != pwd
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword", h) is False


def test_jwt_token_creation_and_decoding():
    data = {"sub": "USR_TEST123", "name": "Alice"}
    token = create_access_token(data)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "USR_TEST123"
    assert decoded["name"] == "Alice"

    # Test invalid token
    assert decode_access_token("invalid.token.string") is None


@pytest.mark.asyncio
async def test_speaker_lock_lifecycle():
    service = SpeakerService()

    # 1. Channel is initially free
    assert service.is_occupied is False
    assert service.get_current_speaker() is None

    # 2. User A requests to speak -> should be GRANTED
    granted, busy_name, reason = await service.request_speak("USR_A", "Alice")
    assert granted is True
    assert busy_name is None
    assert service.is_occupied is True
    assert service.current_speaker_id == "USR_A"
    assert service.current_speaker_name == "Alice"

    # 3. User B requests to speak while User A is speaking -> should be DENIED
    granted_b, busy_name_b, reason_b = await service.request_speak("USR_B", "Bob")
    assert granted_b is False
    assert busy_name_b == "Alice"
    assert "Alice is currently speaking" in reason_b
    assert service.current_speaker_id == "USR_A"

    # 4. User B attempts to release User A's lock -> should FAIL
    released_b, _ = await service.release_speak("USR_B")
    assert released_b is False
    assert service.current_speaker_id == "USR_A"

    # 5. User A releases the lock -> should SUCCEED
    released_a, prev_id = await service.release_speak("USR_A")
    assert released_a is True
    assert prev_id == "USR_A"
    assert service.is_occupied is False
    assert service.current_speaker_id is None

    # 6. Now User B requests to speak -> should be GRANTED
    await asyncio.sleep(0.15)
    granted_b2, _, _ = await service.request_speak("USR_B", "Bob")
    assert granted_b2 is True
    assert service.current_speaker_id == "USR_B"

    # 7. User B disconnects -> should automatically release
    disconnected_b, prev_disc = await service.handle_disconnect("USR_B")
    assert disconnected_b is True
    assert prev_disc == "USR_B"
    assert service.is_occupied is False


@pytest.mark.asyncio
async def test_concurrent_speaker_requests():
    """
    Simulates User A, User B, and User C simultaneously calling request_speak.
    Guarantees that EXACTLY ONE user receives permission and all others are denied.
    """
    service = SpeakerService()

    users = [
        ("USR_A", "Sarafat"),
        ("USR_B", "Rahul"),
        ("USR_C", "Amit"),
        ("USR_D", "Deepa"),
        ("USR_E", "Elena"),
    ]

    # Run all requests simultaneously using asyncio.gather
    results = await asyncio.gather(*[
        service.request_speak(uid, name) for uid, name in users
    ])

    granted_count = sum(1 for granted, _, _ in results if granted is True)
    denied_count = sum(1 for granted, _, _ in results if granted is False)

    # STRICT RULE: ONLY ONE can be granted
    assert granted_count == 1, f"Expected exactly 1 grant, got {granted_count}"
    assert denied_count == len(users) - 1

    # Verify state reflects the single granted user
    winner_speaker = service.get_current_speaker()
    assert winner_speaker is not None
    assert winner_speaker["user_id"] in [u[0] for u in users]
