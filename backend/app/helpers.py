import json
from datetime import datetime
from app.models import Notification, AuditLog

def now() -> str:
    return datetime.utcnow().isoformat()

def notify(db, recipient_id, type, title, body=None, link=None):
    db.add(Notification(recipient_id=recipient_id, type=type, title=title,
                        body=body, link=link, created_at=now()))

def audit(db, actor_id, action, resource_type, resource_id=None, metadata=None):
    db.add(AuditLog(actor_id=actor_id, action=action, resource_type=resource_type,
                   resource_id=resource_id,
                   metadata_json=json.dumps(metadata) if metadata else None,
                   created_at=now()))
