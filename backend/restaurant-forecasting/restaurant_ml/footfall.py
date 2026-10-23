"""Footfall prediction. Features are known before the day starts (calendar, weather, promotion,
marketing spend, price, yesterday's and last week's footfall). Revenue is excluded on purpose:
it is a product of footfall, so using it as an input leaks the answer."""
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

from .metrics import score


def features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    d = df.copy()
    d["Footfall_Lag_1"] = d["Footfall_Count"].shift(1)
    d["Footfall_Lag_7"] = d["Footfall_Count"].shift(7)
    d = d.dropna(subset=["Footfall_Lag_1", "Footfall_Lag_7"])
    x = pd.get_dummies(
        d[["Menu_Price", "Marketing_Spend", "Promotions", "Reviews", "Weather", "Day_of_Week",
           "Footfall_Lag_1", "Footfall_Lag_7"]],
        columns=["Weather", "Day_of_Week"],
    ).astype(float)
    return x, d["Footfall_Count"]


def evaluate(df: pd.DataFrame, test_fraction: float = 0.2) -> dict:
    x, y = features(df)
    cut = int(len(x) * (1 - test_fraction))
    xtr, xte, ytr, yte = x.iloc[:cut], x.iloc[cut:], y.iloc[:cut], y.iloc[cut:]
    out = {"test_days": len(yte), "baseline_last_week": score(yte, xte["Footfall_Lag_7"])}
    for name, model in {
        "random_forest": RandomForestRegressor(n_estimators=200, random_state=42),
        "gradient_boosting": GradientBoostingRegressor(random_state=42),
    }.items():
        model.fit(xtr, ytr)
        out[name] = score(yte, model.predict(xte))
    return out
