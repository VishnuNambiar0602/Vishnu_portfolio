"""Dataset loading and a seeded synthetic generator.

The original project used a private CSV that is not in the repository. `load` accepts a CSV with
the same schema, and `synthetic` produces a stand-in with the same columns so the pipeline can run
and be tested anywhere.
"""
from pathlib import Path

import numpy as np
import pandas as pd

REQUIRED = [
    "Date", "Footfall_Count", "Revenue", "Menu_Price", "Average_Customer_Spending",
    "Marketing_Spend", "Promotions", "Reviews", "Weather", "Day_of_Week",
]


def synthetic(days: int = 730, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2023-01-01", periods=days, freq="D")
    dow = dates.dayofweek.to_numpy()
    weekday_lift = np.array([0.85, 0.80, 0.85, 0.95, 1.20, 1.45, 1.35])[dow]
    trend = 1 + 0.15 * np.arange(days) / days
    weather = rng.choice(["Sunny", "Rainy", "Snowy"], size=days, p=[0.65, 0.28, 0.07])
    weather_lift = pd.Series(weather).map({"Sunny": 1.0, "Rainy": 0.86, "Snowy": 0.7}).to_numpy()
    promo = (rng.random(days) < 0.18).astype(int)
    marketing = rng.normal(900, 150, days).clip(300)
    reviews = rng.normal(4.1, 0.25, days).clip(3, 5)
    price = 14 + 0.5 * np.sin(np.arange(days) / 90) + rng.normal(0, 0.15, days)

    footfall = (
        110 * weekday_lift * trend * weather_lift * (1 + 0.18 * promo)
        * (1 + 0.00008 * (marketing - 900)) * (1 + 0.04 * (reviews - 4.1))
    )
    footfall = rng.normal(footfall, 6).clip(10).round().astype(int)
    spend = price * rng.normal(1.9, 0.08, days)
    revenue = footfall * spend + rng.normal(0, 60, days)
    return pd.DataFrame({
        "Date": dates, "Footfall_Count": footfall, "Revenue": revenue.round(2),
        "Menu_Price": price.round(2), "Average_Customer_Spending": spend.round(2),
        "Marketing_Spend": marketing.round(2), "Promotions": promo, "Reviews": reviews.round(2),
        "Weather": weather, "Day_of_Week": dates.day_name(),
    })


def load(path: str | Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["Date"])
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise ValueError(f"{path}: missing columns {missing}")
    return df.sort_values("Date").reset_index(drop=True)
