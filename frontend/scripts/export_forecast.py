"""Copy the exported footfall model into the site and write scikit-learn reference predictions
so scripts/check_forecast_parity.mjs can prove the browser model matches. Needs the projects repo
checked out next to this one (see README)."""
import json, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "backend"
sys.path.insert(0, str(PROJECTS / "restaurant-forecasting"))
from sklearn.ensemble import GradientBoostingRegressor  # noqa: E402
from restaurant_ml import data, export, footfall  # noqa: E402

df = data.synthetic()
model = export.export_footfall(df)
(ROOT / "data/footfall_model.json").write_text(json.dumps(model, separators=(",", ":")))

x, y = footfall.features(df)
cut = int(len(x) * 0.8)
ref = GradientBoostingRegressor(random_state=42).fit(x.iloc[:cut], y.iloc[:cut])
rng = random.Random(3)
days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
cases = []
for _ in range(60):
    row = {f: 0.0 for f in model["features"]}
    d, w = rng.choice(days), rng.choice(["Sunny", "Rainy", "Snowy"])
    row.update({"Menu_Price": rng.uniform(12, 16), "Marketing_Spend": rng.uniform(300, 1500), "Promotions": rng.choice([0, 1]),
                "Reviews": rng.uniform(3, 5), "Footfall_Lag_1": rng.uniform(50, 200), "Footfall_Lag_7": rng.uniform(50, 200),
                f"Weather_{w}": 1.0, f"Day_of_Week_{d}": 1.0})
    import pandas as pd
    pred = float(ref.predict(pd.DataFrame([row])[model["features"]])[0])
    cases.append({"row": row, "pred": pred})
(ROOT / "data/forecast_reference.json").write_text(json.dumps(cases))
print(len(cases), "reference cases")
