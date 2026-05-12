# Пакет balance: токены на счёте пользователя, чтение баланса и атомарные начисления/списания в БД.
# Роутер монтируется в main с префиксом /api; бизнес-логику генераций позже вызывать из app.balance.service.

from app.balance.router import router as balance_router
from app.balance.service import add_tokens, get_balance, try_spend_tokens

__all__ = [
    "add_tokens",
    "balance_router",
    "get_balance",
    "try_spend_tokens",
]
