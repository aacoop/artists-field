/* aacoop ++ home: projects / people / about, tag filters, moving circles, and an editor behind "login". */
(function () {
  var L = null, saved = "", edit = false, view = "people", tag = null, PENDING = {};
  var main = document.getElementById("main");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(t) { var el = document.getElementById("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2800); }
  function dirty() { return JSON.stringify(L) !== saved; }
  function isVid(s) { return /\.(mp4|webm)$/i.test(s || ""); }
  function src(s) { return PENDING[s] ? PENDING[s].url : s; }
  function media(s) { if (!s) return ""; return isVid(s) ? '<video src="' + esc(src(s)) + '" autoplay muted loop playsinline></video>' : '<img loading="lazy" src="' + esc(src(s)) + '" alt="">'; }
  function slugify(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40); }
  function safeUrl(u) { u = String(u || "").trim(); if (!u) return ""; if (!/^https?:\/\//i.test(u)) u = "https://" + u; return /^https?:\/\/[^\s"<>]+$/i.test(u) ? u : ""; }
  function href(p) { return p.url ? safeUrl(p.url) : "a/" + encodeURIComponent(p.slug) + "/"; }
  function list(k) { return L[k] = L[k] || []; }

  /* ---------- circles that lean toward the pointer ---------- */
  var orbs = [].slice.call(document.querySelectorAll(".orb")), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    document.getElementById("orbs").addEventListener("pointermove", function (e) {
      orbs.forEach(function (o) { var r = o.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), R = r.width * .9;
        var k = d < R ? (1 - d / R) : 0; o.style.setProperty("--dx", (dx * k * .22).toFixed(1) + "px"); o.style.setProperty("--dy", (dy * k * .22).toFixed(1) + "px"); o.style.setProperty("--s", (1 + k * .06).toFixed(3)); });
    });
    document.getElementById("orbs").addEventListener("pointerleave", function () { orbs.forEach(function (o) { o.style.setProperty("--dx", "0px"); o.style.setProperty("--dy", "0px"); o.style.setProperty("--s", 1); }); });
  }
  function markOrbs() { orbs.forEach(function (o) { o.classList.toggle("on", o.dataset.v === view); }); document.getElementById("login").classList.toggle("in", edit); document.getElementById("login").querySelector("span").textContent = edit ? "logout" : "login"; }

  /* ---------- views ---------- */
  function filters(items) {
    var used = {}; items.forEach(function (p) { (p.tags || []).forEach(function (t) { used[t] = 1; }); });
    var tags = (L.tags || []).concat(Object.keys(used).filter(function (t) { return (L.tags || []).indexOf(t) < 0; }));
    return '<div class="filters" role="group" aria-label="filter by field"><button type="button" data-tag="" aria-pressed="' + !tag + '">all</button>' +
      tags.map(function (t) { return '<button type="button" data-tag="' + esc(t) + '" aria-pressed="' + (tag === t) + '">' + esc(t) + "</button>"; }).join("") + "</div>";
  }
  function cards(items, kind) {
    var shown = items.filter(function (p) { return !tag || (p.tags || []).indexOf(tag) > -1; });
    if (!shown.length) return '<p class="empty">' + (items.length ? "nothing with this tag yet" : "nothing here yet") + "</p>";
    return '<div class="cards">' + shown.map(function (p) {
      var h = kind === "people" ? href(p) : safeUrl(p.url), ext = kind === "people" ? !!p.url : !!h;
      var inner = '<span class="pic">' + media(p.cover) + '</span><span class="t">' + esc(p.name || p.title) + '</span>' + ((p.line || p.sub) ? '<span class="l">' + esc(p.line || p.sub) + "</span>" : "") +
        ((p.tags || []).length ? '<span class="tg">' + p.tags.map(esc).join("<span>·</span>") + "</span>" : "") + (ext && h ? '<span class="ext">' + esc(h.replace(/^https?:\/\//, "").replace(/\/$/, "")) + " ↗</span>" : "");
      return h ? '<a class="card" href="' + esc(h) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + inner + "</a>" : '<div class="card">' + inner + "</div>";
    }).join("") + "</div>";
  }
  function render() {
    markOrbs(); document.querySelector(".logo").innerHTML = esc(L.title || "aacoop ++").replace("++", "<span>++</span>");
    var h = "";
    if (view === "about") h = '<div class="about">' + esc(L.about) + "</div>";
    else { var items = list(view === "people" ? "artists" : "projects"); h = filters(items) + cards(items, view); }
    if (edit) h += editor();
    main.innerHTML = h; status();
  }

  /* ---------- editor ---------- */
  function editor() {
    var h = '<section class="ed" aria-label="edit">';
    if (view === "about") {
      h += '<h2>edit about</h2><label class="fld">title<input data-f="title" value="' + esc(L.title) + '"></label><label class="fld">about text<textarea data-f="about">' + esc(L.about) + '</textarea></label>' +
        '<label class="fld">fields (tags), comma separated, in display order<input data-f="tags" value="' + esc((L.tags || []).join(", ")) + '"></label>';
    } else if (view === "people") {
      h += "<h2>people · " + list("artists").length + "</h2>";
      L.artists.forEach(function (p, i) {
        h += '<div class="row" data-k="artists" data-i="' + i + '">' + (p.cover ? (isVid(p.cover) ? '<video class="thumb" src="' + esc(src(p.cover)) + '" muted></video>' : '<img class="thumb" src="' + esc(src(p.cover)) + '" alt="">') : '<span class="thumb"></span>') +
          '<div class="stack"><label class="fld">name<input data-p="name" value="' + esc(p.name) + '"></label><label class="fld">one line<input data-p="line" value="' + esc(p.line) + '"></label></div>' +
          '<div class="stack"><label class="fld">fields, comma separated<input data-p="tags" value="' + esc((p.tags || []).join(", ")) + '"></label>' +
          (p.url != null && !p.slug ? '<label class="fld">their own site (link)<input data-p="url" value="' + esc(p.url) + '" placeholder="https://"></label>' : '<span class="fld">site here: <a href="a/' + esc(p.slug) + '/">a/' + esc(p.slug) + "/</a></span>") + "</div>" +
          '<div class="btns"><button type="button" class="btn" data-a="cover">cover</button><button type="button" class="btn" data-a="up" aria-label="move up">↑</button><button type="button" class="btn" data-a="down" aria-label="move down">↓</button><button type="button" class="btn danger" data-a="del">remove</button></div></div>';
      });
      h += '<h2>add a person</h2><div class="row" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto"><label class="fld">name<input id="n-name" placeholder="first last"></label>' +
        '<label class="fld">link to their own site (leave empty to make a site here)<input id="n-url" placeholder="https://"></label><div class="btns" style="align-self:end"><button type="button" class="btn" id="n-add">+ add</button></div></div>' +
        '<p class="muted" style="font-size:12px;margin:0">With a link, the card leads to their site. Without one, they get a page in a/&lt;name&gt;/ with the same editor as yours.</p>';
    } else {
      h += "<h2>projects · " + list("projects").length + "</h2>";
      L.projects.forEach(function (p, i) {
        h += '<div class="row" data-k="projects" data-i="' + i + '">' + (p.cover ? (isVid(p.cover) ? '<video class="thumb" src="' + esc(src(p.cover)) + '" muted></video>' : '<img class="thumb" src="' + esc(src(p.cover)) + '" alt="">') : '<span class="thumb"></span>') +
          '<div class="stack"><label class="fld">title<input data-p="title" value="' + esc(p.title) + '"></label><label class="fld">subtitle<input data-p="sub" value="' + esc(p.sub) + '"></label></div>' +
          '<div class="stack"><label class="fld">tags, comma separated<input data-p="tags" value="' + esc((p.tags || []).join(", ")) + '"></label><label class="fld">link (optional)<input data-p="url" value="' + esc(p.url) + '" placeholder="https://"></label></div>' +
          '<div class="btns"><button type="button" class="btn" data-a="cover">cover</button><button type="button" class="btn" data-a="up" aria-label="move up">↑</button><button type="button" class="btn" data-a="down" aria-label="move down">↓</button><button type="button" class="btn danger" data-a="del">remove</button></div></div>';
      });
      h += '<div class="btns"><button type="button" class="btn" id="p-add">+ add project</button></div>';
    }
    return h + '<div class="savebar"><button type="button" class="btn primary" id="save">save</button><span class="st" id="st"></span></div></section>';
  }
  function status() { var s = document.getElementById("st"), b = document.getElementById("save"); if (!s) return; var d = dirty() || Object.keys(PENDING).some(function (k) { return !PENDING[k].done; }); s.textContent = d ? "unsaved changes" : "saved"; b.disabled = !d; }
  function csv(v) { return v.split(",").map(function (s) { return s.trim(); }).filter(Boolean); }

  main.addEventListener("input", function (e) {
    var f = e.target.dataset.f; if (f) { L[f] = f === "tags" ? csv(e.target.value) : e.target.value; status(); return; }
    var r = e.target.closest("[data-i]"), p = e.target.dataset.p; if (!r || !p) return;
    var item = L[r.dataset.k][+r.dataset.i]; item[p] = p === "tags" ? csv(e.target.value) : e.target.value; status();
  });
  main.addEventListener("click", function (e) {
    var tb = e.target.closest("[data-tag]"); if (tb) { tag = tb.dataset.tag || null; render(); return; }
    if (e.target.id === "save") return save();
    if (e.target.id === "p-add") { list("projects").unshift({ title: "new project", sub: "", tags: [], url: "", cover: "" }); render(); return; }
    if (e.target.id === "n-add") return addPerson();
    var b = e.target.closest("button[data-a]"); if (!b) return;
    var r = b.closest("[data-i]"), arr = L[r.dataset.k], i = +r.dataset.i, item = arr[i], k = b.dataset.a;
    if (k === "up" || k === "down") { var j = k === "up" ? i - 1 : i + 1; if (j < 0 || j >= arr.length) return; arr.splice(i, 1); arr.splice(j, 0, item); render(); }
    if (k === "del") { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = item.slug ? "sure? (their site folder stays)" : "sure?"; return; } arr.splice(i, 1); render(); }
    if (k === "cover") { var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,video/mp4,video/webm"; inp.onchange = function () { var f = inp.files[0]; if (!f) return;
      if (f.size > 45 * 1024 * 1024) { toast("over 45 MB; compress it first"); return; }
      var p = "img/covers/" + Date.now().toString(36) + "." + (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, ""); PENDING[p] = { file: f, url: URL.createObjectURL(f) }; item.cover = p; render(); }; inp.click(); }
  });

  function addPerson() {
    var name = document.getElementById("n-name").value.trim(), url = document.getElementById("n-url").value.trim();
    if (!name) { toast("write a name"); return; }
    if (url) { if (!safeUrl(url)) { toast("that link doesn't look right"); return; } list("artists").push({ name: name, line: "", url: safeUrl(url), tags: [], cover: "" }); render(); toast("added · press save"); return; }
    var slug = slugify(name); if (!slug) { toast("use latin letters for the name, or give a link"); return; }
    if (L.artists.some(function (a) { return a.slug === slug; })) { toast("a site called " + slug + " already exists"); return; }
    var btn = document.getElementById("n-add"); btn.disabled = true; btn.textContent = "creating…";
    fetch("app/artist-page.html", { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (tpl) {
      L.artists.push({ slug: slug, name: name, line: "", tags: [], cover: "" });
      var files = {}; files["a/" + slug + "/index.html"] = tpl.replace("__NAME__", esc(name)).replace("__SLUG__", slug);
      files["a/" + slug + "/data/works.json"] = JSON.stringify({ v: 1, name: name, bio: ["Write a few lines about yourself."], works: [] }, null, 1);
      files["artists.json"] = JSON.stringify(L, null, 1);
      return GH.commit(files, "add " + slug).then(function () { saved = JSON.stringify(L); toast(name + " added · their page goes live in about a minute"); render(); });
    }).catch(function (e) { L.artists = L.artists.filter(function (a) { return a.slug !== slug; }); btn.disabled = false; btn.textContent = "+ add"; toast("couldn't add: " + (e.message || "try again")); });
  }
  function save() {
    var b = document.getElementById("save"); b.disabled = true; document.getElementById("st").textContent = "saving…";
    var files = { "artists.json": JSON.stringify(L, null, 1) };
    list("artists").concat(list("projects")).forEach(function (p) { if (PENDING[p.cover] && !PENDING[p.cover].done) files[p.cover] = PENDING[p.cover].file; });
    GH.commit(files, "edit home").then(function () { Object.keys(files).forEach(function (p) { if (PENDING[p]) PENDING[p].done = true; }); saved = JSON.stringify(L); status(); toast("saved · the public page updates in about a minute"); })
      .catch(function (e) { status(); toast("couldn't save: " + (e.message || "try again")); });
  }

  document.getElementById("login").onclick = function () {
    if (edit) { edit = false; GH.setToken(""); render(); toast("logged out on this browser"); return; }
    GH.ensure().then(function (ok) { if (!ok) return; GH.getText("artists.json").then(function (t) { if (!dirty()) { L = JSON.parse(t); saved = JSON.stringify(L); } }).catch(function () {}).then(function () { edit = true; render(); }); });
  };
  function route() { var v = (location.hash || "").slice(1); view = ["projects", "people", "about"].indexOf(v) > -1 ? v : "people"; tag = null; if (L) render(); }
  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", function (e) { if (edit && dirty()) { e.preventDefault(); e.returnValue = ""; } });
  route();
  fetch("artists.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { L = d; list("artists"); list("projects"); saved = JSON.stringify(L); document.title = L.title || document.title; render(); })
    .catch(function () { main.innerHTML = '<p class="empty">The list didn\'t load. Reload the page to try again.</p>'; });
})();
