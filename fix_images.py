import os

# 1. Fix home.js escaping and image url
with open('frontend/js/pages/home.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('grid.innerHTML += `')
if start_idx != -1:
    before = content[:start_idx]
    after = content[start_idx:]
    after = after.replace(r'\${', '${')
    with open('frontend/js/pages/home.js', 'w', encoding='utf-8') as f:
        f.write(before + after)

# 2. Fix map.js image url
with open('frontend/js/pages/map.js', 'r', encoding='utf-8') as f:
    map_content = f.read()
map_content = map_content.replace(
    "const finalImageUrl = imageUrl || `https://loremflickr.com/400/300/${encodeURIComponent(keyword)}?lock=${lockId}`;",
    "const finalImageUrl = imageUrl || `assets/categories/${issue.category || 'other'}.jpg`;"
)
with open('frontend/js/pages/map.js', 'w', encoding='utf-8') as f:
    f.write(map_content)

# 3. Fix issueCard.js image url
with open('frontend/js/components/issueCard.js', 'r', encoding='utf-8') as f:
    card_content = f.read()
card_content = card_content.replace(
    "const finalImageUrl = imageUrl || `https://loremflickr.com/400/300/${encodeURIComponent(keyword)}?lock=${lockId}`;",
    "const finalImageUrl = imageUrl || `assets/categories/${issue.category || 'other'}.jpg`;"
)
with open('frontend/js/components/issueCard.js', 'w', encoding='utf-8') as f:
    f.write(card_content)

print("Fixed!")
