from typing import Any


class SecStorageException(Exception):  # noqa: N818
    """Base exception for all SecStorage custom domain errors."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class AuthenticationError(SecStorageException):
    def __init__(self, message: str = "Invalid credentials or token expired"):
        super().__init__(code="AUTH_ERROR", message=message, status_code=401)


class AuthorizationError(SecStorageException):
    def __init__(self, message: str = "Permission denied for requested resource"):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


# Aliases for clear semantic naming
ForbiddenError = AuthorizationError


class ResourceNotFoundError(SecStorageException):
    def __init__(self, message: str = "Requested resource not found"):
        super().__init__(code="NOT_FOUND", message=message, status_code=404)


NotFoundError = ResourceNotFoundError


class ConflictError(SecStorageException):
    def __init__(self, message: str = "Resource conflict or duplication error"):
        super().__init__(code="CONFLICT_ERROR", message=message, status_code=409)


class ValidationError(SecStorageException):
    def __init__(self, message: str = "Request input validation failed"):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=400)
