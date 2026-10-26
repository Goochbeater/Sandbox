#!/usr/bin/env python3
"""ENI Tutor — build the browser knowledge base bundle.

Reads every markdown file under <root>/kb, chunks it heading-aware, builds a
BM25 inverted index with title/heading field weights, and writes:

  <root>/data/kb.js   ->  window.KB_DATA = {docs, chunks, index, clen, avgdl}

Re-runnable:  python3 tools/build_kb.py
"""
import os
import re
import json
from collections import defaultdict, Counter

# The project root is the parent of tools/ (works from the repo checkout or any copy).
WS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB = os.path.join(WS, 'kb')
OUT = os.path.join(WS, 'data')
os.makedirs(OUT, exist_ok=True)

STOP = set("""a an the and or but if then than that this these those is are was were be been being of in on at to
for from by with without as it its you your yours i me my we our us they them their he she his her do does did
doing done not no nor so such can could will would shall should may might must have has had having there here when
where why how what which who whom whose all any both each few more most other some only own same too very just don
now also into over under again further once""".split())


def fm_parse(text):
    meta, body = {}, text
    if text.startswith('---'):
        parts = text.split('---', 2)
        if len(parts) >= 3:
            head, body = parts[1], parts[2]
            for line in head.split('\n'):
                if ':' in line:
                    k, v = line.split(':', 1)
                    k, v = k.strip(), v.strip().strip('"')
                    if k == 'tags':
                        v = [t.strip().strip('"\'') for t in v.strip('[]').split(',') if t.strip()]
                    meta[k] = v
    return meta, body.strip()


def tokenize(s):
    out = []
    for t in re.sub(r'[^a-z0-9+#.\-]+', ' ', s.lower()).split():
        t = t.strip('.-+')
        if len(t) < 2 or t in STOP:
            continue
        if len(t) > 3 and t.endswith('s') and not t.endswith('ss') and t not in ('as', 'is', 'was', 'has', 'its', 'this'):
            t = t[:-1]
        out.append(t)
    return out


def sectionize(body):
    lines, sections, buf = body.split('\n'), [], []
    state = {'h2': '', 'h3': ''}
    infence = False

    def flush():
        t = '\n'.join(buf).strip()
        if t:
            sections.append((state['h2'], state['h3'], t))
        del buf[:]

    for ln in lines:
        if ln.strip().startswith('```'):
            infence = not infence
        if not infence:
            m3 = re.match(r'^(#{3,6})\s+(.*)$', ln)
            m2 = re.match(r'^(#{1,2})\s+(.*)$', ln)
            if m3:
                flush(); state['h3'] = m3[2].strip()
            elif m2:
                flush(); state['h2'] = m2[2].strip(); state['h3'] = ''
        buf.append(ln)
    flush()
    return sections


def split_long(t, limit=1350):
    if len(t) <= limit:
        return [t]
    parts, cur = [], ''
    for para in re.split(r'\n\s*\n', t):
        if len(para) > limit:
            if cur:
                parts.append(cur); cur = ''
            c = ''
            for s in re.split(r'(?<=[.!?])\s+', para):
                if len(c) + len(s) + 1 > limit:
                    if c:
                        parts.append(c)
                    c = s
                else:
                    c = (c + ' ' + s).strip()
            if c:
                parts.append(c)
        else:
            if len(cur) + len(para) + 2 > limit and cur:
                parts.append(cur); cur = para
            else:
                cur = (cur + '\n\n' + para).strip()
    if cur:
        parts.append(cur)
    out = []
    for i, p in enumerate(parts):
        out.append(p)
        if i + 1 < len(parts):
            tail = p[-220:].strip()
            if tail:
                out.append('...\n' + tail)
    return out


def main():
    docs, chunks, docid = [], [], 0
    for dp, dn, fn in os.walk(KB):
        for f in sorted(fn):
            if not f.endswith('.md'):
                continue
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, WS)
            text = open(p, encoding='utf-8', errors='replace').read()
            meta, body = fm_parse(text)
            docid += 1
            did = 'D%02d' % docid
            title = meta.get('title') or f.replace('.md', '').replace('-', ' ').title()
            d = dict(id=did, title=title, date=meta.get('date') or None,
                     category=meta.get('category') or 'Article', url=meta.get('url') or '',
                     source=meta.get('source') or '', type=meta.get('type') or (meta.get('category') or '').lower(),
                     path=rel, words=len(body.split()))
            docs.append(d)
            for (h2, h3, sec) in sectionize(body):
                for piece in split_long(sec):
                    clean = re.sub(r'\n{3,}', '\n\n', piece).strip()
                    if len(clean) < 90:
                        continue
                    chunks.append(dict(id='KB-%04d' % (len(chunks) + 1), doc=did, title=title,
                                       heading=' / '.join(x for x in [h2, h3] if x) or title,
                                       url=d['url'], date=d['date'], category=d['category'],
                                       text=clean, len=len(clean)))

    postings, clen = defaultdict(list), []
    for i, c in enumerate(chunks):
        toks = tokenize(c['title']) * 3 + tokenize(c['heading']) * 2 + tokenize(c['text'])
        cnt = defaultdict(int)
        for t in toks:
            cnt[t] += 1
        clen.append(sum(cnt.values()))
        for t, f in cnt.items():
            postings[t].append([i, f])

    data = dict(generated='2026-10-20', docs=docs, chunks=chunks,
                index=dict(postings), clen=clen, avgdl=sum(clen) / max(1, len(clen)))
    js = ("(function(g){ g.KB_DATA = " + json.dumps(data, ensure_ascii=False, separators=(',', ':')) +
          "; })(typeof window!=='undefined'?window:globalThis);\n")
    with open(os.path.join(OUT, 'kb.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    print('docs=%d chunks=%d terms=%d bytes=%d' % (len(docs), len(chunks), len(postings), len(js)))
    print(Counter(d['category'] for d in docs))


if __name__ == '__main__':
    main()
