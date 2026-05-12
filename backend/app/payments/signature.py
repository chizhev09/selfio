# Проверка подписи HTTP-уведомлений ЮMoney (параметр sign, HMAC-SHA256 по документации сервиса).
from __future__ import annotations

import hashlib
import hmac
from typing import Mapping
from urllib.parse import quote


def canonical_yoomoney_notification_string(params: Mapping[str, str]) -> str:
    """Склеивает параметры уведомления в одну строку для расчёта HMAC по правилам ЮMoney."""
    items = {k: v for k, v in params.items() if k != "sign"}
    parts: list[str] = []
    for key in sorted(items.keys()):
        encoded = quote(str(items[key]), safe="-._~")
        parts.append(f"{key}={encoded}")
    return "&".join(parts)


def verify_yoomoney_notification_sign(params: Mapping[str, str], secret: str) -> bool:
    """Проверяет, что параметр sign совпадает с HMAC-SHA256 строки параметров и секретного слова."""
    recv_sign = params.get("sign") or ""
    recv_sign = recv_sign.strip().lower()
    if not recv_sign or not secret.strip():
        return False
    msg = canonical_yoomoney_notification_string(params).encode("utf-8")
    calc = hmac.new(secret.strip().encode("utf-8"), msg=msg, digestmod=hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(calc, recv_sign)
    except TypeError:
        return False
