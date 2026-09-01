"""Integration & Integrity Tests for SQLAlchemy Models & Constraints."""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from app.models import Activity, Base, File, FileVersion, Folder, Share, Star, User
from app.repositories import FolderRepository, UserRepository

# In-memory async SQLite engine for rapid isolated model integration tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session() -> AsyncSession:  # type: ignore[misc]
    """Creates isolated in-memory test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession) -> None:
    """Verify creating User entity persists correctly."""
    repo = UserRepository(db_session)
    user = User(
        email="Alice@Example.com",
        hashed_password="hashed_argon2_pass",
        full_name="Alice Smith",
    )
    created = await repo.create(user)
    await db_session.commit()

    assert created.id is not None
    assert created.email == "alice@example.com"
    fetched = await repo.get_by_email("alice@example.com")
    assert fetched is not None
    assert fetched.full_name == "Alice Smith"


@pytest.mark.asyncio
async def test_user_email_uniqueness(db_session: AsyncSession) -> None:
    """Verify duplicate email violates database unique constraint."""
    user1 = User(email="bob@example.com", hashed_password="pw1", full_name="Bob M")
    user2 = User(email="BOB@example.com", hashed_password="pw2", full_name="Bob M")
    db_session.add(user1)
    await db_session.commit()

    db_session.add(user2)
    user2.email = user2.email.lower()
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_create_folder_hierarchy(db_session: AsyncSession) -> None:
    """Verify parent-child folder hierarchy relationships."""
    user = User(email="carol@example.com", hashed_password="pw", full_name="Carol")
    db_session.add(user)
    await db_session.commit()

    parent = Folder(user_id=user.id, name="Documents")
    db_session.add(parent)
    await db_session.commit()

    child = Folder(user_id=user.id, parent_id=parent.id, name="Work")
    db_session.add(child)
    await db_session.commit()

    folder_repo = FolderRepository(db_session)
    subfolders = await folder_repo.get_active_subfolders(user.id, parent.id)
    assert len(subfolders) == 1
    assert subfolders[0].name == "Work"


@pytest.mark.asyncio
async def test_create_file_and_versions(db_session: AsyncSession) -> None:
    """Verify file and historical file version records."""
    user = User(email="dave@example.com", hashed_password="pw", full_name="Dave")
    db_session.add(user)
    await db_session.commit()

    file_entity = File(
        user_id=user.id,
        name="report.pdf",
        mime_type="application/pdf",
        size_bytes=1024,
        storage_key=f"users/{user.id}/files/f1/v1.bin",
    )
    db_session.add(file_entity)
    await db_session.commit()

    v1 = FileVersion(
        file_id=file_entity.id,
        version_number=1,
        storage_key=file_entity.storage_key,
        size_bytes=1024,
        created_by=user.id,
    )
    v2 = FileVersion(
        file_id=file_entity.id,
        version_number=2,
        storage_key=f"users/{user.id}/files/f1/v2.bin",
        size_bytes=2048,
        created_by=user.id,
    )
    db_session.add_all([v1, v2])
    await db_session.commit()

    stmt = select(File).options(selectinload(File.versions)).where(File.id == file_entity.id)
    result = await db_session.execute(stmt)
    fetched_file = result.scalar_one_or_none()
    assert fetched_file is not None
    assert len(fetched_file.versions) == 2


@pytest.mark.asyncio
async def test_share_resource_xor_constraint(db_session: AsyncSession) -> None:
    """Verify share constraint requires either folder_id or file_id, not both."""
    u1 = User(email="grantor@example.com", hashed_password="pw", full_name="Grantor")
    u2 = User(email="grantee@example.com", hashed_password="pw", full_name="Grantee")
    db_session.add_all([u1, u2])
    await db_session.commit()

    folder = Folder(user_id=u1.id, name="SharedFolder")
    file_ent = File(
        user_id=u1.id,
        name="doc.txt",
        mime_type="text/plain",
        size_bytes=100,
        storage_key=str(uuid.uuid4()),
    )
    db_session.add_all([folder, file_ent])
    await db_session.commit()

    # Invalid share targeting BOTH folder and file
    invalid_share = Share(
        grantor_id=u1.id,
        grantee_id=u2.id,
        folder_id=folder.id,
        file_id=file_ent.id,
        permission="VIEWER",
    )
    db_session.add(invalid_share)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_star_uniqueness_constraint(db_session: AsyncSession) -> None:
    """Verify user cannot star the same file twice."""
    user = User(email="starrer@example.com", hashed_password="pw", full_name="Starrer")
    db_session.add(user)
    await db_session.commit()

    file_ent = File(
        user_id=user.id,
        name="photo.jpg",
        mime_type="image/jpeg",
        size_bytes=5000,
        storage_key=str(uuid.uuid4()),
    )
    db_session.add(file_ent)
    await db_session.commit()

    star1 = Star(user_id=user.id, file_id=file_ent.id)
    star2 = Star(user_id=user.id, file_id=file_ent.id)
    db_session.add(star1)
    await db_session.commit()

    db_session.add(star2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_activity_audit_logging(db_session: AsyncSession) -> None:
    """Verify logging user activities to audit trail."""
    user = User(email="audit@example.com", hashed_password="pw", full_name="Auditor")
    db_session.add(user)
    await db_session.commit()

    activity = Activity(
        user_id=user.id,
        action="FILE_UPLOAD",
        resource_type="FILE",
        resource_id=uuid.uuid4(),
        metadata_json='{"filename": "test.txt"}',
    )
    db_session.add(activity)
    await db_session.commit()

    assert activity.id is not None
    assert activity.action == "FILE_UPLOAD"
