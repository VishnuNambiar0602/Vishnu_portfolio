import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib


def load_data():
    data = pd.read_csv('data.csv')
    X = data.drop('target', axis=1)
    y = data['target']
    return train_test_split(X, y, test_size=0.2, random_state=42)


def train_model(X_train, y_train):
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    model.fit(X_train, y_train)
    return model


def evaluate_model(model, X_test, y_test):
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Model Accuracy: {accuracy:.4f}")
    return accuracy


def save_model(model, filepath='model.pkl'):
    joblib.dump(model, filepath)
    print(f"Model saved to {filepath}")


def main():
    X_train, X_test, y_train, y_test = load_data()
    model = train_model(X_train, y_train)
    evaluate_model(model, X_test, y_test)
    save_model(model)


if __name__ == "__main__":
    main()
