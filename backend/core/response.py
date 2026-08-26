"""
Standardized API Response Format.
Consistent response structure for frontend.
"""
from typing import Any, Dict, Optional, List
from fastapi.responses import JSONResponse
from fastapi import status


def create_success_response(
    data: Any = None,
    message: str = None,
    status_code: int = status.HTTP_200_OK,
    meta: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Create standardized success response.
    
    Args:
        data: Response data
        message: Success message
        status_code: HTTP status code
        meta: Additional metadata (pagination, etc.)
        
    Returns:
        Standardized success response dictionary
    """
    response: Dict[str, Any] = {
        "success": True,
    }
    
    if data is not None:
        response["data"] = data
    
    if message:
        response["message"] = message
    
    if meta:
        response["meta"] = meta
    
    return response


def create_error_response(
    error: str,
    error_code: str = "ERROR",
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Create standardized error response.
    
    Args:
        error: Error message
        error_code: Application error code
        status_code: HTTP status code
        details: Additional error details
        
    Returns:
        Standardized error response dictionary
    """
    response: Dict[str, Any] = {
        "success": False,
        "error": error,
        "error_code": error_code,
    }
    
    if details:
        response["details"] = details
    
    return response


def success_response(
    data: Any = None,
    message: str = None,
    status_code: int = status.HTTP_200_OK,
    meta: Dict[str, Any] = None
) -> JSONResponse:
    """
    Create and return JSONResponse with success format.
    
    Args:
        data: Response data
        message: Success message
        status_code: HTTP status code
        meta: Additional metadata
        
    Returns:
        JSONResponse with standardized format
    """
    content = create_success_response(data=data, message=message, meta=meta)
    return JSONResponse(status_code=status_code, content=content)


def error_response(
    error: str,
    error_code: str = "ERROR",
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: Dict[str, Any] = None
) -> JSONResponse:
    """
    Create and return JSONResponse with error format.
    
    Args:
        error: Error message
        error_code: Application error code
        status_code: HTTP status code
        details: Additional error details
        
    Returns:
        JSONResponse with standardized format
    """
    content = create_error_response(
        error=error,
        error_code=error_code,
        status_code=status_code,
        details=details
    )
    return JSONResponse(status_code=status_code, content=content)

