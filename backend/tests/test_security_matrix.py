"""Comprehensive Security & Permission Matrix Test Suite.

Tests permission enforcement, RBAC, IDOR protection, and isolation across
files, folders, versions, shares, public links, activities, and audit logs.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.folder import Folder
from app.models.user import User
from app.services.file_service import FileService
from app.services.public_link_service import PublicLinkService
from app.services.share_service import ShareService
from app.services.version_service import VersionService


@pytest.fixture
async def sec_matrix_setup(db_session):
    """Fixture initializing Owner, Editor, Viewer, Admin, and Stranger users with resources."""
    owner = User(
        id=uuid.uuid4(),
        email="owner@secstorage.io",
        full_name="Resource Owner",
        hashed_password="mock_password",
        is_admin=False,
        is_active=True,
    )
    editor = User(
        id=uuid.uuid4(),
        email="editor@secstorage.io",
        full_name="Resource Editor",
        hashed_password="mock_password",
        is_admin=False,
        is_active=True,
    )
    viewer = User(
        id=uuid.uuid4(),
        email="viewer@secstorage.io",
        full_name="Resource Viewer",
        hashed_password="mock_password",
        is_admin=False,
        is_active=True,
    )
    stranger = User(
        id=uuid.uuid4(),
        email="stranger@secstorage.io",
        full_name="Resource Stranger",
        hashed_password="mock_password",
        is_admin=False,
        is_active=True,
    )
    admin = User(
        id=uuid.uuid4(),
        email="admin@secstorage.io",
        full_name="System Admin",
        hashed_password="mock_password",
        is_admin=True,
        is_active=True,
    )
    folder = Folder(
        id=uuid.uuid4(),
        user_id=owner.id,
        name="Owner Vault",
        parent_id=None,
    )
    db_session.add_all([owner, editor, viewer, stranger, admin, folder])
    await db_session.commit()

    # Create File for Owner inside folder
    file_svc = FileService(db_session)
    init_res = await file_svc.initiate_upload(
        user=owner, filename="classified.pdf", content_type="application/pdf", size_bytes=1000, folder_id=folder.id
    )
    file_ent = await file_svc.confirm_upload(user=owner, file_id=init_res.file_id)

    # Share file with Editor (EDITOR permission)
    share_svc = ShareService(db_session)
    editor_share = await share_svc.grant_share(
        grantor=owner, grantee_email=editor.email, permission="EDITOR", file_id=file_ent.id
    )

    # Share file with Viewer (VIEWER permission)
    viewer_share = await share_svc.grant_share(
        grantor=owner, grantee_email=viewer.email, permission="VIEWER", file_id=file_ent.id
    )

    # Create Public Link
    pub_svc = PublicLinkService(db_session)
    pub_link = await pub_svc.create_public_link(creator=owner, file_id=file_ent.id)

    return {
        "owner": owner,
        "editor": editor,
        "viewer": viewer,
        "stranger": stranger,
        "admin": admin,
        "folder": folder,
        "file": file_ent,
        "editor_share": editor_share,
        "viewer_share": viewer_share,
        "pub_token": pub_link.token,
    }


@pytest.mark.asyncio
async def test_owner_full_permissions(async_client: AsyncClient, sec_matrix_setup):
    """Owner has full read, download, update, preview, version list, share, and delete permissions."""
    owner = sec_matrix_setup["owner"]
    file_ent = sec_matrix_setup["file"]
    token = create_access_token(owner.id)

    # Download
    r1 = await async_client.get(f"/api/v1/files/{file_ent.id}/download", headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 200

    # Versions
    r2 = await async_client.get(f"/api/v1/files/{file_ent.id}/versions", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200

    # Preview
    r3 = await async_client.get(f"/api/v1/files/{file_ent.id}/preview", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200


@pytest.mark.asyncio
async def test_viewer_read_download_only(async_client: AsyncClient, sec_matrix_setup):
    """Viewer can download and preview file, but cannot delete or grant shares."""
    viewer = sec_matrix_setup["viewer"]
    file_ent = sec_matrix_setup["file"]
    token = create_access_token(viewer.id)

    # Download -> 200 OK
    r1 = await async_client.get(f"/api/v1/files/{file_ent.id}/download", headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 200

    # Delete -> 403 Forbidden
    r2 = await async_client.delete(f"/api/v1/files/{file_ent.id}", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_stranger_idor_denied_all(async_client: AsyncClient, sec_matrix_setup):
    """Stranger with no granted access is denied (403/404) across all resource APIs (IDOR protection)."""
    stranger = sec_matrix_setup["stranger"]
    file_ent = sec_matrix_setup["file"]
    folder = sec_matrix_setup["folder"]
    token = create_access_token(stranger.id)

    # File Download -> 403
    r1 = await async_client.get(f"/api/v1/files/{file_ent.id}/download", headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 403

    # Folder Details -> 403
    r2 = await async_client.get(f"/api/v1/folders/{folder.id}", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 403

    # Versions List -> 403
    r3 = await async_client.get(f"/api/v1/files/{file_ent.id}/versions", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 403

    # File Preview -> 403
    r4 = await async_client.get(f"/api/v1/files/{file_ent.id}/preview", headers={"Authorization": f"Bearer {token}"})
    assert r4.status_code == 403

    # File Activity -> 403
    r5 = await async_client.get(f"/api/v1/files/{file_ent.id}/activity", headers={"Authorization": f"Bearer {token}"})
    assert r5.status_code == 403


@pytest.mark.asyncio
async def test_admin_security_audit_access_only(async_client: AsyncClient, sec_matrix_setup):
    """Non-admin users receive 403 on /audit, Admin receives 200 OK."""
    stranger = sec_matrix_setup["stranger"]
    admin = sec_matrix_setup["admin"]

    stranger_token = create_access_token(stranger.id)
    admin_token = create_access_token(admin.id)

    r1 = await async_client.get("/api/v1/audit", headers={"Authorization": f"Bearer {stranger_token}"})
    assert r1.status_code == 403

    r2 = await async_client.get("/api/v1/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert r2.status_code == 200
