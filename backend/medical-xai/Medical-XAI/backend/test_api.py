"""API smoke tests: run with `pytest` from this folder."""
import pytest

from app import app


@pytest.fixture()
def client():
    return app.test_client()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.get_json() == {"status": "healthy", "model_loaded": True}


def test_diagnose_ranks_flu_for_flu_symptoms(client):
    r = client.post("/diagnose", json={"symptoms": "fever, cough, sore throat, fatigue, chills", "days": 3})
    body = r.get_json()
    assert r.status_code == 200
    assert body["diseases"][0]["disease_id"] == "flu"
    assert {"tfidf_component", "match_component", "final_score"} <= set(body["diseases"][0]["xai"]["scoring_breakdown"])


def test_diagnose_rejects_empty_input(client):
    assert client.post("/diagnose", json={"symptoms": "  "}).status_code == 400


def test_debug_is_off_by_default():
    import os
    assert os.environ.get("FLASK_DEBUG", "False").lower() != "true"
