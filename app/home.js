/* PLUG home: people / projects / about, tag ball pit, strict card grid, editor behind "login". */
(function () {
  var L = null, saved = "", edit = false, view = "projects", tag = null, PENDING = {}, pit = null, WORKS = [];
  var main = document.getElementById("main");
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(t) { var el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2800); }
  function dirty() { return JSON.stringify(L) !== saved; }
  function isVid(s) { return /\.(mp4|webm)$/i.test(s || ""); }
  function src(s) { return PENDING[s] ? PENDING[s].url : s; }
  function slugify(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40); }
  function safeUrl(u) { u = String(u || "").trim(); if (!u) return ""; if (!/^https?:\/\//i.test(u)) u = "https://" + u; return /^https?:\/\/[^\s"<>]+$/i.test(u) ? u : ""; }
  function host(u) { return u.replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, ""); }
  function list(k) { return L[k] = L[k] || []; }
  function csv(v) { return v.split(",").map(function (s) { return s.trim(); }).filter(Boolean); }
  function allTags() { var c = {}; (L.tags || []).forEach(function (x) { c[x] = c[x] || 1; });
    list("artists").concat(list("projects"), WORKS).forEach(function (p) { (p.tags || []).forEach(function (x) { c[x] = (c[x] || 0) + 1; }); });
    return Object.keys(c).map(function (t) { return { t: t, n: c[t] }; }); }
  /* works artists marked "on PLUG home" or "in shop" on their own sites */
  function loadWorks() {
    var people = list("artists").filter(function (a) { return a.slug && !a.url; });
    return Promise.all(people.map(function (a) {
      return fetch("a/" + encodeURIComponent(a.slug) + "/data/works.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d) return [];
        return (d.works || []).filter(function (w) { return !w.hidden && (w.home || (w.shop && w.shop.on)); }).map(function (w) {
          var base = "a/" + a.slug + "/", cov = String(w.cover || "").replace(/^video:/, "");
          return { title: w.title, sub: a.name + (w.years ? " · " + w.years : ""), tags: w.tags || [], cover: cov ? (/^(https?:)?\/\//.test(cov) ? cov : base + cov) : "", href: base + "#p" + encodeURIComponent(w.id), home: !!w.home, shop: w.shop && w.shop.on ? w.shop : null, by: a.name };
        });
      }).catch(function () { return []; });
    })).then(function (all) { WORKS = [].concat.apply([], all); });
  }

  /* ---------- views ---------- */
  function card(p, i, kind) {
    var internal = (kind === "people" && p.slug && !p.url) || !!p.href, href = p.href ? p.href : internal ? "a/" + encodeURIComponent(p.slug) + "/" : safeUrl(p.url), name = p.name || p.title || "";
    var pic = p.cover ? (isVid(p.cover) ? '<video src="' + esc(src(p.cover)) + '" autoplay muted loop playsinline></video>' : '<img loading="lazy" src="' + esc(src(p.cover)) + '" alt="" onerror="this.outerHTML=\'<span class=ball>\' + this.dataset.i + \'</span>\'" data-i="' + esc(name.trim().charAt(0).toUpperCase() || "+") + '">') : "";
    var meta = '<span>[' + String(i + 1).padStart(2, "0") + "]</span><span>" + esc(kind === "people" ? (p.kind || "person") + (internal ? " · on plug" : "") : kind === "shop" ? (p.shop && p.shop.price ? p.shop.price : "available") : p.by ? "work" : "project") + "</span>";
    var extra = (p.links || []).filter(function (l) { return safeUrl(l.url); }).map(function (l) { return '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label || host(l.url)) + " ↗</a>"; }).join("");
    var inner = '<span class="meta">' + meta + '</span><span class="pic">' + (pic || '<span class="ball">' + esc(name.trim().charAt(0).toUpperCase() || "+") + "</span>") + "</span>" +
      '<span><span class="t">' + esc(name) + "</span>" + ((p.line || p.sub) ? '<span class="l" style="display:block">' + esc(p.line || p.sub) + "</span>" : "") + "</span>" +
      '<span style="display:grid;gap:8px">' + ((p.tags || []).length ? '<span class="tg">' + p.tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</span>" : "") +
      (kind === "shop" ? '<span class="go">' + esc([p.shop.edition, p.shop.price].filter(Boolean).join(" · ") || "available") + "</span>" + (safeUrl(p.shop.url) ? '<a class="buy" href="' + esc(safeUrl(p.shop.url)) + '" target="_blank" rel="noopener">buy / ask ↗</a>' : '<span class="go">payments soon</span>') : href ? '<span class="go">' + (internal ? "open →" : esc(host(href)) + " ↗") + "</span>" : "") + "</span>";
    if (!href) return '<div class="card">' + inner + (extra ? '<span class="extra">' + extra + "</span>" : "") + "</div>";
    return '<div class="card" style="position:relative">' + inner.replace('<span class="t">', '<a class="t" style="text-decoration:none" href="' + esc(href) + '"' + (internal ? "" : ' target="_blank" rel="noopener"') + '><span style="position:absolute;inset:0" aria-hidden="true"></span>').replace(esc(name) + "</span>", esc(name) + "</a>") +
      (extra ? '<span class="extra" style="position:relative;z-index:1">' + extra + "</span>" : "") + "</div>";
  }
  function render() {
    document.title = L.title || "PLUG";
    $("b-title").textContent = L.title || "PLUG"; $("b-by").textContent = L.by || ""; $("eyebrow").textContent = L.eyebrow || ""; $("hl1").textContent = L.headline || ""; $("hl2").textContent = L.headline2 || "";
    document.querySelectorAll(".tabs a").forEach(function (a) { if (a.dataset.v === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    $("login").textContent = edit ? "logout" : "login"; $("login").classList.toggle("in", edit);
    var h = "";
    if (view === "about") { h = '<div class="about">' + esc(L.about) + "</div>"; $("filterline").innerHTML = ""; }
    else {
      var items = view === "people" ? list("artists") : view === "shop" ? WORKS.filter(function (w) { return w.shop; }) : list("projects").concat(WORKS.filter(function (w) { return w.home; })), shown = items.filter(function (p) { return !tag || (p.tags || []).indexOf(tag) > -1; });
      $("filterline").innerHTML = "<span>" + ({ people: "people & collectives", projects: "projects", shop: "shop · editions, objects, clothes" })[view] + "</span><span>showing <b>" + shown.length + "</b> of " + items.length + "</span>" +
        (tag ? "<span>tag: <b>" + esc(tag) + '</b></span><button type="button" id="clear">clear</button>' : "<span>no tag filter</span>");
      h = shown.length ? '<div class="grid">' + shown.map(function (p) { return card(p, items.indexOf(p), view); }).join("") + "</div>" : '<p class="empty">' + (items.length ? "nothing with this tag here" : view === "shop" ? "the shop is empty for now. Artists add works here with “in shop” in their own editor." : "nothing here yet") + "</p>";
    }
    if (edit) h += editor();
    main.innerHTML = h; status();
    $("foot").innerHTML = "<span>" + esc(L.title) + " / " + esc(L.by || "") + "</span><span>" + list("artists").length + " people & collectives · " + (list("projects").length + WORKS.filter(function (w) { return w.home; }).length) + " projects · " + WORKS.filter(function (w) { return w.shop; }).length + " in shop</span>";
    var cl = $("clear"); if (cl) cl.onclick = function () { setTag(null); };
  }
  function setTag(t) { tag = tag === t ? null : t; if (pit) pit.setActive(tag); if (view === "about") { view = "projects"; history.replaceState(null, "", "#projects"); } render(); }

  /* ---------- editor ---------- */
  function thumb(p) { return p.cover ? (isVid(p.cover) ? '<video class="thumb" src="' + esc(src(p.cover)) + '" muted></video>' : '<img class="thumb" src="' + esc(src(p.cover)) + '" alt="" onerror="this.style.visibility=\'hidden\'">') : '<span class="thumb"></span>'; }
  function rowBtns() { return '<div class="btns"><button type="button" class="btn" data-a="cover">cover</button><button type="button" class="btn" data-a="up" aria-label="move up">↑</button><button type="button" class="btn" data-a="down" aria-label="move down">↓</button><button type="button" class="btn danger" data-a="del">remove</button></div>'; }
  function editor() {
    var h = '<section class="ed" aria-label="edit">';
    if (view === "about") {
      h += "<h2>edit the index</h2>" + [["title", "title"], ["by", "by"], ["eyebrow", "small line above the headline"], ["headline", "headline"], ["headline2", "headline, italic part"]].map(function (f) { return '<label class="fld">' + f[1] + '<input data-f="' + f[0] + '" value="' + esc(L[f[0]]) + '"></label>'; }).join("") +
        '<label class="fld">about text<textarea data-f="about">' + esc(L.about) + '</textarea></label><label class="fld">tags in the pit, comma separated (tags used on cards are added too)<input data-f="tags" value="' + esc((L.tags || []).join(", ")) + '"></label>';
    } else if (view === "people") {
      h += "<h2>people & collectives · " + list("artists").length + "</h2>";
      L.artists.forEach(function (p, i) {
        h += '<div class="row" data-k="artists" data-i="' + i + '">' + thumb(p) +
          '<div class="stack"><label class="fld">name<input data-p="name" value="' + esc(p.name) + '"></label><label class="fld">one line<input data-p="line" value="' + esc(p.line) + '"></label>' +
          '<label class="fld">kind<select data-p="kind">' + ["person", "collective"].map(function (k) { return "<option" + ((p.kind || "person") === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></label></div>" +
          '<div class="stack"><label class="fld">tags, comma separated<input data-p="tags" value="' + esc((p.tags || []).join(", ")) + '"></label>' +
          (p.slug && !p.url ? '<span class="fld">site on plug: <a href="a/' + esc(p.slug) + '/">a/' + esc(p.slug) + "/</a></span>" : '<label class="fld">link to their site<input data-p="url" value="' + esc(p.url) + '" placeholder="https://"></label>') +
          '<label class="fld">more links: “label url” per line<textarea data-p="links" style="min-height:3.5em">' + esc((p.links || []).map(function (l) { return (l.label || "") + " " + l.url; }).join("\n")) + "</textarea></label></div>" + rowBtns() + "</div>";
      });
      h += '<h2>add someone</h2><div class="row" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto"><label class="fld">name<input id="n-name" placeholder="name or collective"></label>' +
        '<label class="fld">link to their own site (empty = make a site here on plug)<input id="n-url" placeholder="https://"></label><div class="btns" style="align-self:end"><button type="button" class="btn" id="n-add">+ add</button></div></div>';
    } else if (view === "shop") {
      h += "<h2>shop</h2><p class=\"muted\" style=\"margin:0;font-size:13px\">Artists put works here themselves: in their own site’s editor, open a work and tick “in shop”, then set price, edition and a buy link. Payments come later.</p>";
    } else {
      h += "<h2>collective projects · " + list("projects").length + "</h2>";
      L.projects.forEach(function (p, i) {
        h += '<div class="row" data-k="projects" data-i="' + i + '">' + thumb(p) +
          '<div class="stack"><label class="fld">title<input data-p="title" value="' + esc(p.title) + '"></label><label class="fld">subtitle<input data-p="sub" value="' + esc(p.sub) + '"></label></div>' +
          '<div class="stack"><label class="fld">tags, comma separated<input data-p="tags" value="' + esc((p.tags || []).join(", ")) + '"></label><label class="fld">link<input data-p="url" value="' + esc(p.url) + '" placeholder="https://"></label></div>' + rowBtns() + "</div>";
      });
      h += '<div class="btns"><button type="button" class="btn" id="p-add">+ add project</button></div>';
    }
    return h + '<div class="savebar"><button type="button" class="btn primary" id="save">save</button><span class="st" id="st"></span></div></section>';
  }
  function status() { var s = $("st"), b = $("save"); if (!s) return; var d = dirty() || Object.keys(PENDING).some(function (k) { return !PENDING[k].done; }); s.textContent = d ? "unsaved changes" : "saved"; b.disabled = !d; }
  function retag() { if (pit) pit.setTags(allTags()); }

  main.addEventListener("input", function (e) {
    var f = e.target.dataset.f; if (f) { L[f] = f === "tags" ? csv(e.target.value) : e.target.value; status(); if (f === "tags") retag(); else if (f !== "about") render(); return; }
    var r = e.target.closest("[data-i]"), p = e.target.dataset.p; if (!r || !p) return;
    var item = L[r.dataset.k][+r.dataset.i];
    if (p === "tags") item.tags = csv(e.target.value);
    else if (p === "links") item.links = e.target.value.split("\n").map(function (l) { var m = l.trim().match(/^(.*?)\s*(\S+)$/); return m && safeUrl(m[2]) ? { label: m[1].trim(), url: safeUrl(m[2]) } : null; }).filter(Boolean);
    else item[p] = e.target.value;
    status();
  });
  main.addEventListener("change", function (e) { if (e.target.dataset.p === "tags" || e.target.dataset.p === "kind") { retag(); var y = scrollY; render(); scrollTo(0, y); } });
  main.addEventListener("click", function (e) {
    if (e.target.id === "save") return save();
    if (e.target.id === "p-add") { list("projects").unshift({ title: "new project", sub: "", tags: [], url: "", cover: "" }); render(); return; }
    if (e.target.id === "n-add") return addPerson();
    var b = e.target.closest("button[data-a]"); if (!b) return;
    var r = b.closest("[data-i]"), arr = L[r.dataset.k], i = +r.dataset.i, item = arr[i], k = b.dataset.a;
    if (k === "up" || k === "down") { var j = k === "up" ? i - 1 : i + 1; if (j < 0 || j >= arr.length) return; arr.splice(i, 1); arr.splice(j, 0, item); render(); }
    if (k === "del") { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = item.slug ? "sure? (their site folder stays)" : "sure?"; return; } arr.splice(i, 1); retag(); render(); }
    if (k === "cover") { var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,video/mp4,video/webm"; inp.onchange = function () { var f = inp.files[0]; if (!f) return;
      if (f.size > 45 * 1024 * 1024) { toast("over 45 MB; compress it first"); return; }
      var p = "img/covers/" + Date.now().toString(36) + "." + (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, ""); PENDING[p] = { file: f, url: URL.createObjectURL(f) }; item.cover = p; render(); }; inp.click(); }
  });
  function addPerson() {
    var name = $("n-name").value.trim(), url = $("n-url").value.trim();
    if (!name) { toast("write a name"); return; }
    if (url) { if (!safeUrl(url)) { toast("that link doesn't look right"); return; } list("artists").push({ name: name, kind: "person", line: "", url: safeUrl(url), tags: [], cover: "" }); render(); toast("added · press save"); return; }
    var slug = slugify(name); if (!slug) { toast("use latin letters for the name, or give a link"); return; }
    if (L.artists.some(function (a) { return a.slug === slug; })) { toast("a site called " + slug + " already exists"); return; }
    var btn = $("n-add"); btn.disabled = true; btn.textContent = "creating…";
    fetch("app/artist-page.html", { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (tpl) {
      L.artists.push({ slug: slug, name: name, kind: "person", line: "", tags: [], cover: "" });
      var files = {}; files["a/" + slug + "/index.html"] = tpl.replace("__NAME__", esc(name)).replace("__SLUG__", slug);
      files["a/" + slug + "/data/works.json"] = JSON.stringify({ v: 1, name: name, bio: ["Write a few lines about yourself."], works: [] }, null, 1);
      files["artists.json"] = JSON.stringify(L, null, 1);
      return GH.commit(files, "add " + slug).then(function () { saved = JSON.stringify(L); toast(name + " added · their page goes live in about a minute"); render(); });
    }).catch(function (e) { L.artists = L.artists.filter(function (a) { return a.slug !== slug; }); btn.disabled = false; btn.textContent = "+ add"; toast("couldn't add: " + (e.message || "try again")); });
  }
  function save() {
    var b = $("save"); b.disabled = true; $("st").textContent = "saving…";
    var files = { "artists.json": JSON.stringify(L, null, 1) };
    list("artists").concat(list("projects")).forEach(function (p) { if (PENDING[p.cover] && !PENDING[p.cover].done) files[p.cover] = PENDING[p.cover].file; });
    GH.commit(files, "edit plug").then(function () { Object.keys(files).forEach(function (p) { if (PENDING[p]) PENDING[p].done = true; }); saved = JSON.stringify(L); status(); toast("saved · the public page updates in about a minute"); })
      .catch(function (e) { status(); toast("couldn't save: " + (e.message || "try again")); });
  }

  $("login").onclick = function () {
    if (edit) { if (dirty() && !this.dataset.sure) { this.dataset.sure = 1; this.textContent = "unsaved · logout?"; return; } delete this.dataset.sure; edit = false; GH.setToken(""); render(); toast("logged out on this browser"); return; }
    GH.ensure().then(function (ok) { if (!ok) return; GH.getText("artists.json").then(function (t) { if (!dirty()) { L = JSON.parse(t); saved = JSON.stringify(L); retag(); } }).catch(function () {}).then(function () { edit = true; render(); }); });
  };
  function route() { var v = (location.hash || "").slice(1); view = ["projects", "people", "shop", "about"].indexOf(v) > -1 ? v : "projects"; if (L) render(); }
  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", function (e) { if (edit && dirty()) { e.preventDefault(); e.returnValue = ""; } });
  route();
  fetch("artists.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
    L = d; list("artists"); list("projects"); saved = JSON.stringify(L); render();
    pit = window.Pit.start($("pit"), $("balls"), $("pills"), allTags(), setTag);
    loadWorks().then(function () { render(); retag(); });
  }).catch(function () { main.innerHTML = '<p class="empty">The index didn\'t load. Reload the page to try again.</p>'; });
})();
