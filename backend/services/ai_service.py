"""
Gemini AI service for civic issue classification and resolution suggestion.
Gracefully degrades to defaults if API key is missing or call fails.
"""
import json
import re
from config import GEMINI_API_KEY

# Attempt to import Gemini SDK; graceful fallback if not installed
try:
    import google.generativeai as genai
    from PIL import Image
    _GEMINI_AVAILABLE = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here")
    if _GEMINI_AVAILABLE:
        genai.configure(api_key=GEMINI_API_KEY)
except ImportError:
    _GEMINI_AVAILABLE = False


_DEFAULT_RESULT = {
    "category": "other",
    "severity": "low",
    "summary": "AI analysis is currently unavailable. Please describe the issue manually.",
    "tags": [],
}

_CLASSIFICATION_PROMPT = """You are a civic infrastructure issue classifier for a community reporting app.

Analyze this image carefully and return ONLY valid JSON (no markdown, no explanation) with these exact keys:
{
  "category": "<one of: pothole, streetlight, water_leak, waste, drainage, other>",
  "severity": "<one of: low, medium, high, critical>",
  "summary": "<2 sentences describing the visible issue and its impact on citizens>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}

Severity guide:
- critical: immediate safety hazard, road fully blocked, or flooding
- high: significant risk, impedes traffic or daily life
- medium: noticeable problem that needs timely attention
- low: minor issue with minimal immediate impact

Return ONLY the JSON object. No other text."""


def _extract_json(text: str) -> dict:
    """Extract JSON from a Gemini response that may contain markdown fences."""
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    # Find first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(cleaned)


def analyze_issue_image(image_path: str) -> dict:
    """
    Run Gemini Vision on a civic issue image.
    Returns dict with category, severity, summary, tags.
    Falls back to defaults on any error.
    """
    if not _GEMINI_AVAILABLE:
        print("[AI] Gemini not available — returning defaults")
        return _DEFAULT_RESULT.copy()

    try:
        img = Image.open(image_path)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([img, _CLASSIFICATION_PROMPT])
        result = _extract_json(response.text)

        # Validate and sanitize fields
        valid_categories = {"pothole", "streetlight", "water_leak", "waste", "drainage", "other"}
        valid_severities = {"low", "medium", "high", "critical"}

        return {
            "category": result.get("category", "other") if result.get("category") in valid_categories else "other",
            "severity": result.get("severity", "low") if result.get("severity") in valid_severities else "low",
            "summary": str(result.get("summary", ""))[:500],
            "tags": [str(t) for t in result.get("tags", [])[:5]],
        }
    except Exception as e:
        print(f"[AI] analyze_issue_image error: {e}")
        return _DEFAULT_RESULT.copy()


def generate_resolution_suggestion(category: str, description: str) -> str:
    """
    Generate a resolution recommendation for authorities using Gemini text.
    Returns a 2-3 sentence recommendation string.
    """
    if not _GEMINI_AVAILABLE:
        return "Please assess the issue on-site and coordinate with the relevant municipal department for timely resolution."

    prompt = (
        f"You are a municipal authority assistant. Given a civic issue of category '{category}' "
        f"described as: '{description}', provide a brief 2-3 sentence resolution recommendation "
        f"for the local authority. Be practical and specific. No bullet points, just plain text."
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()[:600]
    except Exception as e:
        print(f"[AI] generate_resolution_suggestion error: {e}")
        return "Please assess the issue on-site and coordinate with the relevant municipal department for timely resolution."
