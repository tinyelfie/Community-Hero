import re
import json

txt = open('d:/MyProjectsForFun/Community Hero/stitch_code', 'r', encoding='utf-8').read()

color_blocks = re.findall(r'"colors":\s*(\{.*?\})', txt, flags=re.DOTALL)

light_colors = None
dark_colors = None

for block in color_blocks:
    if '#fbf9f3' in block:
        light_colors = block
    elif '#121212' in block:
        dark_colors = block

print('Light colors found:', light_colors is not None)
print('Dark colors found:', dark_colors is not None)

if light_colors and dark_colors:
    light = json.loads(light_colors)
    dark = json.loads(dark_colors)
    
    # Generate CSS
    css_vars = []
    css_vars.append(':root {')
    for k, v in light.items():
        css_vars.append(f'  --color-{k}: {v};')
    css_vars.append('}')
    
    css_vars.append('.dark {')
    for k, v in dark.items():
        css_vars.append(f'  --color-{k}: {v};')
    css_vars.append('}')
    
    css_str = '\n'.join(css_vars)
    
    # Generate tailwind config colors
    tw_colors = {}
    for k in light.keys():
        tw_colors[k] = f'var(--color-{k})'
        
    tw_colors_str = json.dumps(tw_colors, indent=22)
    
    # Read index.html
    html = open('d:/MyProjectsForFun/Community Hero/frontend/index.html', 'r', encoding='utf-8').read()
    
    # Replace the colors block
    html = re.sub(r'"colors":\s*\{.*?\}', f'"colors": {tw_colors_str}', html, flags=re.DOTALL)
    
    # Insert the styles right before </head>
    html = html.replace('</head>', f'<style>\n{css_str}\n</style>\n</head>')
    
    open('d:/MyProjectsForFun/Community Hero/frontend/index.html', 'w', encoding='utf-8').write(html)
    print('Updated index.html!')
