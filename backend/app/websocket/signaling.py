import logging
from typing import Dict, Any
from app.models.user import User
from app.services.speaker_service import speaker_service
from app.websocket.events import WebSocketEventType
from app.websocket.manager import manager

logger = logging.getLogger("walkie_talkie.signaling")


async def handle_websocket_message(user: User, data: Dict[str, Any]) -> None:
    """
    Dispatches and processes WebSocket messages received from an authenticated client.
    Enforces server-side speaker lock and routes WebRTC audio signaling.
    """
    msg_type = data.get("type")
    payload = data.get("data", {}) or {}
    user_id = user.user_id
    user_name = user.name

    if msg_type == WebSocketEventType.PING.value:
        await manager.send_to_user(user_id, {"type": WebSocketEventType.PONG.value})
        return

    # ==========================================
    # 1. SPEAKER LOCK: REQUEST TO TALK
    # ==========================================
    elif msg_type == WebSocketEventType.REQUEST_SPEAK.value:
        granted, busy_speaker_name, message = await speaker_service.request_speak(
            user_id=user_id,
            user_name=user_name
        )

        if granted:
            # Tell the requester that permission is granted
            # Also supply the list of other connected users who should receive audio
            peers = manager.get_other_online_user_ids(exclude_user_id=user_id)
            await manager.send_to_user(user_id, {
                "type": WebSocketEventType.SPEAK_GRANTED.value,
                "data": {
                    "user_id": user_id,
                    "peers": peers,
                    "message": "You now have the channel. Speak."
                }
            })

            # Broadcast to all other users that this speaker has started
            await manager.broadcast(
                message={
                    "type": WebSocketEventType.SPEAKER_STARTED.value,
                    "data": {
                        "speaker_id": user_id,
                        "speaker_name": user_name,
                        "started_at": speaker_service.get_current_speaker().get("started_at")
                        if speaker_service.get_current_speaker() else None
                    }
                },
                exclude_user_id=user_id
            )
        else:
            # Denied
            await manager.send_to_user(user_id, {
                "type": WebSocketEventType.SPEAK_DENIED.value,
                "data": {
                    "current_speaker": busy_speaker_name,
                    "reason": message
                }
            })

    # ==========================================
    # 2. SPEAKER LOCK: RELEASE TALK
    # ==========================================
    elif msg_type == WebSocketEventType.RELEASE_SPEAK.value:
        released, prev_speaker_id = await speaker_service.release_speak(user_id)
        if released:
            # Broadcast channel cleared to all clients
            await manager.broadcast({
                "type": WebSocketEventType.SPEAKER_STOPPED.value,
                "data": {
                    "speaker_id": user_id,
                    "reason": "Speaker released button"
                }
            })

    # ==========================================
    # 3. WEBRTC SIGNALING: OFFER (Speaker -> Listener)
    # ==========================================
    elif msg_type == WebSocketEventType.WEBRTC_OFFER.value:
        # Security: Only current speaker can send audio offers
        if speaker_service.current_speaker_id != user_id:
            logger.warning(f"Unauthorized WebRTC offer from {user_id} (not current speaker)")
            await manager.send_to_user(user_id, {
                "type": WebSocketEventType.ERROR.value,
                "data": {"message": "You are not authorized to broadcast audio."}
            })
            return

        target_user_id = data.get("target_user_id")
        sdp = payload.get("sdp")
        if target_user_id and sdp:
            await manager.send_to_user(target_user_id, {
                "type": WebSocketEventType.WEBRTC_OFFER.value,
                "from_user_id": user_id,
                "from_user_name": user_name,
                "target_user_id": target_user_id,
                "data": {"sdp": sdp}
            })

    # ==========================================
    # 4. WEBRTC SIGNALING: ANSWER (Listener -> Speaker)
    # ==========================================
    elif msg_type == WebSocketEventType.WEBRTC_ANSWER.value:
        target_user_id = data.get("target_user_id")
        sdp = payload.get("sdp")
        if target_user_id and sdp:
            await manager.send_to_user(target_user_id, {
                "type": WebSocketEventType.WEBRTC_ANSWER.value,
                "from_user_id": user_id,
                "target_user_id": target_user_id,
                "data": {"sdp": sdp}
            })

    # ==========================================
    # 5. WEBRTC SIGNALING: ICE CANDIDATES
    # ==========================================
    elif msg_type == WebSocketEventType.ICE_CANDIDATE.value:
        target_user_id = data.get("target_user_id")
        candidate = payload.get("candidate")
        if target_user_id and candidate:
            await manager.send_to_user(target_user_id, {
                "type": WebSocketEventType.ICE_CANDIDATE.value,
                "from_user_id": user_id,
                "target_user_id": target_user_id,
                "data": {"candidate": candidate}
            })

    else:
        logger.warning(f"Unrecognized message type '{msg_type}' from {user_id}")
