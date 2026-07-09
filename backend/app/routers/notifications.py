from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Employee, Notification
from app.deps import get_current_user
from app.helpers import now

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
def get_notifications(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notifications for current user (ownership-enforced)."""
    notifications = db.query(Notification).filter_by(recipient_id=user.id).all()
    
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "link": n.link,
            "read": bool(n.read),
            "created_at": n.created_at,
        }
        for n in notifications
    ]


@router.post("/{id}/read")
def mark_as_read(
    id: int,
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark notification as read (ownership-enforced)."""
    notification = db.get(Notification, id)
    if not notification:
        raise HTTPException(404, "Notification not found")
    
    # Check ownership
    if notification.recipient_id != user.id:
        raise HTTPException(403, "Not your notification")
    
    notification.read = 1
    db.commit()
    
    return {"status": "read", "id": id}


@router.get("/unread_count")
def get_unread_count(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get unread notification count for current user (ownership-enforced)."""
    count = db.query(Notification).filter_by(
        recipient_id=user.id,
        read=0
    ).count()
    
    return {"unread_count": count}
