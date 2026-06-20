"""Backend tests for Geo-Energy Intelligence API"""
import pytest
import requests
import os

BASE_URL = os.environ.get('NEXT_PUBLIC_BACKEND_URL', 'https://4e4622e4-745e-4f0a-ba9f-0ed2827d301c.preview.emergentagent.com').rstrip('/')


class TestHealth:
    """Health check tests"""

    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


class TestAnalyzeRegion:
    """Tests for /api/analyze-region"""

    def test_solar_analysis(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "solar"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "success"
        assert data["solar"] is not None
        assert data["wind"] is None
        assert "avg_ghi_kwh_m2_day" in data["solar"]
        assert "peak_capacity_mw" in data["solar"]
        assert "capacity_factor" in data["solar"]
        assert "summary" in data
        assert data["summary"]["energy_type"] == "solar"

    def test_wind_analysis(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "wind"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["wind"] is not None
        assert data["solar"] is None
        assert "avg_wind_speed_ms" in data["wind"]

    def test_combined_analysis(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "both"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["solar"] is not None
        assert data["wind"] is not None

    def test_summary_cards_fields(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "solar"
        })
        data = r.json()
        s = data["summary"]
        assert "suitability_percentage" in s
        assert "feasibility_score" in s
        assert "area_ha" in s
        assert "annual_energy_mwh" in s

    def test_infrastructure_and_risk(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "solar"
        })
        data = r.json()
        assert "infrastructure" in data
        assert "risk_factors" in data
        assert len(data["risk_factors"]) >= 2
        for rf in data["risk_factors"]:
            assert "factor" in rf
            assert "value" in rf
            assert rf["risk"] in ["low", "medium", "high"]

    def test_heatmap_geojson_returned(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "solar"
        })
        data = r.json()
        hmap = data["heatmap_geojson"]
        assert hmap["type"] == "FeatureCollection"
        assert len(hmap["features"]) > 0

    def test_invalid_energy_type(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 35, "max_lng": 15,
            "energy_type": "nuclear"
        })
        assert r.status_code == 422

    def test_area_too_small(self):
        r = requests.post(f"{BASE_URL}/api/analyze-region", json={
            "min_lat": 30, "min_lng": 10, "max_lat": 30.001, "max_lng": 10.001,
            "energy_type": "solar"
        })
        assert r.status_code == 400
