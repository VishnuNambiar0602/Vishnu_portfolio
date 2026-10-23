import pandas as pd
import pytest

from restaurant_ml import data, footfall, forecast


@pytest.fixture(scope="module")
def df():
    return data.synthetic(days=300, seed=1)


def test_synthetic_is_reproducible_and_has_schema(df):
    assert list(df.columns) == data.REQUIRED
    pd.testing.assert_frame_equal(df, data.synthetic(days=300, seed=1))


def test_load_rejects_missing_columns(tmp_path):
    p = tmp_path / "bad.csv"
    pd.DataFrame({"Date": ["2024-01-01"]}).to_csv(p, index=False)
    with pytest.raises(ValueError, match="missing columns"):
        data.load(p)


def test_footfall_features_exclude_revenue_and_target(df):
    x, y = footfall.features(df)
    assert not any(c.startswith("Revenue") or c == "Footfall_Count" for c in x.columns)
    assert len(x) == len(y)


def test_footfall_evaluation_runs_on_time_ordered_split(df):
    assert footfall.evaluate(df)["test_days"] > 0


def test_forecast_horizon_and_positive_values(df):
    out = forecast.forecast_future(df, 14)
    assert len(out) == 14 and (out["Predicted_Revenue"] > 0).all()


def test_exported_model_matches_sklearn(df):
    from restaurant_ml import export
    from sklearn.ensemble import GradientBoostingRegressor

    m = export.export_footfall(df)
    x, y = footfall.features(df)
    cut = int(len(x) * 0.8)
    ref = GradientBoostingRegressor(random_state=42).fit(x.iloc[:cut], y.iloc[:cut])
    for i in (0, 10, 50, len(x) - 1):
        row = x.iloc[i].to_dict()
        assert abs(export.predict(m, row) - ref.predict(x.iloc[[i]])[0]) < 1e-3
