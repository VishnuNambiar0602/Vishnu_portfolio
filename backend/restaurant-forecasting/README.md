# Restaurant Demand Forecasting

Two forecasting tasks on daily restaurant data: **revenue** (SARIMA) and **footfall** (random forest and gradient boosting). Built as a second-year internal project, since rebuilt to run reproducibly from a clean checkout.

## Run

```bash
pip install -r requirements.txt
python -m restaurant_ml report              # writes results/metrics.json
python -m restaurant_ml forecast --days 14  # next 14 days of revenue
python -m restaurant_ml footfall            # footfall model scores
python -m pytest
```

Pass `--csv your.csv` to use your own data. The schema is in `restaurant_ml/data.py` (`Date`, `Footfall_Count`, `Revenue`, `Menu_Price`, `Average_Customer_Spending`, `Marketing_Spend`, `Promotions`, `Reviews`, `Weather`, `Day_of_Week`).

## Evaluation

Every split is time-ordered: models train on the earlier days and are scored on the final days.

| Task | Model | RMSE | MAE | MAPE |
|---|---|---|---|---|
| Revenue, last 60 days | Seasonal naive (repeat last week) | 730.8 | 580.5 | 17.3% |
| Revenue, last 60 days | SARIMA(1,1,1)(1,1,1,7) | **486.0** | **400.4** | **11.7%** |
| Footfall, last 145 days | Same day last week | 22.2 | 17.4 | 14.8% |
| Footfall, last 145 days | Random forest | 14.8 | 11.8 | 9.1% |
| Footfall, last 145 days | Gradient boosting | **14.1** | **11.5** | **9.0%** |

**These numbers come from synthetic data** (`data.synthetic`, seed 42, 730 days) because the original CSV is not in the repository. They show the pipeline working and beating a baseline; they say nothing about a real restaurant. Re-run with `--csv` on real data to get real figures.

## What changed from the original

- The original footfall model took `Monthly_Revenue` as an input. Revenue is footfall times spend, so that leaked the answer. It is excluded now.
- The original used a random train/test split on lagged time-series features. It now splits by time.
- Scripts that called `input()` and `plt.show()` are now a CLI that prints or writes JSON.
- The Swiggy delivery-time analysis was dropped. It depended on `Rider-Info.csv`, which is not available, so it could not be run or checked.
- Added a baseline for each task, a data-schema check and tests.
