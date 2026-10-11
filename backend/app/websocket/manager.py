import json
import logging
from typing import Dict, Set, List, Optional
from fastapi import WebSocket

from app.models.user import User
from app.services.speaker_service import speaker_service
from app.websocket.events import WebSocketEventType

logger = logging.getLogger("walkie_talkie.ws_manager")


class ConnectionManager:
    """
    Manages active WebSocket connections for the single global Walkie-Talkie channel.
    Tracks presence, broadcasts events, and routes direct peer signaling.
    """

    def __init__(self):
        # user_id -> Set[WebSocket]
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        # user_id -> User metadata dict
        self._user_metadata: Dict[str, dict] = {}
        # WebSocket -> user_id
        self._socket_to_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user: User) -> None:
        await websocket.accept()

        user_id = user.user_id
        if user_id not in self._active_connections:
            self._active_connections[user_id] = set()

        self._active_connections[user_id].add(websocket)
        self._socket_to_user[websocket] = user_id
        self._user_metadata[user_id] = {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "profile_picture": user.profile_picture,
        }

        logger.info(f"User {user.name} ({user_id}) connected. Total online: {len(self._user_metadata)}")

        # 1. Send initial full channel state to the newly connected user
        current_speaker = speaker_service.get_current_speaker()
        await self.send_to_socket(websocket, {
            "type": WebSocketEventType.CHANNEL_STATE.value,
            "data": {
                "online_count": self.get_online_count(),
                "users": self.get_online_users_list(),
                "current_speaker": current_speaker,
                "is_channel_clear": current_speaker is None,
                "your_user_id": user.user_id,
            }
        })

        # 2. Broadcast presence update to everyone
        await self.broadcast_presence()

    async def disconnect(self, websocket: WebSocket) -> None:
        user_id = self._socket_to_user.pop(websocket, None)
        if not user_id:
            return

        if user_id in self._active_connections:
            self._active_connections[user_id].discard(websocket)
            if not self._active_connections[user_id]:
                del self._active_connections[user_id]
                self._user_metadata.pop(user_id, None)

                logger.info(f"User {user_id} completely disconnected. Online remaining: {len(self._user_metadata)}")

                # Automatic Speaker Lock Release if this user was the active speaker
                released, prev_id = await speaker_service.handle_disconnect(user_id)
                if released:
                    logger.warning(f"Active speaker {user_id} disconnected! Automatically released speaker lock.")
                    await self.broadcast({
                        "type": WebSocketEventType.SPEAKER_STOPPED.value,
                        "data": {
                            "speaker_id": user_id,
                            "reason": "Speaker disconnected"
                        }
                    })

                # Broadcast updated presence
                await self.broadcast_presence()

    async def send_to_socket(self, websocket: WebSocket, message: dict) -> None:
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.debug(f"Failed to send to socket: {e}")

    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Send message to all active sockets belonging to a specific user."""
        sockets = self._active_connections.get(user_id, set())
        if not sockets:
            logger.debug(f"User {user_id} not connected, cannot send message: {message.get('type')}")
            return
        msg_str = json.dumps(message)
        dead_sockets = []
        for ws in list(sockets):
            try:
                await ws.send_text(msg_str)
            except Exception as e:
                logger.debug(f"Error sending to user {user_id}: {e}")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            await self.disconnect(ws)

    async def broadcast(self, message: dict, exclude_user_id: Optional[str] = None) -> None:
        """Broadcast a message to every connected client in the global channel."""
        msg_str = json.dumps(message)
        for uid, sockets in list(self._active_connections.items()):
            if exclude_user_id and uid == exclude_user_id:
                continue
            for ws in list(sockets):
                try:
                    await ws.send_text(msg_str)
                except Exception as e:
                    logger.debug(f"Error broadcasting to {uid}: {e}")

    async def broadcast_presence(self) -> None:
        """Broadcast current presence and online count to everyone."""
        await self.broadcast({
            "type": WebSocketEventType.PRESENCE_UPDATE.value,
            "data": {
                "online_count": self.get_online_count(),
                "users": self.get_online_users_list(),
            }
        })

    def get_online_count(self) -> int:
        return len(self._user_metadata)

    def get_online_users_list(self) -> List[dict]:
        return list(self._user_metadata.values())

    def get_other_online_user_ids(self, exclude_user_id: str) -> List[str]:
        return [uid for uid in self._user_metadata.keys() if uid != exclude_user_id]


# Singleton instance
manager = ConnectionManager()
