import re
import glob
import os

os.chdir(r'C:\Users\irieb\Documents\William-Projects\2-websites\articulate-english\b2-fce-speaking\decks')

files = sorted(glob.glob('*.html'))

with open('image_links.txt', 'w') as out:
    for f in files:
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        
        urls = re.findall(r'images\.unsplash\.com/(photo-[^\'"]+)', content)
        if urls:
            out.write(f"\n=== {f} ===\n")
            for url in urls:
                out.write(f"https://unsplash.com/photos/{url.split('?')[0]}\n")

print("Links saved to image_links.txt")
