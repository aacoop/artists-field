/* The shared list of artists (artists.json). Edit mode adds artists: each gets a folder a/<slug>/ with its own site. */
(function () {
  var L = null, saved = "", edit = false, PENDING = {};
  var side = document.getElementById("side"), wall = document.getElementById("wall"), bar = document.getElementById("editbar");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(t) { var el = document.getElementById("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2800); }
  function dirty() { return JSON.stringify(L) !== saved; }
  function isVid(s) { return /\.(mp4|webm)$/i.test(s || ""); }
  function src(s) { return PENDING[s] ? PENDING[s].url : s; }
  function cover(a) { if (!a.cover) return ""; return isVid(a.cover) ? '<video src="' + esc(src(a.cover)) + '" autoplay muted loop playsinline></video>' : '<img loading="lazy" src="' + esc(src(a.cover)) + '" alt="">'; }
  function slugify(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40); }

  function render() {
    if (edit) {
      side.innerHTML = '<div class="form"><label>title<input id="l-title" value="' + esc(L.title) + '"></label><label>about<textarea id="l-about">' + esc(L.about) + '</textarea></label>' +
        '<div style="border-top:1px solid var(--line);padding-top:10px" class="form"><span class="k">add an artist</span><label>name<input id="n-name" placeholder="first last"></label><label>folder name (letters, digits, dashes)<input id="n-slug" placeholder="lastname"></label><button type="button" class="btn" id="n-add">+ add artist</button>' +
        '<p class="hint">This makes a folder with an empty site for them. They open it, press edit, sign in with their own GitHub token and fill it in.</p></div></div>';
      document.getElementById("l-title").oninput = function () { L.title = this.value; status(); };
      document.getElementById("l-about").oninput = function () { L.about = this.value; status(); };
      var nn = document.getElementById("n-name"), ns = document.getElementById("n-slug");
      nn.oninput = function () { if (!ns.dataset.touched) ns.value = slugify(nn.value.split(" ").pop() || nn.value); };
      ns.oninput = function () { ns.dataset.touched = 1; };
      document.getElementById("n-add").onclick = function () { addArtist(nn.value.trim(), slugify(ns.value)); };
    } else {
      side.innerHTML = '<h1 class="name">' + esc(L.title) + '</h1><div class="bio"><p>' + esc(L.about) + '</p></div><p class="hint">' + L.artists.length + ' artist' + (L.artists.length === 1 ? "" : "s") + '</p>';
    }
    var h = '<div class="tiles">';
    L.artists.forEach(function (a, i) {
      if (edit) {
        h += '<div class="tile" style="cursor:default" data-i="' + i + '"><span class="pic">' + cover(a) + '</span><span class="edge"></span><span class="cap form" style="gap:6px">' +
          '<input data-k="name" value="' + esc(a.name) + '" aria-label="name"><input data-k="line" value="' + esc(a.line) + '" aria-label="one line" placeholder="one line about the work">' +
          '<span style="display:flex;gap:4px;flex-wrap:wrap"><button type="button" class="btn" data-a="cover">cover</button><button type="button" class="btn" data-a="up">↑</button><button type="button" class="btn" data-a="down">↓</button><a class="btn" href="a/' + esc(a.slug) + '/">open site</a><button type="button" class="btn danger" data-a="del">remove from list</button></span></span></div>';
      } else {
        h += '<a class="tile" href="a/' + esc(a.slug) + '/" style="text-decoration:none"><span class="pic">' + cover(a) + '</span><span class="edge"></span><span class="cap"><span class="t">' + esc(a.name) + '</span><span class="y">' + esc(a.line) + '</span></span></a>';
      }
    });
    wall.innerHTML = h + "</div>" + (L.artists.length ? "" : '<p class="empty">no artists yet</p>');
    renderBar();
  }
  function status() { var s = document.getElementById("st"), b = document.getElementById("save"); if (!s) return; var d = dirty(); s.textContent = d ? "unsaved changes" : "saved"; b.disabled = !d; }
  function renderBar() {
    bar.innerHTML = '<button type="button" class="btn' + (edit ? " primary" : "") + '" id="toggle">' + (edit ? "done editing" : "edit list") + "</button>" + (edit ? '<button type="button" class="btn primary" id="save">save</button><span class="status" id="st"></span>' : "");
    document.getElementById("toggle").onclick = function () {
      if (edit) { edit = false; render(); return; }
      GH.ensure().then(function (ok) { if (!ok) return; GH.getText("artists.json").then(function (t) { if (!dirty()) { L = JSON.parse(t); saved = JSON.stringify(L); } }).catch(function () {}).then(function () { edit = true; render(); }); });
    };
    var sv = document.getElementById("save"); if (sv) sv.onclick = save;
    status();
  }
  wall.addEventListener("input", function (e) { var t = e.target.closest("[data-i]"); if (!t || !e.target.dataset.k) return; L.artists[+t.dataset.i][e.target.dataset.k] = e.target.value; status(); });
  wall.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-a]"); if (!b) return; var i = +b.closest("[data-i]").dataset.i, a = L.artists[i], k = b.dataset.a;
    if (k === "up" || k === "down") { var j = k === "up" ? i - 1 : i + 1; if (j < 0 || j >= L.artists.length) return; L.artists.splice(i, 1); L.artists.splice(j, 0, a); render(); status(); }
    if (k === "del") { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "sure? (site folder stays)"; return; } L.artists.splice(i, 1); render(); status(); }
    if (k === "cover") { var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,video/mp4,video/webm"; inp.onchange = function () { var f = inp.files[0]; if (!f) return;
      var p = "a/" + a.slug + "/img/cover-" + Date.now().toString(36) + "." + (f.name.split(".").pop() || "jpg").toLowerCase(); PENDING[p] = { file: f, url: URL.createObjectURL(f) }; a.cover = p; render(); status(); }; inp.click(); }
  });
  function addArtist(name, slug) {
    if (!name || !slug) { toast("give a name and a folder name"); return; }
    if (L.artists.some(function (a) { return a.slug === slug; })) { toast("a folder called " + slug + " already exists"); return; }
    var btn = document.getElementById("n-add"); btn.disabled = true; btn.textContent = "creating…";
    fetch("app/artist-page.html", { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (tpl) {
      var page = tpl.replace("__NAME__", esc(name)).replace("__SLUG__", slug);
      var data = JSON.stringify({ v: 1, name: name, bio: ["Write a few lines about yourself."], works: [] }, null, 1);
      L.artists.push({ slug: slug, name: name, line: "", cover: "" });
      var files = {}; files["a/" + slug + "/index.html"] = page; files["a/" + slug + "/data/works.json"] = data; files["artists.json"] = JSON.stringify(L, null, 1);
      return GH.commit(files, "add artist " + slug).then(function () { saved = JSON.stringify(L); toast(name + " added · their page goes live in about a minute"); render(); });
    }).catch(function (e) { L.artists = L.artists.filter(function (a) { return a.slug !== slug; }); btn.disabled = false; btn.textContent = "+ add artist"; toast("couldn't add: " + (e.message || "try again")); });
  }
  function save() {
    var b = document.getElementById("save"); b.disabled = true; document.getElementById("st").textContent = "saving…";
    var files = { "artists.json": JSON.stringify(L, null, 1) };
    L.artists.forEach(function (a) { if (PENDING[a.cover] && !PENDING[a.cover].done) files[a.cover] = PENDING[a.cover].file; });
    GH.commit(files, "edit artists list").then(function () { Object.keys(files).forEach(function (p) { if (PENDING[p]) PENDING[p].done = true; }); saved = JSON.stringify(L); status(); toast("saved · the public page updates in about a minute"); })
      .catch(function (e) { status(); toast("couldn't save: " + (e.message || "try again")); });
  }
  fetch("artists.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { L = d; saved = JSON.stringify(L); document.title = L.title; render(); })
    .catch(function () { side.innerHTML = '<p class="hint">The list didn\'t load. Reload the page to try again.</p>'; });
})();
