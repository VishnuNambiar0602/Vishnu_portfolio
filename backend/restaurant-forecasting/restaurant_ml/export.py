"""Export the trained footfall model as plain JSON so it can run outside Python (the portfolio site
evaluates the same trees in the browser). Gradient boosting is a constant plus a scaled sum of trees."""
import json

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

from .footfall import features
from .metrics import score


def export_footfall(df, test_fraction: float = 0.2) -> dict:
    x, y = features(df)
    cut = int(len(x) * (1 - test_fraction))
    model = GradientBoostingRegressor(random_state=42).fit(x.iloc[:cut], y.iloc[:cut])
    err = score(y.iloc[cut:], model.predict(x.iloc[cut:]))
    trees = []
    for est in model.estimators_[:, 0]:
        t = est.tree_
        trees.append({
            "left": t.children_left.tolist(), "right": t.children_right.tolist(),
            "feature": t.feature.tolist(), "threshold": t.threshold.tolist(),
            "value": t.value[:, 0, 0].tolist(),
        })
    train = df.iloc[:cut]
    return {
        "features": list(x.columns),
        "init": float(model.init_.constant_[0][0]),
        "learning_rate": float(model.learning_rate),
        "trees": trees,
        "test": {"days": int(len(y) - cut), **err},
        "typical": {
            "marketing": float(train["Marketing_Spend"].median()), "price": float(train["Menu_Price"].median()),
            "reviews": float(train["Reviews"].median()),
            "by_weekday_footfall": {d: float(g["Footfall_Count"].median()) for d, g in train.groupby("Day_of_Week")},
        },
        "ranges": {k: [float(train[k].min()), float(train[k].max())] for k in ("Marketing_Spend", "Menu_Price", "Reviews")},
        "spend_per_customer": float(train["Average_Customer_Spending"].median()),
    }


def predict(model: dict, row: dict) -> float:
    """Reference implementation of the JSON model (used by tests; mirrors the browser code)."""
    vec = np.array([row[f] for f in model["features"]], dtype=np.float32)
    total = model["init"]
    for t in model["trees"]:
        n = 0
        while t["left"][n] != -1:
            n = t["left"][n] if vec[t["feature"][n]] <= t["threshold"][n] else t["right"][n]
        total += model["learning_rate"] * t["value"][n]
    return float(total)
