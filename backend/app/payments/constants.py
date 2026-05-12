# Белый список тарифов пополнения (рубли и токены) — совпадает с карточками на экране профиля.
from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True, slots=True)
class TopUpPlan:
    """Один тариф: ключ для API, рубли и зачисляемые токены."""

    key: str
    amount_rubles: int
    tokens: int


# Синхронно с frontend/src/components/pages/ProfilePage/constants/profilePageConstants.ts
TOP_UP_PLANS: Final[tuple[TopUpPlan, ...]] = (
    TopUpPlan(key="start", amount_rubles=439, tokens=70),
    TopUpPlan(key="balance", amount_rubles=890, tokens=180),
    TopUpPlan(key="stream", amount_rubles=1490, tokens=330),
)

_PLANS_BY_KEY: Final[dict[str, TopUpPlan]] = {p.key: p for p in TOP_UP_PLANS}


def get_plan_by_key(plan_key: str) -> TopUpPlan | None:
    """Возвращает тариф по ключу или None, если ключ неизвестен."""
    return _PLANS_BY_KEY.get(plan_key.strip().lower())
