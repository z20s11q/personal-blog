/* Architecture page engine: overview captions, step-by-step panorama, component inspector.
   Content comes from ArchPage.init(config); see the arch-page template README for the config shape. */
(() => {
  'use strict'

  let REPO = ''
  let MEDIA = {}, KINDS = {}, PEEL = {}, FIELD_DOC = {}, DATA_TAG = '录制'
  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  function srcHref(ref) {
    const [path, lines] = ref.split(':')
    const plain = /\.(md|ya?ml|jsonl?)$/.test(path) ? '?plain=1' : ''
    if (!lines) return REPO + path
    const [a, b] = lines.split('-')
    return `${REPO}${path}${plain}#L${a}${b ? `-L${b}` : ''}`
  }
  function srcText(ref) {
    const [path, lines] = ref.split(':')
    const file = path.split('/').pop()
    return lines ? `${file}:${lines}` : file
  }
  function srcLink(ref) {
    const [label, r] = Array.isArray(ref) ? ref : [null, ref]
    return `<a class="src" href="${srcHref(r)}" title="${esc(r)}" target="_blank" rel="noopener">${esc(label ?? srcText(r))}</a>`
  }
  function fillSrcLinks(root = document) {
    for (const a of $$('a.src[data-src]', root)) {
      const ref = a.dataset.src
      a.href = srcHref(ref)
      a.title = ref
      a.target = '_blank'
      a.rel = 'noopener'
      if (!a.textContent.trim()) a.textContent = srcText(ref)
    }
  }

  function highlightJson(value) {
    const text = JSON.stringify(value, null, 2)
    return esc(text).replace(
      /(&quot;(?:\\.|[^&\\]|&(?!quot;))*&quot;)(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      (m, str, colon, bool) => {
        if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`
        if (bool) return `<span class="b">${m}</span>`
        if (m === 'null') return `<span class="z">${m}</span>`
        return `<span class="n">${m}</span>`
      },
    )
  }
  const fmt = (s) => esc(s ?? '').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((#[\w-]+)\)/g, '<a href="$2">$1</a>')
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x)
  const pre = (v) => `<pre class="json">${highlightJson(v)}</pre>`
  const srcList = (list) => list?.length ? `<div class="pp-src"><span>源码</span>${list.map(srcLink).join('')}</div>` : ''

  function peel(v, steps) {
    const layers = []
    let cur = v, path = ''
    for (const step of steps) {
      if (!isObj(cur)) break
      const { k, name } = step(cur)
      if (!k || !isObj(cur[k])) break
      const { [k]: inner, ...head } = cur
      layers.push({ name, key: path ? path.split('.').pop() : '最外层', path, head })
      path = path ? `${path}.${k}` : k
      cur = inner
    }
    return { layers, body: { key: path ? path.split('.').pop() : '', path, value: cur } }
  }
  const preview = (x) => x === null ? 'null' : typeof x === 'string' ? (x.length > 120 ? `${JSON.stringify(x.slice(0, 120))}…（共 ${x.length} 字）` : JSON.stringify(x)) : String(x)
  const shape = (x) => Array.isArray(x) ? `<b>[ ]</b> 列表 · ${x.length} 项` : `<b>{ }</b> 对象 · ${Object.keys(x).length} 个字段`
  const ARR_SHOW = 3, ARR_STEP = 5
  let arrSeq = 0
  function fieldRows(v, path = '', depth = 0, out = []) {
    const arr = Array.isArray(v), id = arr ? `a${++arrSeq}` : null
    const kids = arr ? v.map((x, i) => [i, x, null]) : Object.entries(v).map(([k, x]) => [k, x, k])
    for (const [label, x, k] of kids) {
      const p = path ? `${path}.${label}` : String(label)
      const nest = !!(x && typeof x === 'object' && Object.keys(x).length)
      const el = arr ? { arr: id, ai: label } : {}
      if (arr && nest) out.push({ box: true, label, x, depth, path: p, ...el, inner: fieldRows(x, p) })
      else {
        out.push({ label, x, k, depth, path: p, group: nest, ...el })
        if (nest) fieldRows(x, p, depth + 1, out)
      }
    }
    if (arr && v.length > ARR_SHOW) out.push({ ctl: true, arr: id, total: v.length, depth })
    return out
  }
  function treeRows(rows) {
    const later = (i, d) => { for (let j = i + 1; j < rows.length; j++) { if (rows[j].depth < d) return false; if (rows[j].depth === d) return true } return false }
    return rows.map((r, i) => ({ ...r, kids: (rows[i + 1]?.depth ?? -1) > r.depth, more: later(i, r.depth), first: !rows.slice(0, i).some((q) => q.depth === r.depth && r.depth === 0),
      rails: Array.from({ length: r.depth }, (_, L) => later(i, L)) }))
  }
  const COL = (L) => 10 + L * 14
  function treeCell(r) {
    const d = r.depth
    const own = r.depth === 0 && r.first ? (r.more ? 'start' : '') : r.more ? 'full' : 'end'
    return r.rails.map((on, L) => on ? `<i class="tv" style="left:${COL(L)}px"></i>` : '').join('')
      + (own ? `<i class="tv ${own}" style="left:${COL(d)}px"></i>` : '')
      + `<i class="tl" style="left:${COL(d)}px"></i>`
      + (r.box || r.ctl ? '' : `<i class="dot${r.kids ? ' grp' : ''}" style="left:${COL(d + 1)}px"></i>`)
      + (r.kids ? `<i class="tv down" style="left:${COL(d + 1)}px"></i>` : '')
  }
  const valueKind = (x) => x === null ? 'z' : typeof x === 'string' ? 's' : typeof x === 'number' ? 'n' : typeof x === 'boolean' ? 'b' : ''
  const rowsHtml = (rows, ctx) => treeRows(rows).map((r) => r.ctl ? ctlRow(r) : r.box ? boxRow(r, ctx) : fieldRow(r, ctx)).join('')
  function rowAttr(r, ctx, cls) {
    const f = ctx.focus
    if (f && r.path === f) cls.push('focus')
    else if (f && r.path.startsWith(`${f}.`)) cls.push('inf')
    return `${cls.length ? ` class="${cls.join(' ')}"` : ''}${r.arr ? ` data-a="${r.arr}" data-ai="${r.ai}"${r.ai >= ARR_SHOW ? ' hidden' : ''}` : ''}`
  }
  const boxRow = (r, ctx) => `<tr${rowAttr(r, ctx, ['box'])}><td colspan="3" style="padding-left:${COL(r.depth + 1)}px">${treeCell(r)}<div class="arr-box"><span class="arr-idx">${r.label}</span><span class="arr-shape">${shape(r.x)}</span><table class="dbox-fields">${rowsHtml(r.inner, ctx)}</table></div></td></tr>`
  function fieldRow(r, ctx) {
    const doc = ctx.layer?.[r.path] ?? FIELD_DOC[r.k] ?? ''
    const tag = r.path === ctx.focus ? '<em class="fk-tag">本步数据</em>' : ''
    return `<tr${rowAttr(r, ctx, [`d${Math.min(r.depth, 4)}`, ...(r.kids ? ['grp'] : [])])}><th style="padding-left:${COL(r.depth + 1) + 9}px">${treeCell(r)}<span class="${r.k == null ? 'fk-i' : 'fk'}">${esc(r.label)}</span>${tag}</th>`
      + `<td>${r.group ? `<span class="dbox-type">${shape(r.x)}</span>` : `<span class="fv-${valueKind(r.x)}">${esc(preview(r.x))}</span>`}</td><td class="doc">${esc(doc)}</td></tr>`
  }
  const ctlInner = (n, total) => `<span class="arr-n">显示 ${n} / ${total} 项</span>`
    + `<button type="button" data-more="${ARR_STEP}"${n >= total ? ' hidden' : ''}>再显示 ${Math.min(ARR_STEP, total - n)} 项</button><button type="button" data-more="all"${n >= total ? ' hidden' : ''}>显示全部</button>`
    + `<button type="button" data-more="-${ARR_STEP}"${n <= ARR_SHOW ? ' hidden' : ''}>少显示 ${Math.min(ARR_STEP, n - ARR_SHOW)} 项</button><button type="button" data-more="reset"${n <= ARR_SHOW ? ' hidden' : ''}>收起</button>`
  const ctlRow = (r) => `<tr class="ctl" data-ctl="${r.arr}" data-total="${r.total}" data-shown="${ARR_SHOW}"><td colspan="3" style="padding-left:${COL(r.depth + 1)}px">${treeCell(r)}<span class="arr-ctl">${ctlInner(ARR_SHOW, r.total)}</span></td></tr>`
  function arrMore(ev) {
    const b = ev.target.closest('.arr-ctl button')
    if (!b) return
    const tr = b.closest('tr.ctl'), total = Number(tr.dataset.total), cur = Number(tr.dataset.shown), m = b.dataset.more
    const n = m === 'all' ? total : m === 'reset' ? ARR_SHOW : Math.min(total, Math.max(ARR_SHOW, cur + Number(m)))
    tr.dataset.shown = n
    for (const row of tr.parentElement.children) if (row.dataset.a === tr.dataset.ctl) row.hidden = Number(row.dataset.ai) >= n
    tr.querySelector('.arr-ctl').innerHTML = ctlInner(n, total)
  }
  function fieldTable(v, ctx = {}) {
    if (!v || typeof v !== 'object') return `<table class="dbox-fields"><tr><td>${esc(preview(v))}</td></tr></table>`
    const rows = fieldRows(v)
    return rows.length ? `<table class="dbox-fields">${rowsHtml(rows, ctx)}</table>` : `<p class="dbox-note">${Array.isArray(v) ? '空列表 []' : '空对象 {}'}</p>`
  }
  function kindLine(x) {
    const info = KINDS[x.k]
    if (!info) return ''
    const [medium, how] = info, m = MEDIA[medium]
    return ` · <span title="${esc(m?.[1] ?? '')}">${esc(m?.[0] ?? medium)}</span>${how ? ` · ${fmt(how)}` : ''}`
  }
  function jsonAnatomy(v, k) {
    const { layers, body } = peel(v, PEEL[k] ?? [])
    const raw = JSON.stringify(v) ?? ''
    const path = layers.length ? `<div class="dbox-path"><span>位置</span>${layers.map((L) => `<code>${esc(L.key)}</code>`).join('<i>›</i>')}<i>›</i><b>${esc(body.key)}</b><small>最外层：${esc(layers[0].name)}</small></div>` : ''
    const ctx = layers.length ? { focus: body.path, layer: Object.fromEntries(layers.slice(1).map((L) => [L.path, L.name])) } : {}
    return `${path}${fieldTable(v, ctx)}<details class="dbox-raw"><summary>原文 JSON · ${raw.length.toLocaleString()} 字符</summary>${pre(v)}</details>`
  }
  function anatomy(x) {
    const note = x.note ? `<p class="dbox-note">${fmt(x.note)}</p>` : ''
    if (x.t === 'json') return note + jsonAnatomy(x.v, x.k)
    if (x.t === 'jsonl') return `${note}<div class="dbox-lines">${x.v.map((line, i) => `<details class="dbox-line"><summary><b>第 ${i + 1} 行</b><code>${esc(line?.type ?? '')}</code>${line?.seq !== undefined ? `<span>seq ${esc(line.seq)}</span>` : ''}</summary>${jsonAnatomy(line, x.line ?? x.k)}</details>`).join('')}</div>`
    const line = String(x.v).split('\n').find((l) => l.startsWith('data: '))
    let parsed = null
    try { parsed = line && JSON.parse(line.slice(6)) } catch { parsed = null }
    return `${note}<pre class="text">${esc(x.v)}</pre>${isObj(parsed) || Array.isArray(parsed) ? `<div class="dbox-sub">data 行的 JSON 字段</div>${fieldTable(parsed)}` : ''}`
  }
  const dataBox = (label, x) => `<div class="dbox"><div class="dbox-h"><b>${esc(label)}</b><span class="dbox-meta">${esc(DATA_TAG)}${kindLine(x)}</span></div>${anatomy(x)}</div>`
  const J = (v, k, note) => ({ t: 'json', v, k, note })

  function initOverview(ov) {
    if (!ov?.nodes) return
    const NODES = ov.nodes
    const canvas = $('#overview-canvas')
    const caption = $('#overview-caption')
    if (!canvas || !caption) return
    const groups = $$('[data-node-id]', canvas)
    function show(id) {
      const n = NODES[id]
      if (!n) return
      for (const g of groups) g.setAttribute('aria-pressed', String(g.dataset.nodeId === id))
      caption.innerHTML = `<div class="oc-kicker">${esc(n.kicker)}</div><h3>${esc(n.title)}</h3><p>${fmt(n.text)}</p>`
        + `<div class="oc-src">${(n.src ?? []).map(srcLink).join('')}</div>`
        + `<div class="oc-jump">${(n.pano ?? []).map(([story, node, label]) => `<a href="#intro" data-pano-to="${story}:${node}">${esc(label ?? window.__panoLabel?.(story, String(node)) ?? '')}</a>`).join('')}${(n.jump ?? []).map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}</div>`
    }
    function showIntro() {
      const it = ov.intro
      for (const g of groups) g.setAttribute('aria-pressed', 'false')
      caption.innerHTML = `<div class="oc-kicker">${esc(it.kicker ?? '怎么读')}</div><h3>${esc(it.title)}</h3>${(it.text ?? []).map((t) => `<p>${fmt(t)}</p>`).join('')}`
    }
    const notes = $('#overview-notes')
    if (notes) notes.innerHTML = (ov.notes ?? []).map(([title, text, color]) => `<div style="--nc:${color ?? '#23786a'}"><b>${esc(title)}</b>${fmt(text)}</div>`).join('')
    caption.addEventListener('click', (e) => {
      const a = e.target.closest('[data-pano-to]')
      if (!a || !window.__panoJump) return
      e.preventDefault()
      window.__panoJump(...a.dataset.panoTo.split(':'))
    })
    for (const g of groups) {
      g.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); show(g.dataset.nodeId) }, true)
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(g.dataset.nodeId) } })
    }
    if (ov.initial || !ov.intro) show(ov.initial ?? Object.keys(NODES)[0])
    else showIntro()
  }

  function normalizeStories(stories, edgeById) {
    return stories.map((st) => ({
      ...st,
      steps: st.steps.filter((s) => s.text || s.subs?.length).map((s) => {
        const subs = (s.subs ?? []).map((x) => ({ ...x, n: x.n ?? [], e: (x.e ?? []).filter((id) => edgeById.has(id)), data: x.data ?? [] }))
        return { ...s, subs, data: s.data ?? [], n: s.n ?? [...new Set(subs.flatMap((x) => x.n))], e: (s.e ?? [...new Set(subs.flatMap((x) => x.e))]).filter((id) => edgeById.has(id)) }
      }),
    }))
  }

  function initPano(P) {
    const root = $('#pano')
    if (!root || !P?.stories?.length) return
    const ZONES = P.zones, PNODES = P.nodes, TERMS = P.terms ?? {}, SUB_TAGS = P.subTags ?? {}
    const nodeById = new Map(PNODES.map((n) => [n.id, n]))
    const EDGES = P.edges.map((e) => ({ id: `${e.from}>${e.to}`, ...e }))
    const edgeById = new Map(EDGES.map((e) => [e.id, e]))
    const STORIES = normalizeStories(P.stories, edgeById)
    let story = STORIES[0], stepIdx = -1, subIdx = 0, edgeSel = null, hoverSub = 0
    const subsOf = (s) => s.subs ?? []
    const step = () => stepIdx >= 0 ? story.steps[stepIdx] : null
    const shownIdx = () => hoverSub || subIdx
    const shown = () => { const s = step(); return s && shownIdx() > 0 ? subsOf(s)[shownIdx() - 1] : null }
    function ranges(nums) {
      const out = []
      for (const n of nums) {
        const last = out.at(-1)
        if (last && n === last[1] + 1) last[1] = n
        else out.push([n, n])
      }
      return out.map(([a, b]) => a === b ? `${a}` : b === a + 1 ? `${a}、${b}` : `${a}–${b}`).join('、')
    }
    const shortName = (id) => nodeById.get(id)?.name ?? id
    const nodeChip = (id) => { const n = nodeById.get(id); return n ? `<span class="pp-chip" style="--zc:${ZONES[n.zone][1]}">${esc(n.name)}</span>` : '' }
    function cardHtml(n) {
      const [row, col, span] = n.at, place = `grid-row:${row};grid-column:${col} / span ${span}`
      if (n.legend) return `<div class="pnode-legend" style="${place}"><b>颜色 = 它属于哪一层</b>${Object.values(ZONES).map(([name, color]) => `<span><i style="background:${color}"></i>${esc(name)}</span>`).join('')}<p>${fmt(P.legend ?? '实线是主流程，虚线是旁路；线上的字是两边之间传的数据。')}</p></div>`
      const zone = ZONES[n.zone], terms = (n.terms ?? []).filter((id) => TERMS[id])
      return `<article class="pnode" data-node="${n.id}" style="${place};--zc:${zone[1]}" aria-label="${esc(n.name)}">
        <header><span class="pz">${esc(zone[0])}</span></header>
        <h3>${esc(n.name)}</h3><code class="pcode">${esc(n.code)}</code><p class="pjob">${fmt(n.job)}</p>
        <p class="pfact"><b>要点</b>${fmt(n.fact)}</p>
        ${terms.length ? `<div class="pterms"><span class="pterms-h">关键概念</span></div><dl class="pdefs">${terms.map((id) => `<div data-term="${id}"><dt>${esc(TERMS[id][0])}</dt><dd>${fmt(TERMS[id][1])}</dd></div>`).join('')}</dl>` : ''}</article>`
    }
    root.innerHTML = `<div class="pano-stories" role="tablist" aria-label="选一个流程">${STORIES.map((s) => `<button type="button" role="tab" data-pano-story="${s.id}">${esc(s.title)}</button>`).join('')}</div>
      <div class="pano-steps" id="pano-steps"></div>
      <div class="pano-layout"><div class="pano-canvas" id="pano-canvas" tabindex="0"><svg class="pano-wires" id="pano-wires" aria-hidden="true"></svg><div class="pano-grid">${PNODES.map(cardHtml).join('')}</div></div>
      <aside class="pano-panel" id="pano-panel" aria-live="polite"></aside></div>`
    const canvas = $('#pano-canvas'), svg = $('#pano-wires'), panel = $('#pano-panel')
    const BRACKET = 15, RANK = { on: 0, story: 1, '': 2, idle: 3 }
    const LABEL_SPOTS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82, 0.1, 0.9]
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
    function drawWires() {
      const box = canvas.getBoundingClientRect()
      const R = {}
      for (const el of canvas.querySelectorAll('.pnode')) {
        const r = el.getBoundingClientRect()
        R[el.dataset.node] = { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top, cx: (r.left + r.right) / 2 - box.left, cy: (r.top + r.bottom) / 2 - box.top, row: nodeById.get(el.dataset.node).at[0] }
      }
      const s = edgeSel ? null : step(), x = edgeSel ? null : shown()
      const seqOf = (id) => s && !x ? ranges(subsOf(s).flatMap((sub, i) => sub.e.includes(id) ? [i + 1] : [])) : ''
      const hotE = new Set(edgeSel ? [edgeSel] : x ? x.e : s?.e ?? []), storyE = new Set(x ? s.e : [])
      const wireClass = (e) => hotE.has(e.id) ? 'on' : storyE.has(e.id) ? 'story' : s || edgeSel ? 'idle' : ''
      const sides = {}
      const plan = EDGES.map((e) => {
        const A = R[e.from], B = R[e.to]
        if (!A || !B) return null
        if (e.route) return { e, A, B }
        const [sa, sb] = A.row === B.row ? (A.cx < B.cx ? ['top', 'top'] : ['bottom', 'bottom']) : A.row < B.row ? ['bottom', 'top'] : ['top', 'bottom']
        const p = { e, A, B, sa, sb }
        ;(sides[`${e.from}:${sa}`] ??= []).push([p, 'a', B]); (sides[`${e.to}:${sb}`] ??= []).push([p, 'b', A])
        return p
      }).filter(Boolean)
      for (const list of Object.values(sides)) {
        list.sort((p, q) => p[2].cx - q[2].cx || EDGES.indexOf(p[0].e) - EDGES.indexOf(q[0].e))
        list.forEach(([p, end], k) => {
          const N = p[end === 'a' ? 'A' : 'B'], side = end === 'a' ? p.sa : p.sb, f = 0.12 + 0.76 * (k + 1) / (list.length + 1)
          p[end] = [N.l + (N.r - N.l) * f, side === 'top' ? N.t : N.b]
        })
      }
      const paths = plan.map((p) => {
        let d, at
        if (p.e.route === 'left') {
          const xl = 14 + 12 * (p.e.lane ?? 0), y1 = p.A.cy, y2 = (p.B.t + p.B.b) / 2 + 14
          return { e: p.e, d: `M${p.A.l},${y1} H${xl} V${y2} H${p.B.l}`, cls: wireClass(p.e) }
        }
        if (p.e.route === 'right') {
          const lane = p.e.lane ?? 0, xr = box.width - 12 - 12 * lane, y1 = p.A.t + (p.A.b - p.A.t) * (0.62 + 0.18 * lane)
          return { e: p.e, d: `M${p.A.r},${y1} H${xr} V${p.B.cy} H${p.B.r}`, cls: wireClass(p.e) }
        }
        const [x1, y1] = p.a, [x2, y2] = p.b
        if (p.sa === p.sb) {
          const y = p.sa === 'top' ? Math.min(y1, y2) - BRACKET : Math.max(y1, y2) + BRACKET
          d = `M${x1},${y1} V${y} H${x2} V${y2}`; at = [(x1 + x2) / 2, y]
        } else {
          d = `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
        }
        return { e: p.e, d, at, cls: wireClass(p.e) }
      })
      svg.setAttribute('width', box.width); svg.setAttribute('height', box.height); svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
      svg.innerHTML = `<defs>${['base', 'on'].map((k) => `<marker id="pano-arrow-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${k === 'on' ? 7 : 6}" markerHeight="${k === 'on' ? 7 : 6}" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${k === 'on' ? '#e0592a' : '#9aa9a4'}"/></marker>`).join('')}</defs>`
        + paths.map((p) => `<path class="wire ${p.cls}${p.e.dash ? ' dash' : ''}" data-edge="${p.e.id}" d="${p.d}" marker-end="url(#pano-arrow-${p.cls === 'on' ? 'on' : 'base'})"/>`).join('')
        + paths.map((p) => `<path class="wire-hit" data-pano-edge="${p.e.id}" d="${p.d}"><title>${esc(p.e.label)}：点击查看这根线上传的消息</title></path>`).join('')
      const blocks = [...canvas.querySelectorAll('.pnode,.pnode-legend')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.left - box.left - 3, y: r.top - box.top - 3, w: r.width + 6, h: r.height + 6 } })
      const placed = []
      for (const p of [...paths].sort((a, b) => RANK[a.cls] - RANK[b.cls])) {
        const el = svg.querySelector(`[data-edge="${CSS.escape(p.e.id)}"]`), len = el.getTotalLength()
        const raw = p.cls === 'on' && x ? `${SUB_TAGS[x.tag] ? `${SUB_TAGS[x.tag][0]} ` : ''}${x.t}` : p.e.label
        const seq = p.cls === 'on' ? (x ? `${shownIdx()}` : seqOf(p.e.id)) : ''
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', `wire-label ${p.cls}`); g.dataset.panoEdge = p.e.id
        g.innerHTML = `<rect rx="4"/><text text-anchor="middle">${seq ? `<tspan class="wire-seq">${esc(seq)}</tspan> ` : ''}${esc(raw.length > 46 ? `${raw.slice(0, 45)}…` : raw)}</text>`
        svg.append(g)
        const text = g.querySelector('text'), bb = text.getBBox(), w = bb.width + 10, h = bb.height + 4
        const spots = [...(p.at ? [p.at] : []), ...LABEL_SPOTS.map((f) => { const q = el.getPointAtLength(len * f); return [q.x, q.y] })]
        const rect = ([cx, cy]) => ({ x: cx - w / 2, y: cy - h / 2, w, h })
        const best = spots.find((c) => { const r = rect(c); return !placed.some((o) => overlaps(r, o)) && !blocks.some((o) => overlaps(r, o)) }) ?? spots.find((c) => !placed.some((o) => overlaps(rect(c), o))) ?? spots[0]
        const r = rect(best); placed.push(r)
        text.setAttribute('x', best[0]); text.setAttribute('y', best[1] - bb.y - bb.height / 2)
        const bg = g.querySelector('rect'); bg.setAttribute('x', r.x); bg.setAttribute('y', r.y); bg.setAttribute('width', w); bg.setAttribute('height', h)
      }
    }
    function renderCards() {
      const E = edgeSel && edgeById.get(edgeSel), s = E ? null : step(), x = E ? null : shown()
      const hot = new Set(E ? [E.from, E.to] : x?.n ?? []), on = new Set([...(s?.n ?? []), ...hot])
      canvas.classList.toggle('sub-mode', !!x || !!E)
      for (const el of canvas.querySelectorAll('.pnode')) {
        const id = el.dataset.node
        el.classList.toggle('on', on.has(id) && !hot.has(id)); el.classList.toggle('hot', hot.has(id)); el.classList.toggle('dim', (!!s || !!E) && !on.has(id))
      }
      root.querySelectorAll('[data-pano-story]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panoStory === story.id)))
      $('#pano-steps').innerHTML = `<button type="button" data-pano-step="-1" class="${stepIdx === -1 ? 'on' : ''}">总览</button>${story.steps.map((st, i) => `<button type="button" data-pano-step="${i}" class="${i === stepIdx ? 'on' : ''}"><b>${i + 1}</b>${esc(st.t)}${st.subs.length ? `<small>${st.subs.length} 小步</small>` : ''}</button>`).join('')}`
    }
    const routeText = (x) => x.n.length > 1 ? `${shortName(x.n[0])} → ${shortName(x.n.at(-1))}` : shortName(x.n[0])
    const subTag = (x) => { const g = SUB_TAGS[x.tag]; return g ? `<span class="pp-stag" style="--tc:${g[1]}">${esc(g[0])}</span>` : '' }
    const subTitle = (x) => `${subTag(x)}<code>${esc(x.t)}</code>`
    function tagLegend(list) {
      const keys = [...new Set(list.map((x) => x.tag).filter((k) => SUB_TAGS[k]))]
      return keys.length ? `<dl class="pp-taglegend"><dt>标题怎么读</dt>${keys.map((k) => `<dd>${subTag({ tag: k })}${fmt(SUB_TAGS[k][2])}</dd>`).join('')}</dl>` : ''
    }
    function subFlow(x) {
      const edges = x.e.map((id) => edgeById.get(id))
      const where = (d) => d[2] ?? (edges.length === 1 ? edges[0].id : edges.length ? null : x.n[0])
      const placed = new Set()
      const boxes = (at) => x.data.filter((d) => where(d) === at).map((d) => { placed.add(d); return dataBox(d[0], d[1]) }).join('')
      const seen = new Set()
      function node(id) {
        const again = seen.has(id)
        seen.add(id)
        const kids = again ? [] : edges.filter((e) => e.from === id)
        const own = again ? '' : boxes(id)
        return `<div class="fl-node">${nodeChip(id)}${again ? '<small>同上</small>' : ''}${edges.length ? '' : '<small>在它内部发生</small>'}</div>${own ? `<div class="fl-at">${own}</div>` : ''}${kids.length ? `<div class="fl-kids">${kids.map(hop).join('')}</div>` : ''}`
      }
      const hop = (e) => `<div class="fl-hop"><div class="fl-seg"><div class="fl-edge">${esc(e.label)}</div>${boxes(e.id)}</div>${node(e.to)}</div>`
      const into = new Set(edges.map((e) => e.to))
      const roots = edges.length ? [...new Set(edges.map((e) => e.from))].filter((id) => !into.has(id)) : [x.n[0]]
      const tree = (roots.length ? roots : [edges[0].from]).map((id) => `<div class="fl-root">${node(id)}</div>`).join('')
      const rest = x.data.filter((d) => !placed.has(d)).map(([label, v]) => dataBox(label, v)).join('')
      return `<div class="pp-flow">${tree}</div>${rest}`
    }
    const subDetail = (x) => `<div class="pp-subdetail">${subFlow(x)}</div>`
    function stepHtml(s, list) {
      const path = s.n.length ? `<div class="pp-path">${s.n.map(nodeChip).join('')}</div>` : ''
      const extra = typeof s.extra === 'function' ? s.extra() : s.extra ?? ''
      const data = s.data.map(([label, v]) => dataBox(label, v)).join('')
      if (!list.length) return `${path}<p class="pp-text">${fmt(s.text)}</p>${extra}${data}${srcList(s.src)}<p class="pp-note">这一步讲整体规则，点“下一步”继续。</p>`
      return `${path}<p class="pp-text">${fmt(s.text)}</p>${extra}${data}
        ${srcList(s.src)}
        <h4>这一步的 ${list.length} 个小步</h4>
        <p class="pp-note">先通读，再点任一条在下方展开它的数据，同一时间只展开一条。左图线上的数字是经过它的小步序号；鼠标停在某条上，左图只亮这一小步经过的线和组件。</p>
        ${tagLegend(list)}
        <ol class="pp-digest">${list.map((x, i) => `<li class="${i + 1 === subIdx ? 'open' : ''}"><button type="button" data-pano-sub="${i + 1}" aria-expanded="${i + 1 === subIdx}"><span class="pp-digest-h"><b>${i + 1}</b>${subTitle(x)}<small>${esc(routeText(x))}</small></span><span class="pp-digest-t">${fmt(x.text)}</span></button>${i + 1 === subIdx ? subDetail(x) : ''}</li>`).join('')}</ol>`
    }
    const edgeSubs = (id) => STORIES.flatMap((st) => st.steps.flatMap((s, i) => s.subs.map((x, k) => ({ st, s, i, x, k })).filter((o) => o.x.e.includes(id))))
    let edgeList = []
    function edgeHtml(id) {
      const e = edgeById.get(id)
      edgeList = edgeSubs(id)
      const steps = STORIES.flatMap((st) => st.steps.map((s, i) => ({ st, s, i })).filter((x) => x.s.e.includes(id)))
      return `<div class="pp-kicker">连线</div><h3>${esc(shortName(e.from))} → ${esc(shortName(e.to))}</h3>
        <div class="pp-path">${nodeChip(e.from)}<i>→</i>${nodeChip(e.to)}</div>
        <p class="pp-text">图上写的是“${esc(e.label)}”。${fmt(e.how ?? '')}</p>
        ${edgeList.length ? `<h4>${STORIES.length} 个流程里经过这根线的 ${edgeList.length} 个小步（点开看原文）</h4>
          ${edgeList.slice(0, 120).map((o, j) => `<details class="pp-edge-msg" data-edge-sub="${j}"><summary><span class="pp-tag">${esc(o.st.title.replace(/（.*$/, ''))}</span>${subTitle(o.x)}<small>第 ${o.i + 1} 步 · 小步 ${o.k + 1}</small></summary><div class="pp-edge-body"></div></details>`).join('')}${edgeList.length > 120 ? `<p class="pp-note">只列前 120 个。</p>` : ''}`
          : `<p class="pp-note">${fmt(e.empty ?? '经过这根线的小步数为 0。')}</p>`}
        ${steps.length ? `<h4>讲到这根线的大步</h4><ol class="pp-outline">${steps.map((x) => `<li><button type="button" data-pano-jump="${x.st.id}:${x.i}">${esc(x.st.title)} · 第 ${x.i + 1} 步：${esc(x.s.t)}</button></li>`).join('')}</ol>` : ''}`
    }
    function edgeSubBody(o) {
      return `<p class="pp-text">${fmt(o.x.text)}</p>${subFlow(o.x)}
        <p class="pp-note"><button type="button" class="pp-link" data-pano-jump="${o.st.id}:${o.i}:${o.k + 1}">在“${esc(o.st.title)}”第 ${o.i + 1} 步里看这一小步 →</button></p>`
    }
    function renderPanel() {
      if (edgeSel) {
        panel.innerHTML = `<div class="pp-nav"><button type="button" data-pano-edge-close="1">← 回到${stepIdx < 0 ? '总览' : `第 ${stepIdx + 1} 步`}</button><span>点图上其他线可以切换</span></div>${edgeHtml(edgeSel)}`
        return
      }
      const s = step(), list = s ? subsOf(s) : [], atEnd = stepIdx === story.steps.length - 1
      const pos = !s ? '总览' : `第 ${stepIdx + 1} / ${story.steps.length} 步${subIdx ? ` · 展开小步 ${subIdx}` : ''}`
      const nav = `<div class="pp-nav"><button type="button" data-pano-go="-1" ${s ? '' : 'disabled'}>← 上一步</button><span>${pos}</span><button type="button" data-pano-go="1" ${atEnd ? 'disabled' : ''}>下一步 →</button></div>`
      if (!s) {
        const total = story.steps.reduce((n, x) => n + x.subs.length, 0)
        panel.innerHTML = `${nav}<div class="pp-kicker">${esc(story.title)}</div><h3>怎么看这张图</h3>
          ${story.intro || P.storyIntro ? `<p class="pp-text">${fmt(story.intro ?? P.storyIntro)}</p>` : ''}
          <p class="pp-text">点“下一步”（或按键盘 →）逐个大步前进。每一大步的说明页先列出这一步全部小步的说明，通读之后点任一条展开：图上亮起这一小步经过的组件；小步下方按流向排开，从哪个组件出发、经哪根线到哪个组件，每份数据挂在它经过的那段线或那个组件下面，原文 JSON 折叠在字段表下方。也可以直接点图上任意一根线，列出 ${STORIES.length} 个流程里经过它的全部小步。</p>
          <h4>这个流程一共 ${story.steps.length} 步、${total} 个小步</h4><ol class="pp-outline">${story.steps.map((x, i) => `<li><button type="button" data-pano-step="${i}">${esc(x.t)}（${x.subs.length}）</button></li>`).join('')}</ol>`
        return
      }
      panel.innerHTML = `${nav}<div class="pp-kicker">${esc(story.title)} · 第 ${stepIdx + 1} / ${story.steps.length} 步</div><h3>${esc(s.t)}</h3>${stepHtml(s, list)}`
    }
    function render() { hoverSub = 0; renderCards(); renderPanel(); drawWires() }
    function preview(n) {
      if (n === hoverSub || edgeSel || !step()) return
      hoverSub = n
      panel.querySelectorAll('.pp-digest li').forEach((li, i) => li.classList.toggle('hover', i + 1 === n))
      renderCards(); drawWires()
    }
    const digestItem = (ev) => ev.target.closest?.('.pp-digest [data-pano-sub]')
    panel.addEventListener('mouseover', (ev) => { const b = digestItem(ev); if (b) preview(Number(b.dataset.panoSub)) })
    panel.addEventListener('focusin', (ev) => { const b = digestItem(ev); if (b) preview(Number(b.dataset.panoSub)) })
    panel.addEventListener('mouseout', (ev) => { if (digestItem(ev) && !ev.relatedTarget?.closest?.('.pp-digest [data-pano-sub]')) preview(0) })
    panel.addEventListener('focusout', (ev) => { if (digestItem(ev) && !ev.relatedTarget?.closest?.('.pp-digest [data-pano-sub]')) preview(0) })
    function setStep(i, sub = 0) {
      const prev = stepIdx, wasEdge = edgeSel
      edgeSel = null; stepIdx = Math.max(-1, Math.min(story.steps.length - 1, i)); subIdx = stepIdx < 0 ? 0 : sub; render()
      const open = panel.querySelector('.pp-digest li.open')
      if (open) panel.scrollTop += open.getBoundingClientRect().top - panel.getBoundingClientRect().top - 56
      else if (prev !== stepIdx || wasEdge) panel.scrollTop = 0
      if (prev !== stepIdx) reveal()
    }
    function reveal() {
      const lit = $$('.pnode.on,.pnode.hot', canvas).map((el) => el.getBoundingClientRect())
      if (!lit.length) return
      const top = Math.min(...lit.map((r) => r.top)), bottom = Math.max(...lit.map((r) => r.bottom)), room = innerHeight - 70
      if (top >= 60 && bottom <= innerHeight - 10) return
      scrollTo({ top: scrollY + (bottom - top <= room ? top - 60 - (room - (bottom - top)) / 2 : top - 60), behavior: 'instant' })
    }
    function setStory(id) { edgeSel = null; story = STORIES.find((s) => s.id === id) ?? STORIES[0]; stepIdx = -1; subIdx = 0; render() }
    function go(d) {
      if (edgeSel) { edgeSel = null; return render() }
      const s = step()
      if (!s) return d > 0 && setStep(0)
      const i = stepIdx + d
      if (i < story.steps.length) setStep(i)
    }
    root.addEventListener('click', arrMore)
    root.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-pano-story],[data-pano-step],[data-pano-sub],[data-pano-go],[data-pano-edge],[data-pano-edge-close],[data-pano-jump]')
      if (!t) return
      if (t.dataset.panoEdge) { edgeSel = t.dataset.panoEdge; render(); panel.scrollTop = 0; return }
      if (t.dataset.panoEdgeClose) { edgeSel = null; return render() }
      if (t.dataset.panoJump) { const [id, i, k = 0] = t.dataset.panoJump.split(':'); story = STORIES.find((s) => s.id === id) ?? story; return setStep(Number(i), Number(k)) }
      if (t.dataset.panoStory) return setStory(t.dataset.panoStory)
      if (t.dataset.panoStep != null) return setStep(Number(t.dataset.panoStep))
      if (t.dataset.panoSub != null) { const n = Number(t.dataset.panoSub); return setStep(stepIdx, n === subIdx ? 0 : n) }
      if (t.dataset.panoGo) return go(Number(t.dataset.panoGo))
    })
    root.addEventListener('keydown', (ev) => {
      if (ev.target.closest('input,select,textarea')) return
      if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1) }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1) }
    })
    panel.addEventListener('toggle', (ev) => {
      const box = ev.target
      if (!box.open || box.dataset?.edgeSub == null) return
      const body = box.querySelector('.pp-edge-body')
      if (!body.innerHTML) body.innerHTML = edgeSubBody(edgeList[box.dataset.edgeSub])
    }, true)
    new ResizeObserver(() => drawWires()).observe(canvas)
    render()
    document.fonts?.ready.then(drawWires)
    window.__panoJump = (id, node) => {
      story = STORIES.find((s) => s.id === id) ?? story
      $('#intro').scrollIntoView({ behavior: 'instant' })
      setStep(Math.max(stepOf(story, node), 0))
    }
    const stepOf = (st, node) => /^\d+$/.test(node) ? Number(node) : st.steps.findIndex((s) => node.startsWith('title=') ? s.t.includes(node.slice(6)) : s.n.includes(node))
    window.__panoLabel = (id, node) => {
      const st = STORIES.find((s) => s.id === id), i = st ? stepOf(st, node) : -1
      return i >= 0 ? `详细架构流程 · ${st.title} · 第 ${i + 1} 步：${st.steps[i].t}` : id
    }
  }

  function initInspector(COMPONENTS) {
    if (!COMPONENTS?.length) return
    const select = $('#component-select'), peersEl = $('#component-peers'), detail = $('#component-detail'), backBtn = $('#component-back')
    if (!select || !detail) return
    const compById = new Map(COMPONENTS.map((c) => [c.id, c]))
    const back = []
    let selected = COMPONENTS[0].id
    select.innerHTML = COMPONENTS.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')
    function sigHtml(sig) {
      const m = sig.match(/^(.*?)\((.*)\)(.*)$/)
      if (!m) return `<span class="tk-fn">${esc(sig)}</span>`
      const [, head, args, tail] = m, sep = head.includes('::') ? '::' : '.', parts = head.split(sep), fn = parts.pop()
      const path = parts.length ? `<span class="tk-type">${esc(parts.join(sep))}</span><span class="tk-p">${sep}</span>` : ''
      const argHtml = args.split(/(,\s*)/).map((a) => /^,/.test(a) ? `<span class="tk-p">${esc(a)}</span>` : a === '…' ? `<span class="tk-dim">…</span>` : `<span class="tk-arg">${esc(a)}</span>`).join('')
      const ret = tail.replace(/^\s*->\s*/, '').trim()
      return `${path}<span class="tk-fn">${esc(fn)}</span><span class="tk-p">(</span>${argHtml}<span class="tk-p">)</span>${ret ? `<span class="tk-p"> → </span><span class="tk-type">${esc(ret)}</span>` : ''}`
    }
    function compHtml(c) {
      const state = c.state?.length ? `<div class="uml-compartment uml-key"><h4>属性</h4><dl class="uml-fields">${c.state.map(([k, v]) => `<div><dt><code class="uml-attr">${esc(k)}</code></dt><dd>${fmt(v)}</dd></div>`).join('')}</dl></div>` : ''
      const methods = c.methods?.length ? `<div class="uml-compartment uml-key"><h4>方法</h4>${c.methods.map((m) => `<div class="uml-method"><div class="uml-method-heading"><code class="uml-signature">${sigHtml(m.sig)}</code><h5>${esc(m.name)}</h5></div><dl><dt>输入</dt><dd>${fmt(m.in)}</dd><dt>输出</dt><dd>${fmt(m.out)}</dd><dt>加工</dt><dd>${fmt(m.effect)}</dd></dl></div>`).join('')}</div>` : ''
      const rel = c.rel?.length ? `<div class="uml-compartment"><h4>关系</h4><ul class="uml-relations">${c.rel.map(([k, id, text]) => `<li><span>${esc(k)}</span><div><button type="button" data-comp="${id}">${esc(compById.get(id)?.title ?? id)}</button> ${fmt(text)}</div></li>`).join('')}</ul></div>` : ''
      const boundary = c.boundary ? `<div class="uml-compartment"><h4>注意</h4><p class="uml-boundary">${fmt(c.boundary)}</p></div>` : ''
      const src = c.src?.length ? `<div class="uml-compartment"><h4>源码</h4><div class="oc-src" style="padding:4px 8px">${c.src.map(srcLink).join('')}</div></div>` : ''
      return `<div class="uml-class"><div class="uml-header"><div class="uml-kind">«${esc(c.kind)}»</div><h3>${esc(c.title)}</h3><div class="uml-kind">${esc(c.object)}</div><p class="uml-sub">${fmt(c.plain)}</p></div>
        ${state}${methods}${rel || boundary || src ? `<div class="uml-group">其他</div>${rel}${boundary}${src}` : ''}</div>`
    }
    function selectComponent(id, push = true) {
      const c = compById.get(id); if (!c) return
      if (push && id !== selected) back.push(selected)
      selected = id; select.value = id; backBtn.disabled = !back.length
      const peers = COMPONENTS.filter((x) => x.graph === c.graph)
      peersEl.innerHTML = peers.length > 1 ? peers.map((p) => `<button type="button" data-comp="${p.id}" aria-pressed="${p.id === id}">${esc(p.title)}</button>`).join('') : ''
      peersEl.style.display = peers.length > 1 ? '' : 'none'
      detail.innerHTML = compHtml(c)
      $$('#architecture-canvas [data-node-id]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.nodeId === c.graph)))
    }
    const firstOf = (graph) => COMPONENTS.find((c) => c.graph === graph)?.id
    const canvas = $('#architecture-canvas')
    canvas?.addEventListener('click', (ev) => { const n = ev.target.closest('[data-node-id]'); if (n && firstOf(n.dataset.nodeId)) { ev.preventDefault(); selectComponent(firstOf(n.dataset.nodeId)) } })
    canvas?.addEventListener('keydown', (ev) => { const n = ev.target.closest('[data-node-id]'); if (n && (ev.key === 'Enter' || ev.key === ' ') && firstOf(n.dataset.nodeId)) { ev.preventDefault(); selectComponent(firstOf(n.dataset.nodeId)) } })
    select.addEventListener('change', () => selectComponent(select.value))
    backBtn.addEventListener('click', () => { if (back.length) selectComponent(back.pop(), false) })
    $('#component-inspector').addEventListener('click', (ev) => { const b = ev.target.closest('[data-comp]'); if (b) selectComponent(b.dataset.comp) })
    $('#component-count').textContent = `${COMPONENTS.length} 个对象，分属图上 ${new Set(COMPONENTS.map((c) => c.graph)).size} 个方框`
    selectComponent(selected, false)
  }

  function validate(cfg) {
    const errs = []
    const svgIds = (sel) => new Set($$(`${sel} [data-node-id]`).map((el) => el.dataset.nodeId))
    const ovIds = svgIds('#overview-canvas')
    for (const id of Object.keys(cfg.overview?.nodes ?? {})) if (ovIds.size && !ovIds.has(id)) errs.push(`overview node "${id}" is not in the diagram`)
    for (const id of ovIds) if (!cfg.overview?.nodes?.[id]) errs.push(`diagram node "${id}" has no overview caption`)
    const P = cfg.pano
    if (P) {
      const ids = new Set(P.nodes.filter((n) => !n.legend).map((n) => n.id))
      const terms = P.terms ?? {}
      for (const n of P.nodes) {
        if (n.legend) continue
        if (!P.zones?.[n.zone]) errs.push(`pano node "${n.id}": zone "${n.zone}" is undefined`)
        if (!n.job || !n.fact) errs.push(`pano node "${n.id}": job and fact are required`)
        if (!n.terms?.length) errs.push(`pano node "${n.id}": terms are required`)
        for (const t of n.terms ?? []) if (!terms[t]) errs.push(`pano node "${n.id}": term "${t}" is undefined`)
      }
      const used = new Set(P.nodes.flatMap((n) => n.terms ?? []))
      for (const t of Object.keys(terms)) if (!used.has(t)) errs.push(`term "${t}" is used by no pano node`)
      const eids = new Set()
      for (const e of P.edges) {
        if (!ids.has(e.from) || !ids.has(e.to)) errs.push(`edge ${e.from}>${e.to}: unknown node`)
        eids.add(e.id ?? `${e.from}>${e.to}`)
      }
      for (const st of P.stories) {
        st.steps.forEach((s, i) => {
          const at = `story "${st.id}" step ${i + 1}`
          if (!s.text) errs.push(`${at}: text is required`)
          ;(s.subs ?? []).forEach((x, k) => {
            const sub = `${at} sub ${k + 1}`
            if (!x.text) errs.push(`${sub}: text is required`)
            for (const id of x.n ?? []) if (!ids.has(id)) errs.push(`${sub}: unknown node "${id}"`)
            for (const id of x.e ?? []) if (!eids.has(id)) errs.push(`${sub}: unknown edge "${id}"`)
            for (const [, d, at] of x.data ?? []) {
              if (d.k && !(P.kinds ?? {})[d.k]) errs.push(`${sub}: data kind "${d.k}" is undefined`)
              if (at != null && !(x.e ?? []).includes(at) && !(x.n ?? []).includes(at)) errs.push(`${sub}: data "${at}" is neither an edge nor a node of this sub`)
            }
            if (x.tag != null && !(P.subTags ?? {})[x.tag]) errs.push(`${sub}: tag "${x.tag}" is undefined`)
          })
        })
      }
    }
    const cpIds = svgIds('#architecture-canvas')
    for (const c of cfg.components ?? []) {
      if (cpIds.size && !cpIds.has(c.graph)) errs.push(`component "${c.id}": graph node "${c.graph}" is not in the diagram`)
      if (!c.plain || !c.src?.length) errs.push(`component "${c.id}": plain and src are required`)
    }
    for (const id of cpIds) if (cfg.components && !cfg.components.some((c) => c.graph === id)) errs.push(`diagram node "${id}" has no component`)
    for (const m of errs) console.error(`[arch-page] ${m}`)
    return errs
  }

  function init(cfg) {
    REPO = cfg.repo ?? ''
    validate(cfg)
    const P = cfg.pano ?? {}
    MEDIA = P.media ?? {}; KINDS = P.kinds ?? {}; PEEL = P.peel ?? {}; FIELD_DOC = P.fieldDoc ?? {}; DATA_TAG = P.dataTag ?? '录制'
    initPano(cfg.pano)
    initOverview(cfg.overview)
    initInspector(cfg.components)
    const strip = $('#arch-strip')
    if (strip) strip.innerHTML = (cfg.componentNotes ?? []).map(([term, text]) => `<span><b>${esc(term)}</b>${fmt(text)}</span>`).join('')
    fillSrcLinks()
  }

  window.ArchPage = { init, validate, util: { $, $$, esc, fmt, isObj, pre, highlightJson, srcHref, srcText, srcLink, fillSrcLinks, J } }
})()
