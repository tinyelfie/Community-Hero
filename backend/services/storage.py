import os
import uuid
from fastapi import UploadFile
from config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/ogg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogg"}


async def save_upload(upload: UploadFile, temp: bool = False) -> tuple[str, str]:
    """
    Save an uploaded file to the uploads directory.
    Returns (url_path, filesystem_path) tuple.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Validate content type
    if upload.content_type and upload.content_type not in ALLOWED_CONTENT_TYPES:
        # Try to infer from filename extension
        ext = os.path.splitext(upload.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            ext = ".jpg"
    else:
        ext_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/ogg": ".ogg",
        }
        ext = ext_map.get(upload.content_type or "", ".jpg")

    # Generate unique filename
    prefix = "tmp_" if temp else ""
    filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Read and size-check
    content = await upload.read()
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError(f"File too large. Max size: {MAX_UPLOAD_SIZE_MB}MB")

    # Write to disk
    with open(filepath, "wb") as f:
        f.write(content)

    url_path = f"/uploads/{filename}"
    return url_path, filepath
