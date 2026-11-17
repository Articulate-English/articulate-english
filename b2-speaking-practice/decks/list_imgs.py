import re
import glob
import os

os.chdir(r'C:\Users\irieb\Documents\William-Projects\2-websites\articulate-english\b2-fce-speaking\decks')

files = sorted(glob.glob('*.html'))

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    # Extract image URLs (just the photo IDs)
    urls = re.findall(r'images\.unsplash\.com/(photo-[^\'"]+)', content)
    if urls:
        print(f"https://unsplash.com/photos/{urls[0].split('?')[0]}")
