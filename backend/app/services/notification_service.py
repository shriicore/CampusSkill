from app.extensions import db
from app.models.notification import Notification

class NotificationService:
    @staticmethod
    def create_notification(user_id: int, title: str, message: str, notif_type: str = "system", link: str = None) -> Notification:
        try:
            notif = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=notif_type,
                link=link
            )
            db.session.add(notif)
            db.session.commit()
            return notif
        except Exception as e:
            db.session.rollback()
            # Do not crash calling code if notification persistence encounters issue
            print(f"[NotificationService] Error creating notification: {e}")
            return None
