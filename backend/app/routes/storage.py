"""Local Storage HTTP Router for Direct Uploads & Downloads in Development."""

import mimetypes

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import FileResponse

from app.services.storage_service import get_storage_provider
from app.storage.local import LocalStorageProvider
from app.storage.mock import MockStorageProvider

router = APIRouter(prefix="/storage", tags=["Local Storage"])


@router.put(
    "/upload/{storage_key:path}",
    status_code=status.HTTP_200_OK,
    summary="Local Direct Object Upload Endpoint",
)
async def local_storage_upload(storage_key: str, request: Request) -> dict[str, bool]:
    """Receives direct binary PUT upload stream and persists to storage provider."""
    body = await request.body()
    provider = get_storage_provider()

    if isinstance(provider, LocalStorageProvider):
        await provider.save_object_bytes(storage_key, body)
    elif isinstance(provider, MockStorageProvider):
        provider.objects[storage_key] = {
            "size_bytes": len(body),
            "content_type": request.headers.get("content-type", "application/octet-stream"),
            "etag": f"mock-{len(body)}",
            "content": body,
        }
    else:
        if hasattr(provider, "save_object_bytes"):
            await provider.save_object_bytes(storage_key, body)
        elif hasattr(provider, "objects"):
            provider.objects[storage_key] = {
                "size_bytes": len(body),
                "content_type": request.headers.get("content-type", "application/octet-stream"),
                "etag": f"mock-{len(body)}",
                "content": body,
            }

    return {"success": True}


@router.get(
    "/download/{storage_key:path}",
    summary="Local Direct Object Download Endpoint",
)
async def local_storage_download(
    storage_key: str,
    filename: str | None = None,
    inline: bool = False,
) -> Response:
    """Serves local binary object download or inline preview stream."""
    provider = get_storage_provider()

    guessed_type: str | None = None
    if filename:
        guessed_type, _ = mimetypes.guess_type(filename)
    if not guessed_type:
        guessed_type = "application/octet-stream"

    disp_type = "inline" if inline else "attachment"
    clean_filename = filename or storage_key.split("/")[-1]
    disposition = f'{disp_type}; filename="{clean_filename}"'

    if isinstance(provider, LocalStorageProvider):
        path = provider._get_path(storage_key)
        if not path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            path=str(path),
            filename=clean_filename,
            media_type=guessed_type,
            headers={"Content-Disposition": disposition},
        )

    data = await provider.get_object_bytes(storage_key, max_bytes=100 * 1024 * 1024)
    if not data:
        raise HTTPException(status_code=404, detail="File not found")

    headers = {"Content-Disposition": disposition}
    return Response(content=data, media_type=guessed_type, headers=headers)

