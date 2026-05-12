# //==== МАРШРУТЫ АДМИН-ПАНЕЛИ: ВХОД ПО ПАРОЛЮ И АГРЕГАТНЫЕ МЕТРИКИ ДЛЯ ДАШБОРДА. ====
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.payment_order import PaymentOrder, PaymentOrderStatus
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminLoginRequest(BaseModel):
    """Тело запроса на вход в админ-панель по паролю."""

    password: str


class AdminUsersStatsResponse(BaseModel):
    """Ответ со сводной статистикой по регистрациям пользователей."""

    total_users: int
    registered_today: int
    registered_last_7_days: int
    registered_last_30_days: int


class AdminPaymentsStatsResponse(BaseModel):
    """Ответ со сводной статистикой по успешным платежам."""

    paid_total: int
    paid_last_24h: int
    paid_last_7_days: int
    paid_last_30_days: int
    revenue_rub_last_30_days: int
    tokens_sold_last_30_days: int


def _validate_admin_password(entered_password: str) -> None:
    """//==== ПРОВЕРЯЕТ ПАРОЛЬ АДМИНА И ВЫБРАСЫВАЕТ HTTP-ОШИБКУ ПРИ НЕСОВПАДЕНИИ. ===="""
    settings = get_settings()
    configured_password = settings.admin_password.strip()
    if not configured_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_PASSWORD не задан в окружении.",
        )
    if not secrets.compare_digest(entered_password.strip(), configured_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный пароль.")


def _to_int(value: object) -> int:
    """//==== БЕЗОПАСНО ПРЕОБРАЗУЕТ СКАЛЯР ИЗ БД В ЦЕЛОЕ ЧИСЛО ДЛЯ API-ОТВЕТА. ===="""
    if value is None:
        return 0
    return int(value)


@router.get("", response_class=HTMLResponse)
async def admin_index() -> HTMLResponse:
    """//==== ВОЗВРАЩАЕТ ПРОСТУЮ HTML-СТРАНИЦУ-ЗАГЛУШКУ ДЛЯ /ADMIN НА BACKEND. ===="""
    return HTMLResponse(
        """
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flowsee Admin</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      .card {
        padding: 24px 28px;
        border: 1px solid #334155;
        border-radius: 12px;
        background: #111827;
        text-align: center;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      p {
        margin: 0;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Flowsee Admin</h1>
      <p>Пустая страница админ-панели. Наполнение будет добавлено позже.</p>
    </main>
  </body>
</html>
        """
    )


@router.post("/login")
async def admin_login(body: AdminLoginRequest) -> dict[str, bool]:
    """//==== ПРОВЕРЯЕТ ПАРОЛЬ И ПОДТВЕРЖДАЕТ ПРАВО ДОСТУПА К АДМИН-МЕТРИКАМ. ===="""
    _validate_admin_password(body.password)
    return {"ok": True}


@router.get("/stats/users", response_model=AdminUsersStatsResponse)
async def admin_users_stats(
    db: AsyncSession = Depends(get_db),
    x_admin_password: str = Header(default=""),
) -> AdminUsersStatsResponse:
    """//==== ВОЗВРАЩАЕТ СВОДНУЮ СТАТИСТИКУ РЕГИСТРАЦИЙ ОДНИМ ЗАПРОСОМ К БАЗЕ. ===="""
    _validate_admin_password(x_admin_password)

    now = datetime.now(UTC)
    start_of_today = datetime(now.year, now.month, now.day, tzinfo=UTC)
    start_of_7_days = now - timedelta(days=7)
    start_of_30_days = now - timedelta(days=30)
    stats_row = (
        await db.execute(
            select(
                select(func.count()).select_from(User).scalar_subquery().label("total_users"),
                select(func.count()).select_from(User).where(User.created_at >= start_of_today).scalar_subquery().label("registered_today"),
                select(func.count()).select_from(User).where(User.created_at >= start_of_7_days).scalar_subquery().label("registered_last_7_days"),
                select(func.count()).select_from(User).where(User.created_at >= start_of_30_days).scalar_subquery().label("registered_last_30_days"),
            )
        )
    ).one()

    return AdminUsersStatsResponse(
        total_users=_to_int(stats_row.total_users),
        registered_today=_to_int(stats_row.registered_today),
        registered_last_7_days=_to_int(stats_row.registered_last_7_days),
        registered_last_30_days=_to_int(stats_row.registered_last_30_days),
    )


@router.get("/stats/payments", response_model=AdminPaymentsStatsResponse)
async def admin_payments_stats(
    db: AsyncSession = Depends(get_db),
    x_admin_password: str = Header(default=""),
) -> AdminPaymentsStatsResponse:
    """//==== ВОЗВРАЩАЕТ СВОДНЫЕ МЕТРИКИ УСПЕШНЫХ ОПЛАТ ОДНИМ SQL-ЗАПРОСОМ. ===="""
    _validate_admin_password(x_admin_password)

    now = datetime.now(UTC)
    start_of_24h = now - timedelta(hours=24)
    start_of_7_days = now - timedelta(days=7)
    start_of_30_days = now - timedelta(days=30)
    paid_status = PaymentOrderStatus.paid.value

    stats_row = (
        await db.execute(
            select(
                select(func.count()).select_from(PaymentOrder).where(PaymentOrder.status == paid_status).scalar_subquery().label("paid_total"),
                select(func.count()).select_from(PaymentOrder).where(PaymentOrder.status == paid_status, PaymentOrder.paid_at >= start_of_24h).scalar_subquery().label("paid_last_24h"),
                select(func.count()).select_from(PaymentOrder).where(PaymentOrder.status == paid_status, PaymentOrder.paid_at >= start_of_7_days).scalar_subquery().label("paid_last_7_days"),
                select(func.count()).select_from(PaymentOrder).where(PaymentOrder.status == paid_status, PaymentOrder.paid_at >= start_of_30_days).scalar_subquery().label("paid_last_30_days"),
                select(func.coalesce(func.sum(PaymentOrder.amount_rubles), 0)).where(PaymentOrder.status == paid_status, PaymentOrder.paid_at >= start_of_30_days).scalar_subquery().label("revenue_rub_last_30_days"),
                select(func.coalesce(func.sum(PaymentOrder.tokens_to_credit), 0)).where(PaymentOrder.status == paid_status, PaymentOrder.paid_at >= start_of_30_days).scalar_subquery().label("tokens_sold_last_30_days"),
            )
        )
    ).one()

    return AdminPaymentsStatsResponse(
        paid_total=_to_int(stats_row.paid_total),
        paid_last_24h=_to_int(stats_row.paid_last_24h),
        paid_last_7_days=_to_int(stats_row.paid_last_7_days),
        paid_last_30_days=_to_int(stats_row.paid_last_30_days),
        revenue_rub_last_30_days=_to_int(stats_row.revenue_rub_last_30_days),
        tokens_sold_last_30_days=_to_int(stats_row.tokens_sold_last_30_days),
    )
