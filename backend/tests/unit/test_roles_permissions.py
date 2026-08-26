"""
Unit tests for roles and permissions logic.
Tests role repository and service business rules.
"""
import pytest
from unittest.mock import Mock, patch
from domain.services.roles_service import RolesService
from repositories.roles_repository import RolesRepository


class TestRolesService:
    """Test RolesService business logic."""
    
    def test_get_all_roles_returns_defaults_when_file_not_exists(self):
        """Should return default roles when file doesn't exist."""
        mock_repo = Mock(spec=RolesRepository)
        mock_repo.exists.return_value = False
        mock_repo.get_default_roles.return_value = [
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            {"id": "manager", "name": "Müdür", "rank": 3},
            {"id": "employee", "name": "Personel", "rank": 4},
        ]
        
        service = RolesService(mock_repo)
        result = service.get_all_roles()
        
        assert result["success"] is True
        assert len(result["data"]) == 4
        assert result["data"][0]["id"] == "ceo"
    
    def test_get_all_roles_merges_missing_roles(self):
        """Should merge missing roles from defaults."""
        mock_repo = Mock(spec=RolesRepository)
        mock_repo.exists.return_value = True
        mock_repo.get_all.return_value = [
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            # Missing manager and employee
        ]
        mock_repo.get_default_roles.return_value = [
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            {"id": "manager", "name": "Müdür", "rank": 3},
            {"id": "employee", "name": "Personel", "rank": 4},
        ]
        
        service = RolesService(mock_repo)
        result = service.get_all_roles()
        
        assert result["success"] is True
        assert len(result["data"]) == 4
        # Should be sorted by rank
        assert result["data"][0]["rank"] == 1
        assert result["data"][-1]["rank"] == 4
    
    def test_get_all_roles_validates_manager_exists(self):
        """Should ensure manager role exists."""
        mock_repo = Mock(spec=RolesRepository)
        mock_repo.exists.return_value = True
        mock_repo.get_all.return_value = [
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            {"id": "employee", "name": "Personel", "rank": 4},
            # Missing manager
        ]
        mock_repo.get_default_roles.return_value = [
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            {"id": "manager", "name": "Müdür", "rank": 3},
            {"id": "employee", "name": "Personel", "rank": 4},
        ]
        
        service = RolesService(mock_repo)
        result = service.get_all_roles()
        
        # Should add missing manager
        role_ids = [r["id"] for r in result["data"]]
        assert "manager" in role_ids
    
    def test_update_roles_validates_minimum_4_roles(self):
        """Should reject updates with less than 4 roles."""
        mock_repo = Mock(spec=RolesRepository)
        service = RolesService(mock_repo)
        
        result = service.update_roles([
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            {"id": "manager", "name": "Müdür", "rank": 3},
            # Only 3 roles
        ])
        
        assert result["success"] is False
        assert "4 rol" in result["error"].lower()
        mock_repo.save_all.assert_not_called()
    
    def test_update_roles_validates_manager_exists(self):
        """Should reject updates without manager role."""
        mock_repo = Mock(spec=RolesRepository)
        service = RolesService(mock_repo)
        
        result = service.update_roles([
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "director", "name": "Direktör", "rank": 2},
            {"id": "employee1", "name": "Personel 1", "rank": 4},
            {"id": "employee2", "name": "Personel 2", "rank": 5},
            # Missing manager
        ])
        
        assert result["success"] is False
        assert "müdür" in result["error"].lower()
        mock_repo.save_all.assert_not_called()
    
    def test_update_roles_sorts_by_rank(self):
        """Should sort roles by rank before saving."""
        mock_repo = Mock(spec=RolesRepository)
        service = RolesService(mock_repo)
        
        unsorted_roles = [
            {"id": "employee", "name": "Personel", "rank": 4},
            {"id": "ceo", "name": "CEO", "rank": 1},
            {"id": "manager", "name": "Müdür", "rank": 3},
            {"id": "director", "name": "Direktör", "rank": 2},
        ]
        
        result = service.update_roles(unsorted_roles)
        
        assert result["success"] is True
        # Verify roles were sorted before saving
        saved_roles = mock_repo.save_all.call_args[0][0]
        assert saved_roles[0]["rank"] == 1
        assert saved_roles[-1]["rank"] == 4
    
    def test_update_roles_rejects_empty_list(self):
        """Should reject empty roles list."""
        mock_repo = Mock(spec=RolesRepository)
        service = RolesService(mock_repo)
        
        result = service.update_roles([])
        
        assert result["success"] is False
        assert "boş" in result["error"].lower()
        mock_repo.save_all.assert_not_called()


class TestRolesRepository:
    """Test RolesRepository data access."""
    
    def test_get_default_roles_returns_4_roles(self):
        """Default roles should always return 4 roles."""
        repo = RolesRepository()
        default_roles = repo.get_default_roles()
        
        assert len(default_roles) == 4
        role_ids = [r["id"] for r in default_roles]
        assert "ceo" in role_ids
        assert "director" in role_ids
        assert "manager" in role_ids
        assert "employee" in role_ids
    
    def test_get_default_roles_sorted_by_rank(self):
        """Default roles should be sorted by rank."""
        repo = RolesRepository()
        default_roles = repo.get_default_roles()
        
        ranks = [r["rank"] for r in default_roles]
        assert ranks == sorted(ranks)
        assert default_roles[0]["rank"] == 1  # CEO
        assert default_roles[-1]["rank"] == 4  # Employee

