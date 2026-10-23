"""Daily revenue forecast. SARIMA is compared with a seasonal-naive baseline on a time-ordered holdout."""
import warnings

import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

from .metrics import score

ORDER, SEASONAL = (1, 1, 1), (1, 1, 1, 7)


def seasonal_naive(train: pd.Series, steps: int, period: int = 7) -> list[float]:
    last = train.iloc[-period:].to_numpy()
    return [float(last[i % period]) for i in range(steps)]


def fit(series: pd.Series):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return SARIMAX(series, order=ORDER, seasonal_order=SEASONAL).fit(disp=False)


def evaluate(df: pd.DataFrame, holdout_days: int = 60) -> dict:
    ts = df.set_index("Date")["Revenue"].asfreq("D")
    train, test = ts.iloc[:-holdout_days], ts.iloc[-holdout_days:]
    pred = fit(train).forecast(holdout_days)
    return {
        "holdout_days": holdout_days,
        "sarima": score(test, pred),
        "seasonal_naive": score(test, seasonal_naive(train, holdout_days)),
        "series": {
            "date": [d.strftime("%Y-%m-%d") for d in ts.index[-120:]],
            "actual": [round(v, 2) for v in ts.iloc[-120:]],
            "test_start": test.index[0].strftime("%Y-%m-%d"),
            "predicted": [round(float(v), 2) for v in pred],
        },
    }


def forecast_future(df: pd.DataFrame, days: int = 30) -> pd.DataFrame:
    ts = df.set_index("Date")["Revenue"].asfreq("D")
    pred = fit(ts).forecast(days)
    return pd.DataFrame({"Date": pred.index, "Predicted_Revenue": pred.round(2).to_numpy()})
