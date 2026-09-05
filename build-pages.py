# -*- coding: utf-8 -*-
"""多页面改造阶段2：由单页 index.html 生成六个独立页面。
只做 markup 手术：外壳（head/导航/浮层/播放器/页脚/脚本引用）六个页面完全一致，
仅 <html data-page>、<title>、导航高亮和 <main> 内容不同。
视图块做"页面化"：去 hidden/dialog 语义、去关闭按钮（docViewer/profileView 等真浮层不动）。
"""
import io, re, os, sys

SRC = 'index.html'
PAGES = [
    # (data-page, 目录, 文件标题, 内容块 id 或 'home')
    ('home',  None,   'YHuo — 个人主页', 'home'),
    ('tools', 'tools', '工具合集 - YHuo', 'toolsView'),
    ('docs',  'docs',  '文档 - YHuo',     'docsView'),
    ('ai',    'ai',    'AI 助手 - YHuo',  'aiView'),
    ('misc',  'misc',  '杂项 - YHuo',     'miscView'),
    ('board', 'board', '留言板 - YHuo',   'boardView'),
]

with io.open(SRC, 'r', encoding='utf-8', newline='') as f:
    lines = f.read().split('\n')

def find(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    raise SystemExit('marker not found after line %d' % start)

def walk_block(start, tag):
    """从 start 行（含开标签）按标签配对找块结束行（含闭标签），返回 (start, end) 0-based 闭区间。"""
    open_re = re.compile(r'<%s\b' % tag)
    close_re = re.compile(r'</%s>' % tag)
    depth = 0
    for i in range(start, len(lines)):
        depth += len(open_re.findall(lines[i])) - len(close_re.findall(lines[i]))
        if depth <= 0 and i > start:
            return (start, i)
        if depth == 0 and i == start and not open_re.search(lines[i]):
            raise SystemExit('block walk failed at line %d' % start)
    raise SystemExit('unbalanced %s block from line %d' % (tag, start))

def trim_comments_above(idx):
    """把块起点上方的空行/注释行并入块（属于该块的引导注释）。返回新起点。"""
    i = idx - 1
    while i >= 0:
        s = lines[i].strip()
        if s == '' or s.startswith('<!--'):
            i -= 1
        else:
            break
    return i + 1

# ---- 定位关键标记 ----
i_html    = find(lambda l: l.startswith('<html'))
i_header  = find(lambda l: '<header class="site-header"' in l)
i_main    = find(lambda l: '<main class="page-main">' in l)
i_hero    = find(lambda l: 'class="hero-section"' in l)
i_misc    = find(lambda l: 'id="miscView"' in l)
i_tools   = find(lambda l: 'id="toolsView"' in l)
i_docs    = find(lambda l: 'id="docsView"' in l)
i_mainend = find(lambda l: '</main>' in l, i_docs)
i_appear  = find(lambda l: 'id="appearDock"' in l, i_mainend)
i_profile = find(lambda l: 'id="profileView"' in l, i_appear)
i_sched   = find(lambda l: 'id="schedEditor"' in l, i_profile)
i_bg      = find(lambda l: 'id="bgPicker"' in l, i_sched)
i_ai      = find(lambda l: 'id="aiView"' in l, i_bg)
i_docv    = find(lambda l: 'id="docViewer"' in l, i_ai)
i_board   = find(lambda l: 'id="boardView"' in l, i_docv)
i_cmdk    = find(lambda l: 'id="cmdk"' in l, i_board)
i_tail    = find(lambda l: '<script src="/assets/common.js">' in l)

hero_blk  = walk_block(i_hero, 'section')
misc_blk  = walk_block(i_misc, 'div')
tools_blk = walk_block(i_tools, 'div')
docs_blk  = walk_block(i_docs, 'div')
ai_blk    = walk_block(i_ai, 'div')
board_blk = walk_block(i_board, 'div')

# POST（</main> 之后到脚本之前）：含全部浮层/页脚/播放器；ai/board 两块要从外壳里去掉
post_ranges = [(trim_comments_above(i_ai), ai_blk[1]), (trim_comments_above(i_board), board_blk[1])]

def keep_post(a, b):
    """返回 [a,b] 中去掉 post_ranges 的行列表。"""
    out = []
    i = a
    while i <= b:
        hit = None
        for ra, rb in post_ranges:
            if ra == i:
                hit = rb
                break
        if hit is not None:
            i = hit + 1
            continue
        out.append(lines[i])
        i += 1
    return out

POST = keep_post(i_mainend + 1, i_tail - 1)
TAIL = lines[i_tail:]

# ---- 视图块"页面化"：去 hidden/dialog 语义 + 去关闭按钮 ----
def pageify(blk, close_id):
    a, b = blk
    rows = lines[a:b + 1]
    out = []
    i = 0
    while i < len(rows):
        l = rows[i]
        if i == 0:
            l = re.sub(r'\s+hidden role="dialog" aria-modal="true"', '', l)
        if close_id and ('id="%s"' % close_id) in l:
            # 跳过整个 <button ...> ... </button>
            j = i
            while '</button>' not in rows[j]:
                j += 1
            i = j + 1
            continue
        out.append(l)
        i += 1
    return out

VIEW = {
    'miscView':  pageify(misc_blk,  'miscViewClose'),
    'toolsView': pageify(tools_blk, 'toolsViewClose'),
    'docsView':  pageify(docs_blk,  'docsViewClose'),
    'aiView':    pageify(ai_blk,    'aiViewClose'),   # 只删关闭钮，保留"新对话"
    'boardView': pageify(board_blk, 'boardViewClose'),
}

# ---- 外壳组装 ----
HEAD  = lines[0:i_header]                    # 1..header 之前（含 </head><body>/背景层/流星）
HEADER= lines[i_header:i_main]               # <header>...</header>
MAIN_OPEN_LINE = lines[i_main]               # <main class="page-main">
MAIN_CLOSE_LINE = lines[i_mainend]           # </main>
ANCHOR = lines[i_main + 1:i_hero]            # #home 锚点 + 引导注释（仅首页用）

# 首页 <main>：锚点 + hero
HOME_MAIN = [MAIN_OPEN_LINE] + ANCHOR + lines[hero_blk[0]:hero_blk[1] + 1] + [MAIN_CLOSE_LINE]

def build_nav(page_key):
    """重建 <nav>：真链接；page_key 为当前页（home 用 #home 锚点并高亮首页）。"""
    items = [
        ('home',  '/',   '首页', 'home'),
        ('tools', '/tools/', '工具', None),
        ('docs',  '/docs/',  '文档', None),
        ('ai',    '/ai/',    'AI',   None),
        ('misc',  '/misc/',  '杂项', None),
        ('board', '/board/', '留言', None),
    ]
    out = ['    <nav class="site-nav" aria-label="主导航">']
    for key, href, label, target in items:
        cls = 'nav-link'
        if key == 'ai':
            cls += ' ai-entry'
        active = key == page_key
        if key == 'home' and page_key == 'home':
            href = '#home'
        if active:
            cls += ' active'
        attrs = ''
        if key == 'home' and page_key == 'home':
            attrs = ' data-target="home"'
        if key != 'home':
            attrs += ' id="%sBtn"' % key
        if active:
            attrs += ' aria-current="page"'
        out.append('      <a href="%s" class="%s"%s>%s</a>' % (href, cls, attrs, label))
    out.append('    </nav>')
    return out

def splice_nav(header_rows, nav_rows):
    a = b = None
    for i, l in enumerate(header_rows):
        if '<nav class="site-nav"' in l:
            a = i
        if a is not None and '</nav>' in l:
            b = i
            break
    assert a is not None and b is not None, 'nav not found'
    return header_rows[:a] + nav_rows + header_rows[b + 1:]

def build_page(page_key, title, content_key):
    head = list(HEAD)
    head[i_html] = re.sub(r'<html([^>]*)>', lambda m: '<html%s data-page="%s">' % (m.group(1).rstrip(), page_key), head[i_html])
    for i, l in enumerate(head):
        if '<title>' in l:
            head[i] = '  <title>%s</title>' % title
            break
    header = splice_nav(list(HEADER), build_nav(page_key))
    if content_key == 'home':
        main_rows = HOME_MAIN
    else:
        main_rows = [MAIN_OPEN_LINE] + VIEW[content_key] + [MAIN_CLOSE_LINE]
    return head + header + main_rows + POST + TAIL

for key, folder, title, content in PAGES:
    rows = build_page(key, title, content)
    text = '\n'.join(rows)
    if folder:
        if not os.path.isdir(folder):
            os.makedirs(folder)
        path = os.path.join(folder, 'index.html')
    else:
        path = SRC
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print('%-18s %5d lines' % (path, len(rows)))

print('OK')
