"""
Integration tests for /api/org-chart endpoint.
Tests the full request/response cycle including authentication and business logic.
"""
import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from urllib.parse import quote


class TestOrgChartEndpoint:
    """Integration tests for org-chart endpoint."""
    
    def test_get_org_chart_success_ceo(self, client: TestClient, sample_employees):
        """CEO should get all org chart data."""
        with patch("domain.services.org_chart_service.OrgChartRepository") as mock_repo_class:
            mock_repo = Mock()
            mock_repo.get_all.return_value = sample_employees
            mock_repo_class.return_value = mock_repo
            
            with patch("app_state.is_data_cleared", return_value=False):
                with patch("services.hierarchy_service.filter_data_by_hierarchy") as mock_filter:
                    mock_filter.return_value = sample_employees
                    
                    response = client.get(
                        "/api/org-chart",
                        headers={
                            "x-user-role": "CEO",
                            "x-user-dept": quote("Yönetim"),
                            "x-user-name": "CEO User"
                        }
                    )
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert data["success"] is True
                    assert "data" in data
    
    def test_get_org_chart_success_director_filtered(self, client: TestClient, sample_employees):
        """Director should get only their department data."""
        with patch("domain.services.org_chart_service.OrgChartRepository") as mock_repo_class:
            mock_repo = Mock()
            mock_repo.get_all.return_value = sample_employees
            mock_repo_class.return_value = mock_repo
            
            with patch("app_state.is_data_cleared", return_value=False):
                with patch("services.hierarchy_service.filter_data_by_hierarchy") as mock_filter:
                    # Director should only see Satış department
                    filtered = [e for e in sample_employees if e["Departman"] == "Satış"]
                    mock_filter.return_value = filtered
                    
                    response = client.get(
                        "/api/org-chart",
                        headers={
                            "x-user-role": "DIRECTOR",
                            "x-user-dept": quote("Satış"),
                            "x-user-name": "Director User"
                        }
                    )
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert data["success"] is True
                    assert len(data["data"]) == 2  # Only Satış employees
    
    def test_get_org_chart_forbidden_employee(self, client: TestClient):
        """Employee should get 403 Forbidden."""
        response = client.get(
            "/api/org-chart",
            headers={
                "x-user-role": "EMPLOYEE",
                "x-user-dept": quote("Satış"),
                "x-user-name": "Employee User"
            }
        )
        
        assert response.status_code == 403
        assert "Yasak" in response.json().get("error", "") or "Forbidden" in response.text
    
    def test_get_org_chart_empty_when_data_cleared(self, client: TestClient):
        """Should return empty data when data is cleared."""
        with patch("domain.services.org_chart_service.is_data_cleared", return_value=True):
            response = client.get(
                "/api/org-chart",
                headers={
                    "x-user-role": "CEO",
                    "x-user-dept": quote("Yönetim"),
                    "x-user-name": "CEO User"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"] == []
    
    def test_get_org_chart_missing_headers(self, client: TestClient):
        """Should work with missing headers (defaults to EMPLOYEE)."""
        response = client.get("/api/org-chart")
        
        # Should get 403 because default role is EMPLOYEE
        assert response.status_code == 403


class Test360DataEndpoint:
    """Integration tests for 360-data endpoint."""
    
    def test_save_360_data_success(self, client: TestClient):
        """Should successfully save 360 evaluation data."""
        with patch("domain.services.evaluation_360_service.Evaluation360Repository") as mock_eval_repo_class:
            with patch("domain.services.evaluation_360_service.OrgChartRepository") as mock_org_repo_class:
                mock_eval_repo = Mock()
                mock_org_repo = Mock()
                mock_eval_repo_class.return_value = mock_eval_repo
                mock_org_repo_class.return_value = mock_org_repo
                mock_org_repo.update_by_name.return_value = True
                
                request_data = {
                    "personel": "Ahmet Yılmaz",
                    "departman": "Satış",
                    "pozisyon": "Satış Müdürü",
                    "eval_type": "1. Yönetici",
                    "competencies": {"ANA": 4.0, "COM": 4.5},
                    "performans": 4.5,
                    "is_star_performer": True
                }
                
                response = client.post("/api/360-data", json=request_data)
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert "message" in data
                
                # Verify repository was called
                mock_eval_repo.upsert.assert_called_once()
                mock_org_repo.update_by_name.assert_called_once()
    
    def test_save_360_data_missing_personel(self, client: TestClient):
        """Should reject request without personel name."""
        request_data = {
            "departman": "Satış",
            "competencies": {},
            "performans": 4.0
        }
        
        response = client.post("/api/360-data", json=request_data)
        
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        fields = data.get("details", {}).get("fields", {})
        assert "body.personel" in fields
    
    def test_get_360_data_success(self, client: TestClient, sample_360_evaluations):
        """Should successfully retrieve 360 evaluation data."""
        with patch("domain.services.evaluation_360_service.Evaluation360Repository") as mock_repo_class:
            mock_repo = Mock()
            mock_repo.get_all.return_value = sample_360_evaluations
            mock_repo_class.return_value = mock_repo
            
            with patch("app_state.is_data_cleared", return_value=False):
                response = client.get("/api/360-data")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert len(data["data"]) == 2
    
    def test_get_360_data_empty_when_cleared(self, client: TestClient):
        """Should return empty data when cleared."""
        with patch("domain.services.org_chart_service.is_data_cleared", return_value=True):
            response = client.get("/api/360-data")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"] == []


class TestRolesEndpoint:
    """Integration tests for roles endpoint."""
    
    def test_get_roles_success(self, client: TestClient):
        """Should successfully retrieve roles."""
        with patch("domain.services.roles_service.RolesRepository") as mock_repo_class:
            mock_repo = Mock()
            mock_repo.exists.return_value = True
            mock_repo.get_all.return_value = [
                {"id": "ceo", "name": "CEO", "rank": 1},
                {"id": "director", "name": "Direktör", "rank": 2},
                {"id": "manager", "name": "Müdür", "rank": 3},
                {"id": "employee", "name": "Personel", "rank": 4},
            ]
            mock_repo.get_default_roles.return_value = [
                {"id": "ceo", "name": "CEO", "rank": 1},
                {"id": "director", "name": "Direktör", "rank": 2},
                {"id": "manager", "name": "Müdür", "rank": 3},
                {"id": "employee", "name": "Personel", "rank": 4},
            ]
            mock_repo_class.return_value = mock_repo
            
            response = client.get("/api/roles")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert len(data["data"]) == 4
    
    def test_update_roles_success(self, client: TestClient):
        """Should successfully update roles."""
        with patch("domain.services.roles_service.RolesRepository") as mock_repo_class:
            mock_repo = Mock()
            mock_repo_class.return_value = mock_repo
            
            request_data = {
                "roles": [
                    {"id": "ceo", "name": "CEO", "rank": 1, "permissions": {}},
                    {"id": "director", "name": "Direktör", "rank": 2, "permissions": {}},
                    {"id": "manager", "name": "Müdür", "rank": 3, "permissions": {}},
                    {"id": "employee", "name": "Personel", "rank": 4, "permissions": {}},
                ]
            }
            
            response = client.post("/api/roles/update", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            mock_repo.save_all.assert_called_once()
    
    def test_update_roles_validation_error(self, client: TestClient):
        """Should reject invalid roles update."""
        with patch("domain.services.roles_service.RolesRepository") as mock_repo_class:
            mock_repo = Mock()
            mock_repo_class.return_value = mock_repo
            
            # Only 3 roles (should be 4)
            request_data = {
                "roles": [
                    {"id": "ceo", "name": "CEO", "rank": 1},
                    {"id": "director", "name": "Direktör", "rank": 2},
                    {"id": "manager", "name": "Müdür", "rank": 3},
                ]
            }
            
            response = client.post("/api/roles/update", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "4 rol" in data["error"].lower()
            mock_repo.save_all.assert_not_called()

