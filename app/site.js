/* Artist site: tag map, tile wall, free-canvas works, and the editor. */
var PROV = { human: "human made content", ai: "AI content", mix: "human + AI content" };
var D = null, saved = "", S = { tag: null, mode: "tile", open: null, edit: false, sel: null };
try { var m0 = localStorage.getItem("ab-mode"); if (m0 === "list" || m0 === "tile") S.mode = m0; } catch (e) {}
var side = document.getElementById("side"), wall = document.getElementById("wall"), bar = document.getElementById("editbar");

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function isVid(s) { return /\.(mp4|webm)(\?|$)/i.test(s || "") || /^video:/.test(s || ""); }
function url(s) { return String(s || "").replace(/^video:/, ""); }
function srcOf(s) { var p = url(s); return (typeof PENDING !== "undefined" && PENDING[p]) ? PENDING[p].url : p; }
function mediaTag(s, alt, lazy) {
  if (!s) return "";
  return isVid(s) ? '<video src="' + esc(srcOf(s)) + '" autoplay muted loop playsinline preload="metadata" aria-label="' + esc(alt) + '"></video>'
    : '<img' + (lazy ? ' loading="lazy"' : "") + ' src="' + esc(srcOf(s)) + '" alt="' + esc(alt) + '">';
}
function work(id) { return D.works.filter(function (w) { return w.id === id; })[0]; }
function dirty() { return D && JSON.stringify(D) !== saved; }
function toast(t) { var el = document.getElementById("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2600); }
function allTags() { var c = {}; shown().forEach(function (w) { (w.tags || []).forEach(function (t) { c[t] = (c[t] || 0) + 1; }); }); return c; }

/* tag map */
var G = null;
function buildGraph() {
  var counts = allTags(), nodes = [], idx = {}, links = [];
  Object.keys(counts).forEach(function (t) { idx["t:" + t] = nodes.length; nodes.push({ k: "t:" + t, tag: t, n: counts[t], r: 4 + Math.sqrt(counts[t]) * 3 }); });
  shown().forEach(function (w) { idx["w:" + w.id] = nodes.length; nodes.push({ k: "w:" + w.id, work: w.id, r: 2.6 });
    (w.tags || []).forEach(function (t) { links.push([idx["w:" + w.id], idx["t:" + t]]); }); });
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  nodes.forEach(function (n) { n.x = (rnd() - .5) * 400; n.y = (rnd() - .5) * 200; n.vx = 0; n.vy = 0; });
  for (var it = 0; it < 320; it++) {
    var a = 1 - it / 320;
    for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
      var p = nodes[i], q = nodes[j], dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy + .01, f = (p.tag && q.tag ? 5200 : p.tag || q.tag ? 1400 : 500) / d2 * a, d = Math.sqrt(d2);
      dx /= d; dy /= d; p.vx -= dx * f; p.vy -= dy * f; q.vx += dx * f; q.vy += dy * f; }
    links.forEach(function (l) { var p = nodes[l[0]], q = nodes[l[1]], dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 42) * .04 * a;
      dx /= d; dy /= d; p.vx += dx * f; p.vy += dy * f; q.vx -= dx * f; q.vy -= dy * f; });
    nodes.forEach(function (n) { n.vx -= n.x * .006 * a; n.vy -= n.y * .022 * a; n.x += n.vx; n.y += n.vy; n.vx *= .55; n.vy *= .55; });
  }
  var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  nodes.forEach(function (n) { minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); });
  G = { nodes: nodes, links: links, vb: [minx - 60, miny - 24, maxx - minx + 140, maxy - miny + 48] };
}
function renderGraph() {
  if (!G) buildGraph();
  var on = S.tag, nb = {};
  if (on) G.links.forEach(function (l) { var a = G.nodes[l[0]], b = G.nodes[l[1]]; if (b.tag === on) nb[a.k] = 1; });
  var h = '<svg viewBox="' + G.vb.map(function (v) { return v.toFixed(1); }).join(" ") + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="map of tags and works">';
  G.links.forEach(function (l) { var a = G.nodes[l[0]], b = G.nodes[l[1]]; h += '<line class="g-link' + (on && b.tag === on ? " hl" : "") + '" x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '"/>'; });
  G.nodes.forEach(function (n, i) {
    if (n.work) { var w = work(n.work); if (!w) return;
      h += '<g class="g-work' + (on ? (nb[n.k] ? " hl" : " dim") : "") + '" data-open="' + esc(n.work) + '" data-tip="' + esc(w.title) + '" data-ni="' + i + '"><circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + n.r + '"/></g>'; }
    else h += '<g class="g-tag' + (on === n.tag ? " on" : on ? " dim" : "") + '" data-tag="' + esc(n.tag) + '" data-ni="' + i + '"><circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + n.r.toFixed(1) + '"/><text x="' + (n.x + n.r + 3).toFixed(1) + '" y="' + (n.y + 3.5).toFixed(1) + '">' + esc(n.tag) + "</text></g>";
  });
  return '<div class="graphwrap" id="gw">' + h + '</svg><div class="gtip" id="gtip" hidden></div><div class="gbar"><button type="button" class="chip" data-mode="tile" aria-pressed="' + (S.mode === "tile") + '">tile</button><button type="button" class="chip" data-mode="list" aria-pressed="' + (S.mode === "list") + '">list</button></div></div>';
}
var gNoClick = false;
function wireGraph() {
  var gw = document.getElementById("gw"); if (!gw) return; var svg = gw.querySelector("svg"), tip = document.getElementById("gtip"), drag = null, moved = false;
  function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  svg.addEventListener("pointermove", function (e) {
    var g = e.target.closest("[data-tip]");
    if (g && drag == null) { var r = gw.getBoundingClientRect(); tip.textContent = g.getAttribute("data-tip"); tip.style.left = (e.clientX - r.left + 10) + "px"; tip.style.top = (e.clientY - r.top - 22) + "px"; tip.hidden = false; } else tip.hidden = true;
    if (drag != null) { var p = pt(e), n = G.nodes[drag]; n.x = p.x; n.y = p.y; moved = true;
      var el = svg.querySelector('[data-ni="' + drag + '"]'), c = el.querySelector("circle"); c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
      var t = el.querySelector("text"); if (t) { t.setAttribute("x", p.x + n.r + 3); t.setAttribute("y", p.y + 3.5); }
      var ls = svg.querySelectorAll("line"); G.links.forEach(function (l, li) { if (l[0] === drag) { ls[li].setAttribute("x1", p.x); ls[li].setAttribute("y1", p.y); } if (l[1] === drag) { ls[li].setAttribute("x2", p.x); ls[li].setAttribute("y2", p.y); } }); }
  });
  var downEl = null, sx = 0, sy = 0;
  svg.addEventListener("pointerdown", function (e) { var g = e.target.closest("[data-ni]"); if (!g) return; downEl = g; sx = e.clientX; sy = e.clientY; drag = null; moved = false; e.preventDefault(); });
  svg.addEventListener("pointermove", function (e) { if (downEl && drag == null && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 5) { drag = +downEl.getAttribute("data-ni"); svg.classList.add("drag"); try { svg.setPointerCapture(e.pointerId); } catch (er) {} } });
  svg.addEventListener("pointerup", function () { var g = downEl; downEl = null; svg.classList.remove("drag");
    if (drag != null && moved) { drag = null; return; } drag = null;
    if (!g) return; var tg = g.getAttribute("data-tag"), op = g.getAttribute("data-open");
    if (tg) { S.tag = S.tag === tg ? null : tg; S.open = null; render(); } else if (op) go(op); });
  svg.addEventListener("pointerleave", function () { tip.hidden = true; });
}

/* views */
function shown() { return D.works.filter(function (w) { return S.edit || !w.hidden; }); }
function visible() { return shown().filter(function (w) { return !S.tag || (w.tags || []).indexOf(S.tag) > -1; }); }
function worksTable() {
  var h = '<div class="wtable"><div class="wt-head"><span class="k">all works · ' + D.works.length + ' · ' + D.works.filter(function (w) { return !w.hidden; }).length + ' shown on the site</span><button type="button" class="btn" data-wt="new">+ new work</button></div>';
  D.works.forEach(function (w, i) {
    h += '<div class="wt-row' + (w.hidden ? " off" : "") + '" data-wid="' + esc(w.id) + '">' +
      '<span class="wt-mv"><button type="button" data-wt="up" aria-label="move up"' + (i ? "" : " disabled") + '>↑</button><button type="button" data-wt="down" aria-label="move down"' + (i < D.works.length - 1 ? "" : " disabled") + '>↓</button></span>' +
      '<span class="wt-pic">' + (w.cover && !isVid(w.cover) ? '<img src="' + esc(srcOf(w.cover)) + '" alt="">' : "") + '</span>' +
      '<input class="wt-title" data-wt="title" value="' + esc(w.title) + '" aria-label="title">' +
      '<input class="wt-year" data-wt="years" value="' + esc(w.years) + '" aria-label="year">' +
      '<label class="wt-show"><input type="checkbox" data-wt="show"' + (w.hidden ? "" : " checked") + '> on site</label>' +
      '<button type="button" class="btn" data-open="' + esc(w.id) + '">open</button>' +
      '<button type="button" class="btn danger" data-wt="del">delete</button></div>';
  });
  return h + "</div>";
}
function wireTable() {
  var t = wall.querySelector(".wtable"); if (!t) return;
  t.addEventListener("input", function (e) { var r = e.target.closest("[data-wid]"); if (!r) return; var w = work(r.getAttribute("data-wid")), k = e.target.getAttribute("data-wt");
    if (k === "title" || k === "years") { w[k] = e.target.value; status(); } });
  t.addEventListener("change", function (e) { var r = e.target.closest("[data-wid]"); if (!r || e.target.getAttribute("data-wt") !== "show") return; var w = work(r.getAttribute("data-wid"));
    if (e.target.checked) delete w.hidden; else w.hidden = true; G = null; status(); renderWall(); });
  t.addEventListener("click", function (e) { var b = e.target.closest("button[data-wt]"); if (!b) return; var k = b.getAttribute("data-wt");
    if (k === "new") { document.getElementById("neww").click(); return; }
    var r = b.closest("[data-wid]"), w = work(r.getAttribute("data-wid")), i = D.works.indexOf(w);
    if (k === "up" || k === "down") { var j = k === "up" ? i - 1 : i + 1; if (j < 0 || j >= D.works.length) return; D.works.splice(i, 1); D.works.splice(j, 0, w); status(); renderWall(); }
    if (k === "del") { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "sure?"; return; } D.works.splice(i, 1); G = null; status(); renderWall(); } });
}
function renderAbout() {
  if (S.edit) {
    side.innerHTML = '<div class="form"><label>name<input id="f-name" value="' + esc(D.name) + '"></label><label>bio (blank line = new paragraph)<textarea id="f-bio" style="min-height:16em">' + esc(D.bio.join("\n\n")) + "</textarea></label>" +
      '<p class="hint">Open a work to edit it. Drop images, GIFs or videos onto an open work to add them.</p></div>';
    bind("f-name", function () { D.name = this.value; status(); });
    bind("f-bio", function () { D.bio = this.value.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean); status(); });
    return;
  }
  side.innerHTML = '<h1 class="name"><a href="#">' + esc(D.name) + '</a></h1><div class="bio">' + D.bio.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
}
function renderWall() {
  var list = visible(), h = renderGraph() + (S.edit ? worksTable() : "");
  if (S.tag) h += '<p class="filterline">' + list.length + ' tagged “' + esc(S.tag) + '” · <button type="button" class="linkbtn" data-tag="' + esc(S.tag) + '">show all</button></p>';
  if (S.mode === "list") {
    h += '<div class="rows">'; list.forEach(function (w) { h += '<button type="button" class="rowi" data-open="' + esc(w.id) + '"><span class="y">' + esc(w.years) + '</span><span class="t">' + esc(w.title) + '</span><span class="tg">' + esc((w.tags || []).join(", ")) + "</span></button>"; }); h += "</div>";
  } else {
    h += '<div class="tiles">';
    list.forEach(function (w) { h += '<button type="button" class="tile" data-open="' + esc(w.id) + '"><span class="pic">' + mediaTag(w.cover, w.title, true) + '</span><span class="edge ' + esc(w.prov) + '" title="' + PROV[w.prov] + '"></span><span class="cap"><span class="t">' + esc(w.title) + '</span><span class="y">' + esc(w.years) + "</span></span></button>"; });
    h += "</div>";
  }
  if (!list.length) h += '<p class="empty">no works yet' + (S.edit ? ": use “+ new work” below" : "") + "</p>";
  wall.innerHTML = h; wireGraph(); wireTable();
}

function renderFacts(w) {
  var i = D.works.indexOf(w), prev = D.works[i - 1], next = D.works[i + 1];
  var pager = '<nav class="pager" aria-label="more works">' + (prev ? '<button type="button" data-open="' + esc(prev.id) + '"><small>← previous</small>' + esc(prev.title) + "</button>" : "<span></span>") +
    (next ? '<button type="button" data-open="' + esc(next.id) + '" style="text-align:right"><small>next →</small>' + esc(next.title) + "</button>" : "<span></span>") + "</nav>";
  if (!S.edit) {
    var spec = (w.spec || []).map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("");
    side.innerHTML = '<button type="button" class="back" data-back>← all works</button><div class="facts"><div class="ty"><span class="k">year</span><span class="k">title</span><span>' + esc(w.years) + '</span><h1 class="title">' + esc(w.title) + "</h1></div>" +
      (spec ? '<div><span class="k">details</span><dl class="spec">' + spec + "</dl></div>" : "") +
      '<div><span class="k">provenance</span><span class="prov ' + esc(w.prov) + '">' + PROV[w.prov] + "</span></div>" +
      '<div><span class="k">tags</span><div class="tagline">' + (w.tags || []).map(function (t) { return '<button type="button" class="chip" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div></div>" + pager + "</div>";
    return;
  }
  var layers = w.blocks.slice().sort(function (a, b) { return b.z - a.z; }).map(function (b) {
    var name = b.type === "text" ? "text · " + (b.text || "").slice(0, 26) : b.type + " · " + url(b.src).split("/").pop().slice(0, 22);
    return '<div class="layer' + (S.sel === b.id ? " sel" : "") + '" data-layer="' + esc(b.id) + '"><span>' + esc(name) + '</span><button type="button" data-z="up" data-b="' + esc(b.id) + '" aria-label="bring forward">↑</button><button type="button" data-z="down" data-b="' + esc(b.id) + '" aria-label="send back">↓</button></div>';
  }).join("");
  var sb = selBlock(w);
  var selForm = sb ? '<div class="form" style="border-top:1px solid var(--line);padding-top:10px"><span class="k">selected block</span>' +
    (sb.type === "text" ? '<label>text<textarea id="b-text">' + esc(sb.text) + '</textarea></label><div class="row2"><label>style<select id="b-style">' + ["note", "plain", "label", "panel"].map(function (s) { return "<option" + (sb.style === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + '</select></label><label>text size<input id="b-fs" type="number" step="0.1" min="0.8" max="6" value="' + (sb.fs || 1.5) + '"></label></div>' : "") +
    '<div class="row2"><label>rotate°<input id="b-rot" type="number" step="0.5" value="' + (sb.rot || 0) + '"></label><label>width %<input id="b-w" type="number" step="1" min="5" max="100" value="' + Math.round(sb.w) + '"></label></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (sb.type !== "text" ? '<button type="button" class="btn" id="b-cover">use as cover</button>' : "") + '<button type="button" class="btn danger" id="b-del">delete block</button></div></div>' : '<p class="hint">Click a block to select it. Drag to move, pull the yellow corner to resize.</p>';
  side.innerHTML = '<button type="button" class="back" data-back>← all works</button><div class="form">' +
    '<label>title<input id="f-title" value="' + esc(w.title) + '"></label>' +
    '<div class="row2"><label>year<input id="f-years" value="' + esc(w.years) + '"></label><label>provenance<select id="f-prov">' + Object.keys(PROV).map(function (p) { return '<option value="' + p + '"' + (w.prov === p ? " selected" : "") + ">" + PROV[p] + "</option>"; }).join("") + "</select></label></div>" +
    '<label>tags, comma separated<input id="f-tags" value="' + esc((w.tags || []).join(", ")) + '"></label>' +
    '<label>details, one “key: value” per line<textarea id="f-spec">' + esc((w.spec || []).map(function (r) { return r[0] + ": " + r[1]; }).join("\n")) + "</textarea></label>" +
    '<div><span class="k">cover</span><div style="display:flex;gap:8px;align-items:center">' + (w.cover ? '<span style="width:56px">' + mediaTag(w.cover, "cover", false) + "</span>" : '<span class="hint">none</span>') + '<button type="button" class="btn" id="f-coverup">upload cover (GIF ok)</button></div></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn" id="add-text">+ text</button><button type="button" class="btn" id="add-media">+ image / GIF / video</button><button type="button" class="btn" id="scatter">scatter</button></div>' +
    '<div><span class="k">layers, top first</span><div class="layers">' + (layers || '<span class="hint">no blocks yet</span>') + "</div></div>" + selForm +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:10px"><button type="button" class="btn" id="w-up">move work earlier</button><button type="button" class="btn" id="w-down">later</button><button type="button" class="btn danger" id="w-del">delete work</button></div>' + pager + "</div>";
  wireFacts(w);
}
function selBlock(w) { return w.blocks.filter(function (b) { return b.id === S.sel; })[0]; }
function bind(id, fn, ev) { var el = document.getElementById(id); if (el) el[ev || "oninput"] = fn; }
function wireFacts(w) {
  bind("f-title", function () { w.title = this.value; status(); });
  bind("f-years", function () { w.years = this.value; status(); });
  bind("f-prov", function () { w.prov = this.value; status(); }, "onchange");
  bind("f-tags", function () { w.tags = this.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean); G = null; status(); });
  bind("f-spec", function () { w.spec = this.value.split("\n").map(function (l) { var i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(Boolean); status(); });
  bind("f-coverup", function () { pick(false, function (srcs) { if (srcs[0]) { w.cover = srcs[0]; status(); renderFacts(w); } }); }, "onclick");
  bind("add-text", function () { var b = { id: uid(), type: "text", text: "new text", x: 10, y: canvasBottom() + 2, w: 30, z: topZ(w) + 1, rot: 0, fs: 1.5, style: "note" }; w.blocks.push(b); S.sel = b.id; status(); render(); }, "onclick");
  bind("add-media", function () { pick(true, function (srcs) { addMedia(w, srcs); }); }, "onclick");
  bind("scatter", function () { scatter(w); status(); render(); }, "onclick");
  bind("w-up", function () { moveWork(w, -1); }, "onclick");
  bind("w-down", function () { moveWork(w, 1); }, "onclick");
  bind("w-del", function () { if (this.dataset.sure) { D.works.splice(D.works.indexOf(w), 1); G = null; S.open = null; S.sel = null; status(); render(); } else { this.dataset.sure = 1; this.textContent = "click again to delete"; } }, "onclick");
  var sb = selBlock(w); if (!sb) return;
  bind("b-text", function () { sb.text = this.value; status(); var el = blockEl(sb.id); if (el) { el.textContent = sb.text; el.insertAdjacentHTML("beforeend", '<span class="handle" data-h></span>'); } sizeCanvas(); });
  bind("b-style", function () { sb.style = this.value; status(); refreshBlock(sb); }, "onchange");
  bind("b-fs", function () { sb.fs = +this.value || 1.5; status(); refreshBlock(sb); });
  bind("b-rot", function () { sb.rot = +this.value || 0; status(); refreshBlock(sb); });
  bind("b-w", function () { sb.w = Math.max(5, Math.min(100, +this.value || sb.w)); status(); refreshBlock(sb); });
  bind("b-cover", function () { w.cover = sb.src; status(); toast("cover set"); renderFacts(w); }, "onclick");
  bind("b-del", function () { w.blocks.splice(w.blocks.indexOf(sb), 1); S.sel = null; status(); render(); }, "onclick");
}
function uid() { return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function topZ(w) { return w.blocks.reduce(function (m, b) { return Math.max(m, b.z || 0); }, 0); }
function canvasBottom() { var c = document.getElementById("cv"); return c && c.offsetWidth ? Math.max(0, (c.offsetHeight - 40) / c.offsetWidth * 100) : 0; }
function moveWork(w, d) { var i = D.works.indexOf(w), j = i + d; if (j < 0 || j >= D.works.length) return; D.works.splice(i, 1); D.works.splice(j, 0, w); status(); render(); }
function scatter(w) {
  var cv = document.getElementById("cv"), W = cv ? cv.offsetWidth : 1000, col = [0, 0, 0], r = Math.random;
  w.blocks.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (b) {
    var el = blockEl(b.id), ratio = el && el.offsetWidth ? el.offsetHeight / el.offsetWidth : .75;
    var c = col.indexOf(Math.min.apply(null, col)); b.w = b.type === "text" ? 32 : 28 + r() * 12;
    b.x = +Math.max(0, Math.min(c * 31 + 2 + (r() - .5) * 8, 100 - b.w)).toFixed(2); b.y = +Math.max(0, col[c] + (r() - .7) * 6).toFixed(2); b.rot = +((r() - .5) * 6).toFixed(1);
    col[c] = b.y + b.w * ratio - 4; });
}

function renderCanvas(w) {
  var h = '<div class="canvas' + (S.edit ? " editing" : "") + '" id="cv">';
  w.blocks.forEach(function (b) { h += blockHTML(b, w); });
  h += "</div>";
  if (S.edit) h += '<div class="drop" id="drop">drop images, GIFs or videos here to add them to this work</div>';
  else if (!w.blocks.length) h = '<p class="empty">nothing here yet</p>';
  wall.innerHTML = h; sizeCanvas();
  wall.querySelectorAll("img").forEach(function (im) { im.addEventListener("load", sizeCanvas); });
  wall.querySelectorAll("video").forEach(function (v) { v.addEventListener("loadedmetadata", sizeCanvas); });
  if (S.edit) wireCanvas(w);
}
function blockHTML(b, w) {
  var st = "--x:" + b.x + ";--y:" + b.y + ";--w:" + b.w + ";--r:" + (b.rot || 0) + ";--fs:" + (b.fs || 1.5) + ";z-index:" + (b.z || 1);
  var inner = b.type === "text" ? esc(b.text) : mediaTag(b.type === "video" && !isVid(b.src) ? "video:" + b.src : b.src, w.title, false);
  return '<div class="blk ' + (b.type === "text" ? "text " + esc(b.style || "note") : "media") + (S.edit && S.sel === b.id ? " sel" : "") + '" data-bid="' + esc(b.id) + '" style="' + st + '">' + inner + (S.edit && S.sel === b.id ? '<span class="handle" data-h></span>' : "") + "</div>";
}
function blockEl(id) { return document.querySelector('[data-bid="' + CSS.escape(id) + '"]'); }
function refreshBlock(b) { var el = blockEl(b.id), w = work(S.open); if (!el) return; var t = document.createElement("div"); t.innerHTML = blockHTML(b, w); el.replaceWith(t.firstChild); sizeCanvas(); }
function sizeCanvas() { var c = document.getElementById("cv"); if (!c) return; var m = 0; c.querySelectorAll(".blk").forEach(function (el) { m = Math.max(m, el.offsetTop + el.offsetHeight); }); c.style.height = (m + 40) + "px"; }
window.addEventListener("resize", sizeCanvas);

function wireCanvas(w) {
  var cv = document.getElementById("cv");
  cv.addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".blk");
    if (!el) { if (S.sel) { S.sel = null; refreshAll(w); } return; }
    var b = w.blocks.filter(function (x) { return x.id === el.getAttribute("data-bid"); })[0]; if (!b) return;
    var resize = !!e.target.closest("[data-h]");
    if (S.sel !== b.id) { S.sel = b.id; refreshAll(w); el = blockEl(b.id); cv = document.getElementById("cv"); }
    ACT = { b: b, id: b.id, sx: e.clientX, sy: e.clientY, x: b.x, y: b.y, w: b.w, resize: resize, W: cv.offsetWidth, moved: false };
    e.preventDefault();
  });
  var drop = document.getElementById("drop");
  wall.ondragover = wall.ondragenter = function (e) { e.preventDefault(); drop.classList.add("over"); };
  wall.ondragleave = function (e) { if (e.target === drop) drop.classList.remove("over"); };
  wall.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over"); upload([].slice.call(e.dataTransfer.files), function (s) { addMedia(w, s); }); };
}
var ACT = null;
document.addEventListener("pointermove", function (e) { if (!ACT) return; var el = blockEl(ACT.id); if (!el) return;
  var dx = (e.clientX - ACT.sx) / ACT.W * 100, dy = (e.clientY - ACT.sy) / ACT.W * 100;
  if (Math.abs(dx) + Math.abs(dy) > .2) ACT.moved = true;
  if (ACT.resize) { ACT.b.w = Math.max(5, Math.min(100, +(ACT.w + dx).toFixed(2))); el.style.setProperty("--w", ACT.b.w); }
  else { ACT.b.x = +(ACT.x + dx).toFixed(2); ACT.b.y = Math.max(0, +(ACT.y + dy).toFixed(2)); el.style.setProperty("--x", ACT.b.x); el.style.setProperty("--y", ACT.b.y); } });
document.addEventListener("pointerup", function () { var a = ACT; ACT = null; if (a && a.moved) { status(); sizeCanvas(); var w = work(S.open); if (w) renderFacts(w); } });
function refreshAll(w) { renderCanvas(w); renderFacts(w); }
function addMedia(w, srcs) { var y = canvasBottom(); srcs.forEach(function (s, i) { w.blocks.push({ id: uid(), type: isVid(s) ? "video" : "image", src: s, x: +(4 + (i % 3) * 31 + Math.random() * 4).toFixed(2), y: +(y + Math.floor(i / 3) * 24).toFixed(2), w: 30, z: topZ(w) + 1, rot: +((Math.random() - .5) * 4).toFixed(1) }); }); if (!w.cover && srcs[0]) w.cover = srcs[0]; status(); render(); }

/* uploads: files stay in the browser until "save" commits them to the repo */
var PENDING = {};
function pick(multi, cb) { var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,video/mp4,video/webm"; inp.multiple = multi; inp.onchange = function () { upload([].slice.call(inp.files), cb); }; inp.click(); }
function upload(files, cb) {
  files = files.filter(function (f) { return /^(image|video)\//.test(f.type); }); if (!files.length) return;
  var out = [];
  files.forEach(function (f) {
    if (f.size > 45 * 1024 * 1024) { toast(f.name + " is over 45 MB; compress it first"); return; }
    var ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, ""), path = "img/up/" + uid() + "." + ext;
    PENDING[path] = { file: f, url: URL.createObjectURL(f) };
    out.push(/^video\//.test(f.type) ? "video:" + path : path);
  });
  if (out.length) { cb(out); toast(out.length + " added · press save to upload"); }
}

/* edit bar + save */
var SITE = window.SITE || { slug: "" };
function repoPath(p) { return "a/" + SITE.slug + "/" + p; }
function status() { var s = document.getElementById("st"), b = document.getElementById("save"); if (!s || !b) return; var d = dirty() || Object.keys(PENDING).some(function (k) { return !PENDING[k].done; }); s.textContent = d ? "unsaved changes" : "saved"; b.disabled = !d; }
function renderBar() {
  bar.hidden = false;
  bar.innerHTML = '<button type="button" class="btn' + (S.edit ? " primary" : "") + '" id="toggle">' + (S.edit ? "done editing" : "edit") + "</button>" +
    (S.edit ? '<button type="button" class="btn" id="neww">+ new work</button><button type="button" class="btn primary" id="save">save</button><span class="status" id="st"></span>' : '<a class="hint" href="../../" style="margin-left:auto">all artists</a>');
  document.getElementById("toggle").onclick = function () {
    if (S.edit) { if (dirty() && !confirmLeave()) return; S.edit = false; G = null; S.sel = null; ACT = null; wall.ondragover = wall.ondragenter = wall.ondragleave = wall.ondrop = null; render(); return; }
    GH.ensure().then(function (ok) { if (!ok) return; refresh().then(function () { S.edit = true; G = null; S.sel = null; render(); }); });
  };
  bind("neww", function () { var n = 1; D.works.forEach(function (w) { n = Math.max(n, (parseInt(w.id, 10) || 0) + 1); }); var w = { id: ("0" + n).slice(-2), title: "new work", years: String(new Date().getFullYear()), prov: "human", tags: [], spec: [], cover: "", blocks: [{ id: uid(), type: "text", text: "description", x: 3, y: 3, w: 34, z: 1, rot: 0, fs: 1.5, style: "note" }] }; D.works.unshift(w); G = null; S.open = w.id; S.sel = null; status(); render(); }, "onclick");
  bind("save", save, "onclick");
}
function confirmLeave() { var b = document.getElementById("toggle"); if (b.dataset.sure) return true; b.dataset.sure = 1; b.textContent = "leave without saving?"; return false; }
function usedPaths() { var u = {}; D.works.forEach(function (w) { u[url(w.cover)] = 1; w.blocks.forEach(function (b) { if (b.src) u[url(b.src)] = 1; }); }); return u; }
function save() {
  var b = document.getElementById("save"); b.disabled = true; document.getElementById("st").textContent = "saving…";
  var used = usedPaths(), files = {}, json = JSON.stringify(D, null, 1);
  Object.keys(PENDING).forEach(function (p) { if (!PENDING[p].done && used[p]) files[repoPath(p)] = PENDING[p].file; });
  files[repoPath("data/works.json")] = json;
  GH.commit(files, "edit " + (SITE.slug || "site") + ": " + (S.open && work(S.open) ? work(S.open).title : "works"))
    .then(function () { Object.keys(PENDING).forEach(function (p) { if (used[p]) PENDING[p].done = true; }); saved = JSON.stringify(D); status(); toast("saved · the public site updates in about a minute"); })
    .catch(function (e) { status(); toast(e.status === 401 || e.status === 403 ? "GitHub refused the save: check your token" : "couldn't save: " + (e.message || "try again")); if (e.status === 401) GH.setToken(""); });
}
function refresh() {
  return GH.getText(repoPath("data/works.json")).then(function (t) { var d = JSON.parse(t); if (!dirty()) { D = d; saved = JSON.stringify(d); G = null; } }).catch(function () {});
}

/* main render + events */
function render() {
  if (!D) return; renderBar();
  var w = S.open && work(S.open);
  if (w) { renderFacts(w); renderCanvas(w); } else { S.open = null; renderAbout(); renderWall(); }
  status();
}
function go(id) { S.open = id; S.sel = null; try { history.replaceState(null, "", id ? "#p" + id : location.pathname + location.search); } catch (e) {} render(); window.scrollTo(0, 0); side.scrollTop = 0; }
document.addEventListener("click", function (e) {
  if (e.target.closest("#gw svg")) return;
  var t = e.target.closest("[data-open]"); if (t) { go(t.getAttribute("data-open")); return; }
  if (e.target.closest("[data-back]")) { go(null); return; }
  var c = e.target.closest("[data-tag]"); if (c) { var tg = c.getAttribute("data-tag"); S.tag = S.tag === tg ? null : tg; S.open = null; render(); return; }
  var m = e.target.closest("[data-mode]"); if (m) { S.mode = m.getAttribute("data-mode"); try { localStorage.setItem("ab-mode", S.mode); } catch (er) {} render(); return; }
  var z = e.target.closest("[data-z]"); if (z) { var w = work(S.open), b = w.blocks.filter(function (x) { return x.id === z.getAttribute("data-b"); })[0], up = z.getAttribute("data-z") === "up";
    var order = w.blocks.slice().sort(function (a, c2) { return a.z - c2.z; }), i = order.indexOf(b), j = up ? i + 1 : i - 1; if (j >= 0 && j < order.length) { order.splice(i, 1); order.splice(j, 0, b); } order.forEach(function (x, k) { x.z = k + 1; }); S.sel = b.id; status(); refreshAll(w); return; }
  var ly = e.target.closest("[data-layer]"); if (ly) { S.sel = ly.getAttribute("data-layer"); refreshAll(work(S.open)); return; }
  if (!S.edit) { var med = e.target.closest(".blk img, .blk video"); if (med) openLb(med.getAttribute("src"), med.tagName === "VIDEO"); }
});
var lb = document.getElementById("lb"), lbImg = document.getElementById("lb-img"), lbVid = document.getElementById("lb-vid");
function openLb(s, v) { lbImg.hidden = v; lbVid.hidden = !v; if (v) { lbVid.src = s; lbVid.play && lbVid.play().catch(function () {}); } else lbImg.src = s; lb.hidden = false; document.getElementById("lb-close").focus(); }
function closeLb() { lb.hidden = true; lbVid.pause && lbVid.pause(); }
document.getElementById("lb-close").onclick = closeLb;
lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
document.addEventListener("keydown", function (e) {
  if (!lb.hidden && e.key === "Escape") { closeLb(); return; }
  var tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (S.edit && S.open && S.sel && (e.key === "Delete" || e.key === "Backspace")) { var w = work(S.open), b = selBlock(w); if (b) { w.blocks.splice(w.blocks.indexOf(b), 1); S.sel = null; status(); render(); e.preventDefault(); } }
  if (e.key === "Escape" && S.open && !S.edit) go(null);
});
window.addEventListener("beforeunload", function (e) { if (S.edit && dirty()) { e.preventDefault(); e.returnValue = ""; } });

fetch("data/works.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
  saved = JSON.stringify(d); D = d; document.title = D.name || document.title;
  try { var dr = sessionStorage.getItem("ab-draft"); if (dr) { D = JSON.parse(dr); sessionStorage.removeItem("ab-draft"); } } catch (e) {}
  var h0 = (location.hash || "").slice(1); if (/^p/.test(h0) && work(h0.slice(1))) S.open = h0.slice(1);
  render();
}).catch(function () { side.innerHTML = '<p class="hint">The works list didn\'t load. Reload the page to try again.</p>'; });

