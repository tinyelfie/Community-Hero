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
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
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
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        return response.text.strip()[:600]
    except Exception as e:
        print(f"[AI] generate_resolution_suggestion error: {e}")
        return "Please assess the issue on-site and coordinate with the relevant municipal department for timely resolution."


def check_duplicate(new_title: str, new_desc: str, existing_issues: list) -> dict:
    """
    Checks if a new issue is a duplicate of any existing issues using Gemini.
    Returns: {"is_duplicate": bool, "matching_issue_id": str, "confidence": float}
    """
    if not _GEMINI_AVAILABLE or not existing_issues:
        return {"is_duplicate": False}

    issues_context = "\n".join([
        f"ID: {i.id} | Title: {i.title} | Description: {i.description or ''}"
        for i in existing_issues
    ])

    prompt = f"""You are a civic issue duplicate detector.
    
    NEW ISSUE TO REPORT:
    Title: {new_title}
    Description: {new_desc or ''}
    
    EXISTING NEARBY ISSUES:
    {issues_context}
    
    Determine if the new issue is describing the exact same physical problem as any of the existing issues.
    Return ONLY valid JSON with these exact keys:
    {{
      "is_duplicate": true/false,
      "matching_issue_id": "<uuid of the match, or null>",
      "confidence": <float between 0 and 1>
    }}
    
    Return ONLY the JSON object. No other text.
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        result = _extract_json(response.text)
        return {
            "is_duplicate": bool(result.get("is_duplicate", False)),
            "matching_issue_id": result.get("matching_issue_id"),
            "confidence": float(result.get("confidence", 0.0))
        }
    except Exception as e:
        print(f"[AI] check_duplicate error: {e}")
        return {"is_duplicate": False}

def check_duplicate_escalation(new_issue_text: str, candidate_1: dict, candidate_2: dict = None) -> bool:
    """
    Arbitrate if the new issue is a duplicate of the candidates using Gemini.
    Returns True if it is a duplicate of either, False otherwise.
    """
    if not _GEMINI_AVAILABLE:
        return False

    candidates_text = f"Candidate 1: {candidate_1['title']} - {candidate_1['description'] or ''}"
    if candidate_2:
        candidates_text += f"\nCandidate 2: {candidate_2['title']} - {candidate_2['description'] or ''}"

    prompt = f"""You are a civic issue duplicate detector.
    
    NEW ISSUE:
    {new_issue_text}
    
    CANDIDATES:
    {candidates_text}
    
    Determine if the new issue is describing the exact same physical problem as any of the candidates.
    Return ONLY valid JSON with this exact key:
    {{
      "is_duplicate": true/false
    }}
    
    Return ONLY the JSON object. No other text.
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        result = _extract_json(response.text)
        return bool(result.get("is_duplicate", False))
    except Exception as e:
        print(f"[AI] check_duplicate_escalation error: {e}")
        return False



def generate_resolution_suggestion_with_context(category: str, description: str, severity: str, similar_issues: list) -> str:
    """
    Generates numbered resolution steps, an estimated time, and a reference to a similar past resolution based on historical context.
    """
    if not _GEMINI_AVAILABLE:
        return "1. Assess the issue on-site.\n2. Coordinate with the relevant department.\n\nEstimated time: 1-3 days."

    history_context = "\n".join([
        f"- Past Issue: '{i.title}' -> {i.description or 'No description'}"
        for i in similar_issues
    ]) if similar_issues else "No recent similar resolved issues available."

    prompt = f"""You are a municipal authority assistant.
    
    CURRENT ISSUE:
    Category: {category}
    Severity: {severity}
    Description: {description}
    
    HISTORICAL CONTEXT (Similar Resolved Issues):
    {history_context}
    
    Please provide an actionable resolution suggestion. Include:
    1. Numbered resolution steps.
    2. An estimated time to resolve.
    3. A brief reference to a similar past resolution (if context provided).
    
    Format as clear, professional text. Do not use markdown headers, just plain text with numbers.
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[AI] generate_resolution_suggestion_with_context error: {e}")
        return "1. Assess the issue on-site.\n2. Coordinate with the relevant department.\n\nEstimated time: 1-3 days."


def generate_weekly_digest(stats_text: str) -> str:
    """
    Generates a 3-paragraph natural language summary of the weekly stats.
    """
    if not _GEMINI_AVAILABLE:
        return "Weekly stats are available, but AI summary could not be generated. Please review the raw metrics on the dashboard."
        
    prompt = f"""You are the Chief Intelligence Officer for a civic reporting platform.
    Write a 3-paragraph natural language executive summary based on the following weekly data:
    
    {stats_text}
    
    Paragraph 1: High-level summary of the volume and resolution rate.
    Paragraph 2: Breakdown of the most problematic categories and top reporting zones.
    Paragraph 3: Mention the most active user and concluding thoughts on civic engagement this week.
    
    Write in a professional, encouraging, and analytical tone. Do not use markdown headers or bolding, just 3 plain paragraphs.
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[AI] generate_weekly_digest error: {e}")
        return "Weekly stats are available, but AI summary could not be generated. Please review the raw metrics on the dashboard."

def estimate_issue_cost(category: str, severity: str) -> dict:
    """
    Estimates the repair cost for a civic issue in INR using Gemini.
    """
    if not _GEMINI_AVAILABLE:
        return {"estimated_cost_min": None, "estimated_cost_max": None}
    
    prompt = f"""You are a municipal cost estimator.
    Provide a realistic cost estimate in INR to fix a civic issue of category '{category}' and severity '{severity}' in an Indian city (e.g. Kolkata, Mumbai).
    Return ONLY valid JSON with these exact keys:
    {{
      "estimated_cost_min": <integer>,
      "estimated_cost_max": <integer>
    }}
    Do not include any other text or markdown fences.
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        result = _extract_json(response.text)
        
        # Ensure we got valid integers, otherwise fallback to None
        min_cost = int(result.get("estimated_cost_min")) if result.get("estimated_cost_min") is not None else None
        max_cost = int(result.get("estimated_cost_max")) if result.get("estimated_cost_max") is not None else None
        
        # If it returns 0 for some reason, we'll treat it as None to avoid showing ₹0
        if min_cost == 0 and max_cost == 0:
            return {"estimated_cost_min": None, "estimated_cost_max": None}
            
        return {
            "estimated_cost_min": min_cost,
            "estimated_cost_max": max_cost
        }
    except Exception as e:
        print(f"[AI] estimate_issue_cost error: {e}")
        return {"estimated_cost_min": None, "estimated_cost_max": None}

def draft_description(title: str, category: str, severity: str) -> str:
    """
    Generate a one-line description for an issue report.
    """
    if not _GEMINI_AVAILABLE:
        return f"A {severity} severity issue regarding {category} was reported: {title}. Please investigate and take necessary action."

    prompt = (
        f"You are a helpful assistant for a civic reporting app. "
        f"Based on the following issue details, write EXACTLY ONE sentence describing the issue "
        f"and requesting attention. Do not include any markdown, bullet points, or extra text.\n\n"
        f"Title: {title}\n"
        f"Category: {category}\n"
        f"Severity: {severity}"
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[AI] draft_description error: {e}")
        return f"A {severity} severity issue regarding {category} was reported: {title}. Please investigate and take necessary action."

