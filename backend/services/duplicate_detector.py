from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from services import ai_service

def detect_duplicate(new_title: str, new_desc: str, nearby_issues: list) -> dict:
    """
    Detects if a new issue is a duplicate of nearby issues using TF-IDF.
    Falls back to Gemini for ambiguous cases.
    Returns a dict with is_duplicate, and optionally duplicate info and method.
    """
    if not nearby_issues:
        return {"is_duplicate": False, "reason": "no_nearby_issues"}
        
    # 1. Preprocessing and title boosting
    def _combine_text(title, desc):
        t = (title or "").lower().strip()
        d = (desc or "").lower().strip()
        return f"{t} {t} {d}".strip()
        
    new_text = _combine_text(new_title, new_desc)
    corpus = [new_text]
    for issue in nearby_issues:
        corpus.append(_combine_text(issue["title"], issue["description"]))
        
    # 2. Build and fit vectorizer
    vectorizer = TfidfVectorizer(
        stop_words='english',
        ngram_range=(1, 2),
        max_features=500,
        min_df=1
    )
    
    try:
        matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        # Happens if corpus is effectively empty after stop words removal
        return {"is_duplicate": False, "reason": "empty_corpus"}
        
    # 3. Compute cosine similarity
    sim_matrix = cosine_similarity(matrix)
    
    # We care about row 0 (the new issue) compared to all others (indices 1 to N)
    scores = sim_matrix[0][1:]
    
    # 4. Pair scores with candidates and sort
    scored_candidates = []
    for i, score in enumerate(scores):
        scored_candidates.append({
            "score": float(score),
            "issue": nearby_issues[i]
        })
        
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    best_match = scored_candidates[0]
    best_score = best_match["score"]
    
    # 5. Threshold logic
    if best_score >= 0.65:
        # High confidence duplicate
        return {
            "is_duplicate": True,
            "method": "tfidf",
            "similarity_score": best_score,
            "duplicate": best_match["issue"]
        }
    elif 0.40 <= best_score < 0.65:
        # Ambiguous zone -> Escalate to Gemini
        candidate_1 = scored_candidates[0]["issue"]
        candidate_2 = scored_candidates[1]["issue"] if len(scored_candidates) > 1 else None
        
        is_dup = ai_service.check_duplicate_escalation(new_text, candidate_1, candidate_2)
        if is_dup:
            return {
                "is_duplicate": True,
                "method": "tfidf+gemini",
                "similarity_score": best_score,
                "duplicate": best_match["issue"]
            }
        else:
            return {"is_duplicate": False, "method": "tfidf+gemini"}
    else:
        # Not a duplicate
        return {"is_duplicate": False, "method": "tfidf"}
