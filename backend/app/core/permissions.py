"""Authorization Enums, Actions, Permissions & Static RBAC Matrix."""

from enum import StrEnum


class Role(StrEnum):
    """Global User Roles."""

    USER = "USER"
    ADMIN = "ADMIN"


class ResourceType(StrEnum):
    """SecStorage Domain Resource Types."""

    FILE = "FILE"
    FOLDER = "FOLDER"
    USER = "USER"
    SHARE = "SHARE"
    SESSION = "SESSION"
    AUDIT_EVENT = "AUDIT_EVENT"


class Action(StrEnum):
    """Domain Operations & Action Intent."""

    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    DOWNLOAD = "DOWNLOAD"
    SHARE = "SHARE"
    REVOKE = "REVOKE"
    MANAGE = "MANAGE"


class Permission(StrEnum):
    """Global Action Permissions."""

    # File Permissions
    FILES_CREATE = "files:create"
    FILES_READ = "files:read"
    FILES_UPDATE = "files:update"
    FILES_DELETE = "files:delete"
    FILES_DOWNLOAD = "files:download"

    # Folder Permissions
    FOLDERS_CREATE = "folders:create"
    FOLDERS_READ = "folders:read"
    FOLDERS_UPDATE = "folders:update"
    FOLDERS_DELETE = "folders:delete"

    # Share Permissions
    SHARES_CREATE = "shares:create"
    SHARES_READ = "shares:read"
    SHARES_DELETE = "shares:delete"

    # User Management Permissions
    USERS_READ = "users:read"
    USERS_UPDATE = "users:update"

    # Session Management Permissions
    SESSIONS_READ = "sessions:read"
    SESSIONS_REVOKE = "sessions:revoke"

    # Audit Trail Permissions
    AUDIT_READ = "audit:read"


# Static Role-to-Permission Mapping Matrix
ROLE_PERMISSIONS_MAP: dict[Role, set[Permission]] = {
    Role.USER: {
        Permission.FILES_CREATE,
        Permission.FILES_READ,
        Permission.FILES_UPDATE,
        Permission.FILES_DELETE,
        Permission.FILES_DOWNLOAD,
        Permission.FOLDERS_CREATE,
        Permission.FOLDERS_READ,
        Permission.FOLDERS_UPDATE,
        Permission.FOLDERS_DELETE,
        Permission.SHARES_CREATE,
        Permission.SHARES_READ,
        Permission.SHARES_DELETE,
        Permission.USERS_READ,
        Permission.USERS_UPDATE,
        Permission.SESSIONS_READ,
        Permission.SESSIONS_REVOKE,
    },
    Role.ADMIN: {
        # Administrative Role inherits all USER permissions plus administrative access
        Permission.FILES_CREATE,
        Permission.FILES_READ,
        Permission.FILES_UPDATE,
        Permission.FILES_DELETE,
        Permission.FILES_DOWNLOAD,
        Permission.FOLDERS_CREATE,
        Permission.FOLDERS_READ,
        Permission.FOLDERS_UPDATE,
        Permission.FOLDERS_DELETE,
        Permission.SHARES_CREATE,
        Permission.SHARES_READ,
        Permission.SHARES_DELETE,
        Permission.USERS_READ,
        Permission.USERS_UPDATE,
        Permission.SESSIONS_READ,
        Permission.SESSIONS_REVOKE,
        Permission.AUDIT_READ,
    },
}
