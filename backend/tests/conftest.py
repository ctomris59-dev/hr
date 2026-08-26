"""
Pytest configuration and fixtures for FastAPI backend tests.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from typing import Generator
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """
    FastAPI TestClient fixture.
    Provides a test client for making HTTP requests to the API.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_org_chart_repo():
    """Mock OrgChartRepository for testing."""
    repo = Mock()
    repo.get_all.return_value = []
    repo.find_by_name.return_value = None
    repo.update_by_name.return_value = False
    repo.exists.return_value = True
    return repo


@pytest.fixture
def mock_evaluation_360_repo():
    """Mock Evaluation360Repository for testing."""
    repo = Mock()
    repo.get_all.return_value = []
    repo.find_by_employee.return_value = None
    repo.exists.return_value = True
    return repo


@pytest.fixture
def mock_roles_repo():
    """Mock RolesRepository for testing."""
    repo = Mock()
    repo.get_all.return_value = []
    repo.get_default_roles.return_value = [
        {"id": "ceo", "name": "CEO / Genel Müdür", "rank": 1},
        {"id": "director", "name": "Direktör", "rank": 2},
        {"id": "manager", "name": "Müdür", "rank": 3},
        {"id": "employee", "name": "Personel", "rank": 4},
    ]
    repo.exists.return_value = True
    return repo


@pytest.fixture
def sample_employees():
    """Sample employee data for testing."""
    return [
        {
            "Ad Soyad": "Ahmet Yılmaz",
            "Pozisyon": "Satış Müdürü",
            "Departman": "Satış",
            "Performans": 4.5,
            "Potansiyel": 4.0,
        },
        {
            "Ad Soyad": "Mehmet Demir",
            "Pozisyon": "Satış Uzmanı",
            "Departman": "Satış",
            "Performans": 3.5,
            "Potansiyel": 3.0,
        },
        {
            "Ad Soyad": "Ayşe Kaya",
            "Pozisyon": "İK Direktörü",
            "Departman": "İnsan Kaynakları",
            "Performans": 5.0,
            "Potansiyel": 4.5,
        },
        {
            "Ad Soyad": "Fatma Şahin",
            "Pozisyon": "İK Uzmanı",
            "Departman": "İnsan Kaynakları",
            "Performans": 4.0,
            "Potansiyel": 3.5,
        },
    ]


@pytest.fixture
def sample_360_evaluations():
    """Sample 360 evaluation data for testing."""
    return [
        {
            "Personel": "Ahmet Yılmaz",
            "Departman": "Satış",
            "Pozisyon": "Satış Müdürü",
            "Performans": 4.5,
            "ANA_Mgr": 4.0,
            "COM_Mgr": 4.5,
            "LID_Mgr": 4.0,
        },
        {
            "Personel": "Mehmet Demir",
            "Departman": "Satış",
            "Pozisyon": "Satış Uzmanı",
            "Performans": 3.5,
            "ANA_Mgr": 3.0,
            "COM_Mgr": 4.0,
            "LID_Mgr": 3.0,
        },
    ]


@pytest.fixture
def mock_is_data_cleared():
    """Mock is_data_cleared function."""
    with patch("app_state.is_data_cleared", return_value=False):
        yield

