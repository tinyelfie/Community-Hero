import logging

logger = logging.getLogger(__name__)

# Initialize VADER globally so it is loaded once per process
try:
    import nltk
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    
    # Check if lexicon is downloaded, if not download it
    try:
        nltk.data.find('sentiment/vader_lexicon.zip')
    except LookupError:
        nltk.download('vader_lexicon', quiet=True)
        
    analyzer = SentimentIntensityAnalyzer()
    VADER_AVAILABLE = True
except ImportError:
    logger.warning("nltk not installed. Sentiment analysis will use a stub.")
    VADER_AVAILABLE = False
    analyzer = None

def get_sentiment_data(text: str) -> tuple[float, str]:
    """
    Returns (compound_score, urgency_level)
    """
    if not text:
        return 0.0, "low"
    
    # Truncate text to 1000 characters to preserve VADER accuracy
    text = text[:1000]
    
    if VADER_AVAILABLE:
        scores = analyzer.polarity_scores(text)
        compound = scores['compound']
    else:
        # Fallback stub if NLTK is not installed
        t = text.lower()
        if "dangerous" in t or "urgent" in t or "severe" in t:
            compound = -0.7
        elif "fixed" in t or "good" in t or "thanks" in t:
            compound = 0.5
        else:
            compound = 0.0

    # Map to urgency string
    if compound < -0.6:
        urgency = "critical"
    elif compound <= -0.3:
        urgency = "high"
    elif compound <= -0.1:
        urgency = "moderate"
    else:
        urgency = "low"
        
    return compound, urgency
