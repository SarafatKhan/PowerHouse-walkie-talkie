from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.auth_service import get_current_user
from app.services.speaker_service import speaker_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.name is not None:
        name_val = req.name.strip()
        if len(name_val) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
        current_user.name = name_val

    if req.profile_picture is not None:
        current_user.profile_picture = req.profile_picture.strip()

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.get("/channel-status")
def get_channel_status():
    """Provides current speaker status and channel state."""
    current_speaker = speaker_service.get_current_speaker()
    return {
        "channel_occupied": current_speaker is not None,
        "current_speaker": current_speaker,
    }
