# Схемы для ручки создания счёта ЮMoney: клиент передаёт только ключ тарифа с серверной проверкой.
from pydantic import BaseModel, Field


class YooMoneyCheckoutRequest(BaseModel):
    """Выбор пакета по ключу, известному серверу (start | balance | stream)."""

    plan_key: str = Field(min_length=3, max_length=32)


class YooMoneyCheckoutResponse(BaseModel):
    """Ссылка для перехода на страницу оплаты ЮMoney (quickpay)."""

    pay_url: str
