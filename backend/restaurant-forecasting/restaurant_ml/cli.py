import argparse
import json
from pathlib import Path

from . import data, export, footfall, forecast


def main(argv=None):
    ap = argparse.ArgumentParser(prog="restaurant_ml", description="Restaurant demand forecasting")
    ap.add_argument("task", choices=["forecast", "footfall", "report", "export-model"])
    ap.add_argument("--csv", help="CSV with the schema in restaurant_ml/data.py (default: synthetic data)")
    ap.add_argument("--days", type=int, default=30, help="forecast horizon for the forecast task")
    ap.add_argument("--out", default="results", help="output directory for the report task")
    args = ap.parse_args(argv)

    df = data.load(args.csv) if args.csv else data.synthetic()
    if args.task == "forecast":
        print(forecast.forecast_future(df, args.days).to_string(index=False))
    elif args.task == "export-model":
        out = Path(args.out)
        out.mkdir(exist_ok=True)
        (out / "footfall_model.json").write_text(json.dumps(export.export_footfall(df), separators=(",", ":")))
        print(f"wrote {out / 'footfall_model.json'}")
    elif args.task == "footfall":
        print(json.dumps(footfall.evaluate(df), indent=2))
    else:
        out = Path(args.out)
        out.mkdir(exist_ok=True)
        report = {
            "data": "user csv" if args.csv else "synthetic (seed 42, 730 days)",
            "revenue_forecast": forecast.evaluate(df),
            "footfall": footfall.evaluate(df),
        }
        (out / "metrics.json").write_text(json.dumps(report, indent=2))
        rf = report["revenue_forecast"]
        print(json.dumps({"data": report["data"], "footfall": report["footfall"],
                          "revenue": {k: rf[k] for k in ("holdout_days", "sarima", "seasonal_naive")}}, indent=2))


if __name__ == "__main__":
    main()
