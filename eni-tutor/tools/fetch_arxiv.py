#!/usr/bin/env python3
"""Ingest arXiv papers from tools/arxiv_manifest.json into kb/articles/.

Run this on a machine with arXiv access (the build sandbox blocks arxiv.org):

  python3 tools/fetch_arxiv.py              # every paper not yet ingested
  python3 tools/fetch_arxiv.py 2402.04249   # just one id
  python3 tools/build_kb.py                 # then rebuild data/kb.js

For each paper it reads the arXiv HTML rendering (https://arxiv.org/html/<id>),
converts it to plain Markdown, and records the licence shown on the abstract
page in the front matter. Papers without an HTML rendering are skipped and
listed at the end; ingest those by hand from the PDF.

Check each licence before you publish the site: arXiv's default licence lets
arXiv distribute a paper but does not, by itself, let anyone else republish it.
"""
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'tools', 'arxiv_manifest.json')
OUT_DIR = os.path.join(ROOT, 'kb', 'articles')
UA = 'eni-tutor-kb-builder/1.0 (research use; contact the repository owner)'
SKIP_TAGS = {'script', 'style', 'nav', 'footer', 'button', 'math', 'svg'}
BLOCK_TAGS = {'p', 'li', 'div', 'section', 'tr', 'blockquote', 'pre', 'figcaption'}
HEADING = {'h1': '# ', 'h2': '## ', 'h3': '### ', 'h4': '#### ', 'h5': '##### ', 'h6': '###### '}


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


class ToMarkdown(HTMLParser):
    """Minimal HTML-to-Markdown: headings, paragraphs, lists, code. Enough for kb chunking."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.buf, self.skip, self.heading = [], [], 0, None

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS or ('class', 'ltx_note_outer') in attrs:
            self.skip += 1
        elif tag in HEADING:
            self.flush()
            self.heading = HEADING[tag]
        elif tag in BLOCK_TAGS:
            self.flush()
        elif tag == 'li':
            self.flush()
            self.buf.append('- ')

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self.skip:
            self.skip -= 1
        elif tag in HEADING:
            self.flush(prefix=self.heading or '')
            self.heading = None
        elif tag in BLOCK_TAGS:
            self.flush()

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)

    def flush(self, prefix=''):
        text = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
        self.buf = []
        if text:
            self.out.append(prefix + text if prefix else text)

    def markdown(self):
        self.flush()
        return '\n\n'.join(self.out)


def licence_from_abs(arxiv_id):
    try:
        page = get('https://arxiv.org/abs/' + arxiv_id)
    except (urllib.error.URLError, OSError):
        return 'unknown', ''
    m = re.search(r'<meta name="citation_title" content="([^"]+)"', page)
    title = html.unescape(m.group(1)) if m else ''
    lic = re.search(r'href="(https?://(?:creativecommons\.org/licenses/[^"]+|arxiv\.org/licenses/[^"]+))"', page)
    return (lic.group(1) if lic else 'arXiv non-exclusive licence (no CC licence shown)'), title


def ingest(paper):
    arxiv_id = paper['id']
    lic, title = licence_from_abs(arxiv_id)
    try:
        body = ToMarkdown()
        body.feed(get('https://arxiv.org/html/' + arxiv_id))
        text = body.markdown()
    except (urllib.error.HTTPError, urllib.error.URLError, OSError) as e:
        return None, 'no HTML rendering (%s)' % e
    if len(text) < 2000:
        return None, 'HTML too short to be a full paper'
    title = title or paper.get('title', arxiv_id)
    path = os.path.join(OUT_DIR, 'arxiv-%s.md' % arxiv_id.replace('/', '_'))
    front = (
        '---\n'
        'title: "%s"\n'
        'date: null\n'
        'category: Research\n'
        'source: arXiv:%s\n'
        'type: article\n'
        'licence: "%s"\n'
        'tags: [arxiv, red-team, research]\n'
        '---\n\n'
    ) % (title.replace('"', "'"), arxiv_id, lic)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(front + '# ' + title + '\n\n' + text + '\n')
    return path, lic


def main(argv):
    with open(MANIFEST, encoding='utf-8') as f:
        papers = json.load(f)['papers']
    wanted = set(argv)
    os.makedirs(OUT_DIR, exist_ok=True)
    skipped = []
    for p in papers:
        if p.get('status') == 'kb-card' or (wanted and p['id'] not in wanted):
            continue
        result, note = ingest(p)
        if result:
            print('ingested %s -> %s [%s]' % (p['id'], os.path.relpath(result, ROOT), note))
        else:
            print('skipped  %s: %s' % (p['id'], note))
            skipped.append(p['id'])
        time.sleep(3)  # be polite to arXiv
    if skipped:
        print('\nNeeds a manual PDF ingest: ' + ', '.join(skipped))


if __name__ == '__main__':
    main(sys.argv[1:])
