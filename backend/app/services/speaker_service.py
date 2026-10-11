import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
import logging

logger = logging.getLogger("walkie_talkie.speaker")


class SpeakerService:
    """
    Centralized, thread-safe and concurrency-safe Global Speaker Lock Manager.
    Guarantees that at any point in time, AT MOST ONE user can speak on the global channel.
    Uses asyncio.Lock to prevent race conditions during concurrent request_speak events.
    """

    def __init__(self):
        self._lock = asyncio.Lock()
        self._current_speaker_id: Optional[str] = None
        self._current_speaker_name: Optional[str] = None
        self._speaking_started_at: Optional[datetime] = None
        self._last_request_time: Dict[str, float] = {}

    async def request_speak(self, user_id: str, user_name: str) -> Tuple[bool, Optional[str], str]:
        """
        Attempt to acquire the global speaker lock.

        Returns:
            (granted: bool, current_speaker_name: Optional[str], reason: str)
        """
        now_ts = datetime.now(timezone.utc).timestamp()

        # Simple rate limit: minimum 100ms between repeated requests from same user
        last_req = self._last_request_time.get(user_id, 0.0)
        if now_ts - last_req < 0.1:
            return False, self._current_speaker_name, "Rate limit exceeded. Please wait."
        self._last_request_time[user_id] = now_ts

        async with self._lock:
            if self._current_speaker_id is None:
                # Channel is free -> Grant lock
                self._current_speaker_id = user_id
                self._current_speaker_name = user_name
                self._speaking_started_at = datetime.now(timezone.utc)
                logger.info(f"Speaker lock GRANTED to {user_name} ({user_id})")
                return True, None, "Permission granted"
            elif self._current_speaker_id == user_id:
                # Already holding lock
                return True, None, "Already speaking"
            else:
                # Channel is busy -> Deny lock
                logger.info(
                    f"Speaker lock DENIED to {user_name} ({user_id}). "
                    f"Channel currently occupied by {self._current_speaker_name} ({self._current_speaker_id})"
                )
                return False, self._current_speaker_name, f"{self._current_speaker_name} is currently speaking. Please wait."

    async def release_speak(self, user_id: str) -> Tuple[bool, Optional[str]]:
        """
        Release the global speaker lock if held by the requesting user.

        Returns:
            (released: bool, previous_speaker_id: Optional[str])
        """
        async with self._lock:
            if self._current_speaker_id == user_id:
                prev_id = self._current_speaker_id
                prev_name = self._current_speaker_name
                self._current_speaker_id = None
                self._current_speaker_name = None
                self._speaking_started_at = None
                logger.info(f"Speaker lock RELEASED by {prev_name} ({prev_id})")
                return True, prev_id
            return False, None

    async def handle_disconnect(self, user_id: str) -> Tuple[bool, Optional[str]]:
        """
        Automatic cleanup if the current speaker disconnects unexpectedly.
        """
        return await self.release_speak(user_id)

    async def force_reset(self) -> None:
        """Force reset speaker lock (for admin/testing)."""
        async with self._lock:
            self._current_speaker_id = None
            self._current_speaker_name = None
            self._speaking_started_at = None

    def get_current_speaker(self) -> Optional[Dict[str, Any]]:
        """Return information about the current speaker, or None if channel is clear."""
        if self._current_speaker_id is None:
            return None
        return {
            "user_id": self._current_speaker_id,
            "name": self._current_speaker_name,
            "started_at": self._speaking_started_at.isoformat() if self._speaking_started_at else None,
        }

    @property
    def is_occupied(self) -> bool:
        return self._current_speaker_id is not None

    @property
    def current_speaker_id(self) -> Optional[str]:
        return self._current_speaker_id

    @property
    def current_speaker_name(self) -> Optional[str]:
        return self._current_speaker_name


# Singleton instance shared throughout backend
speaker_service = SpeakerService()
