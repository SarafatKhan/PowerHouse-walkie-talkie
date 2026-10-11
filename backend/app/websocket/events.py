from enum import Enum
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field


class WebSocketEventType(str, Enum):
    # Channel & Presence
    CHANNEL_STATE = "channel_state"
    PRESENCE_UPDATE = "presence_update"
    
    # Speaker Lock
    REQUEST_SPEAK = "request_speak"
    SPEAK_GRANTED = "speak_granted"
    SPEAK_DENIED = "speak_denied"
    RELEASE_SPEAK = "release_speak"
    SPEAKER_STARTED = "speaker_started"
    SPEAKER_STOPPED = "speaker_stopped"

    # WebRTC Signaling
    WEBRTC_OFFER = "webrtc_offer"
    WEBRTC_ANSWER = "webrtc_answer"
    ICE_CANDIDATE = "ice_candidate"

    # Heartbeat & Errors
    PING = "ping"
    PONG = "pong"
    ERROR = "error"


class WSMessage(BaseModel):
    type: str
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    target_user_id: Optional[str] = None
    from_user_id: Optional[str] = None


class PresenceUserData(BaseModel):
    user_id: str
    name: str
    email: str
    profile_picture: Optional[str] = None


class PresenceUpdatePayload(BaseModel):
    online_count: int
    users: List[PresenceUserData]


class SpeakerStatusPayload(BaseModel):
    speaker_id: Optional[str] = None
    speaker_name: Optional[str] = None
    started_at: Optional[str] = None
    is_speaking: bool = False
