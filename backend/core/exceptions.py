"""
Custom Exceptions and Exception Handlers.
Centralized error handling for the application.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
from typing import Any, Dict

from core.logging_config import get_logger
from core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class APIException(Exception):
    """Base API exception with structured error response."""
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Dict[str, Any] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(APIException):
    """Resource not found exception."""
    
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details={"resource": resource, "identifier": identifier}
        )


class ValidationError(APIException):
    """Validation error exception."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details or {}
        )


class UnauthorizedError(APIException):
    """Unauthorized access exception."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED"
        )


class ForbiddenError(APIException):
    """Forbidden access exception."""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN"
        )


def create_error_response(
    message: str,
    status_code: int,
    error_code: str = "ERROR",
    details: Dict[str, Any] = None,
    request: Request = None,
    include_traceback: bool = False
) -> Dict[str, Any]:
    """
    Create standardized error response.
    
    Args:
        message: Error message
        status_code: HTTP status code
        error_code: Application error code
        details: Additional error details
        request: FastAPI request object
        include_traceback: Whether to include traceback (only in debug mode)
        
    Returns:
        Standardized error response dictionary
    """
    response: Dict[str, Any] = {
        "success": False,
        "error": message,
        "error_code": error_code,
    }
    
    if details:
        response["details"] = details
    
    # Include traceback only in debug mode
    if include_traceback and settings.DEBUG:
        response["traceback"] = traceback.format_exc()
    
    # Include request info in debug mode
    if request and settings.DEBUG:
        response["request_info"] = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
        }
    
    return response


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTPException."""
    logger.warning(
        f"HTTPException: {exc.status_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
        }
    )
    
    response = create_error_response(
        message=str(exc.detail),
        status_code=exc.status_code,
        error_code=f"HTTP_{exc.status_code}",
        request=request,
        include_traceback=settings.DEBUG
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle RequestValidationError."""
    errors = exc.errors()
    error_messages = []
    error_details = {}
    
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_messages.append(f"{field}: {message}")
        error_details[field] = message
    
    logger.warning(
        f"Validation error: {', '.join(error_messages)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": error_details,
        }
    )
    
    response = create_error_response(
        message="Validation error",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        details={"fields": error_details},
        request=request,
        include_traceback=settings.DEBUG
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response
    )


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """Handle custom APIException."""
    logger.error(
        f"APIException: {exc.error_code} - {exc.message}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        }
    )
    
    response = create_error_response(
        message=exc.message,
        status_code=exc.status_code,
        error_code=exc.error_code,
        details=exc.details,
        request=request,
        include_traceback=settings.DEBUG
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(
        f"Unexpected error: {type(exc).__name__} - {str(exc)}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
        }
    )
    
    response = create_error_response(
        message="Internal server error" if not settings.DEBUG else str(exc),
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_ERROR",
        request=request,
        include_traceback=settings.DEBUG
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response
    )

