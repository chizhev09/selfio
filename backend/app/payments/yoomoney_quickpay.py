# Сборка GET-ссылки на страницу quickpay ЮMoney (формат shop) для физлица-получателя.
from __future__ import annotations

from urllib.parse import quote, urlencode

from app.core.config import Settings


def _quote_rfc3986(value: str | int | float | bool | None) -> str:
    """Приводит значение к строке и кодирует для URL (небуквенные символы заменяет на %XX)."""
    if value is None:
        return ""
    return quote(str(value), safe="-._~")


def build_yoomoney_quickpay_url(
    *,
    settings: Settings,
    order_label: str,
    amount_rubles: int,
    success_frontend_url: str,
) -> str:
    """Собирает URL вида …/quickpay/confirm.xml?… для редиректа плательщика на ЮMoney."""
    receiver = settings.yoomoney_receiver.strip()
    targets = (settings.yoomoney_payment_targets.strip() or "Пополнение баланса Selfio").strip()
    ptype = (settings.yoomoney_payment_type.strip().upper() or "AC")
    if ptype not in {"AC", "PC"}:
        ptype = "AC"
    base = settings.yoomoney_quickpay_base_url.strip().rstrip("/")
    params: dict[str, str] = {
        "receiver": receiver,
        "quickpay-form": "shop",
        "targets": targets,
        "sum": str(amount_rubles),
        "label": order_label[:64],
        "paymentType": ptype,
        "successURL": success_frontend_url,
    }
    return f"{base}?{urlencode(params, quote_via=lambda s, *_a, **_kw: _quote_rfc3986(s))}"
