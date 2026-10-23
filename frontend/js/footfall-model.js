// Browser evaluation of the gradient-boosting footfall model exported by
// projects/restaurant-forecasting (restaurant_ml/export.py): init + learning_rate * sum(tree outputs).
// scikit-learn compares features as float32, so inputs go through Math.fround.
export class FootfallModel {
  constructor(m) { this.m = m; this.index = new Map(m.features.map((f, i) => [f, i])); }

  vector(row) {
    const v = new Float32Array(this.m.features.length);
    for (const [k, val] of Object.entries(row)) if (this.index.has(k)) v[this.index.get(k)] = val;
    return v;
  }

  predictRow(row) {
    const v = this.vector(row);
    let total = this.m.init;
    for (const t of this.m.trees) {
      let n = 0;
      while (t.left[n] !== -1) n = Math.fround(v[t.feature[n]]) <= t.threshold[n] ? t.left[n] : t.right[n];
      total += this.m.learning_rate * t.value[n];
    }
    return total;
  }

  // Builds the feature row from friendly inputs.
  row({ day, weather, promo, marketing, price, reviews, lag1, lag7 }) {
    return {
      Menu_Price: price, Marketing_Spend: marketing, Promotions: promo ? 1 : 0, Reviews: reviews,
      Footfall_Lag_1: lag1, Footfall_Lag_7: lag7,
      [`Weather_${weather}`]: 1, [`Day_of_Week_${day}`]: 1,
    };
  }

  predict(inputs) { return this.predictRow(this.row(inputs)); }
}
