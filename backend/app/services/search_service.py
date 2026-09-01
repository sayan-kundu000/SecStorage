"""Domain Search Service for authorization-aware metadata discovery, filtering, and sorting."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.search_repository import SearchRepository
from app.repositories.star_repository import StarRepository
from app.schemas.pagination import PaginationMeta
from app.schemas.search import SearchQueryParams, SearchResponseData, SearchResultItem
from app.services.authorization_service import AuthorizationService


class SearchService:
    """Domain service orchestrating discovery search, parameter filtering, and star marker resolution."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.search_repo = SearchRepository(db_session)
        self.star_repo = StarRepository(db_session)
        self.auth_service = AuthorizationService(db_session)

    async def search_resources(
        self,
        user: User,
        params: SearchQueryParams,
    ) -> SearchResponseData:
        """Executes metadata search, filtering, sorting, and star resolution for requesting user."""
        offset = 0
        if params.cursor and params.cursor.isdigit():
            offset = int(params.cursor)

        # Retrieve direct and inherited accessible shared resource IDs for user
        shared_file_ids: set[uuid.UUID] = set()
        shared_folder_ids: set[uuid.UUID] = set()
        try:
            shared_file_ids, shared_folder_ids = await self.auth_service.get_accessible_shared_resource_ids(
                user.id
            )
        except Exception:
            pass  # Fall back to user ownership if shared lookup fails

        raw_items, total_count = await self.search_repo.search_resources(
            user_id=user.id,
            params=params,
            shared_file_ids=shared_file_ids,
            shared_folder_ids=shared_folder_ids,
            offset=offset,
            limit=params.limit,
        )

        # Batch resolution of starred status to avoid N+1 queries
        file_ids = [item["id"] for item in raw_items if item["type"] == "file"]
        folder_ids = [item["id"] for item in raw_items if item["type"] == "folder"]

        starred_files, starred_folders = await self.star_repo.get_starred_resource_ids(
            user.id, file_ids, folder_ids
        )

        search_items: list[SearchResultItem] = []
        for item in raw_items:
            is_starred = (
                item["id"] in starred_files
                if item["type"] == "file"
                else item["id"] in starred_folders
            )
            item["starred"] = is_starred
            search_items.append(SearchResultItem.model_validate(item))

        has_more = (offset + params.limit) < total_count
        next_cursor = str(offset + params.limit) if has_more else None

        return SearchResponseData(
            items=search_items,
            pagination=PaginationMeta(
                has_more=has_more,
                next_cursor=next_cursor,
                total_count=total_count,
            ),
        )
