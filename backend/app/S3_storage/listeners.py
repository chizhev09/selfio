# Слушатели ORM: после commit новой строки users — создание маркеров S3 в фоне (не блокирует event loop).
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import object_session

from app.models.user import User

_log = logging.getLogger(__name__)
_registered = False


def register_user_s3_listeners() -> None:
    """Вешает события на AsyncSession и модель User (один раз при импорте session)."""
    global _registered
    if _registered:
        return
    _registered = True

    @event.listens_for(User, "after_insert", propagate=True)
    def _after_user_row_insert(_mapper, _connection, target: User) -> None:
        """Сохраняет id пользователя в session.info сразу после успешного INSERT."""
        sess = object_session(target)
        if sess is None:
            _log.warning(
                "ORM after_insert(User): нет сессии у target id=%s — S3 после commit не создадутся.",
                getattr(target, "id", None),
            )
            return
        sess.info.setdefault("_flowsee_pending_s3_user_ids", set()).add(target.id)

    @event.listens_for(AsyncSession.sync_session_class, "after_commit", propagate=True)
    def _after_commit_ensure_user_s3(session) -> None:
        """После commit ставит создание папок S3 в thread pool, чтобы не блокировать asyncio."""
        ids = session.info.pop("_flowsee_pending_s3_user_ids", None)
        if not ids:
            return
        from app.S3_storage.user_folders import ensure_user_s3_folders

        for uid in ids:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                ensure_user_s3_folders(uid)
            else:
                loop.create_task(asyncio.to_thread(ensure_user_s3_folders, uid))

    @event.listens_for(AsyncSession.sync_session_class, "after_rollback", propagate=True)
    def _after_rollback_drop_pending_s3(session) -> None:
        """Сбрасывает накопленные uuid при откате транзакции."""
        session.info.pop("_flowsee_pending_s3_user_ids", None)
