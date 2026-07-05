import os
import uuid
from fastapi import UploadFile
from config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB, GCS_BUCKET_NAME

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/ogg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogg"}

# Initialize GCS client only if bucket is configured
storage_client = None
if GCS_BUCKET_NAME:
    try:
        from google.cloud import storage
        storage_client = storage.Client()
    except ImportError:
        print("Warning: GCS_BUCKET_NAME is set, but google-cloud-storage is not installed.")

async def save_upload(upload: UploadFile, temp: bool = False) -> tuple[str, str]:
    """
    Save an uploaded file to Google Cloud Storage (if configured) or local uploads directory.
    Returns (url_path, filesystem_path) tuple.
    """
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

    # Read and size-check
    content = await upload.read()
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError(f"File too large. Max size: {MAX_UPLOAD_SIZE_MB}MB")

    # Upload to Google Cloud Storage
    if GCS_BUCKET_NAME and storage_client:
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(f"uploads/{filename}")
        # Make it publicly readable (requires uniform bucket level access or public access configured)
        blob.upload_from_string(content, content_type=upload.content_type or "application/octet-stream")
        url_path = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/uploads/{filename}"
        return url_path, url_path
        
    # Fallback to local storage
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Write to disk
    with open(filepath, "wb") as f:
        f.write(content)

    url_path = f"/uploads/{filename}"
    return url_path, filepath

