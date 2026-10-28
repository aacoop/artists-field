/* Saving to GitHub from the browser.
   The repo is found from the address (owner.github.io/repo/...) or from window.GH_CONFIG.
   Each editor pastes a fine-grained personal access token once; it stays in this browser only. */
(function () {
  var KEY = "af-gh-token";
  function cfg() {
    var c = window.GH_CONFIG || {};
    var host = location.hostname, parts = location.pathname.split("/").filter(Boolean);
    var owner = c.owner || (/\.github\.io$/.test(host) ? host.split(".")[0] : "");
    var repo = c.repo || (/\.github\.io$/.test(host) ? (parts[0] && host !== parts[0] ? parts[0] : host) : "");
    return { owner: owner, repo: repo, branch: c.branch || "main" };
  }
  function token() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function setToken(t) { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch (e) {} }
  function api(path, opts) {
    var c = cfg(); opts = opts || {};
    var url = path.indexOf("http") === 0 ? path : "https://api.github.com/repos/" + c.owner + "/" + c.repo + path;
    return fetch(url, { method: opts.method || "GET", headers: { "Authorization": "Bearer " + token(), "Accept": "application/vnd.github+json", "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.message || ("GitHub error " + r.status)); e.status = r.status; throw e; } return j; }); });
  }
  function check() { return api("").then(function (j) { if (!j.permissions || !j.permissions.push) { var e = new Error("This token can read the repo but not write to it."); e.status = 403; throw e; } return true; }); }
  function b64(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(",")[1]); }; fr.onerror = rej; fr.readAsDataURL(blob); }); }
  function utf8b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function getText(path) {
    var c = cfg();
    return api("/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + c.branch).then(function (j) { return decodeURIComponent(escape(atob(j.content.replace(/\n/g, "")))); });
  }
  /* files: { "repo/path": string | Blob | null (delete) }  → one commit */
  function commit(files, message, retried) {
    var c = cfg(), head, baseTree;
    return api("/git/ref/heads/" + c.branch).then(function (ref) { head = ref.object.sha; return api("/git/commits/" + head); })
      .then(function (cm) { baseTree = cm.tree.sha;
        return Promise.all(Object.keys(files).map(function (p) {
          var v = files[p];
          if (v === null) return { path: p, mode: "100644", type: "blob", sha: null };
          var body = typeof v === "string" ? Promise.resolve({ content: utf8b64(v), encoding: "base64" }) : b64(v).then(function (d) { return { content: d, encoding: "base64" }; });
          return body.then(function (b) { return api("/git/blobs", { method: "POST", body: b }); }).then(function (bl) { return { path: p, mode: "100644", type: "blob", sha: bl.sha }; });
        })); })
      .then(function (tree) { return api("/git/trees", { method: "POST", body: { base_tree: baseTree, tree: tree } }); })
      .then(function (t) { return api("/git/commits", { method: "POST", body: { message: message || "update", tree: t.sha, parents: [head] } }); })
      .then(function (nc) { return api("/git/refs/heads/" + c.branch, { method: "PATCH", body: { sha: nc.sha } }); })
      .catch(function (e) { if (!retried && (e.status === 422 || e.status === 409)) return commit(files, message, true); throw e; });
  }
  /* small dialog asking for a token */
  function askToken() {
    return new Promise(function (resolve) {
      var c = cfg(), d = document.createElement("div");
      d.className = "ghdlg";
      d.innerHTML = '<div class="ghbox" role="dialog" aria-modal="true" aria-labelledby="ght"><h2 id="ght">sign in to edit</h2>' +
        '<p>Editing saves straight into the GitHub repository <b>' + (c.owner || "?") + "/" + (c.repo || "?") + '</b>. Paste a GitHub token that can write to it. It stays in this browser only.</p>' +
        '<p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">make a token on GitHub</a>: choose “Only select repositories” → this repo, then Repository permissions → Contents → Read and write.</p>' +
        '<label>token<input id="ghtok" type="password" autocomplete="off" spellcheck="false"></label><p class="gherr" id="gherr" hidden></p>' +
        '<div class="ghbtns"><button type="button" class="btn" id="ghcancel">cancel</button><button type="button" class="btn primary" id="ghok">sign in</button></div></div>';
      document.body.appendChild(d); var inp = d.querySelector("#ghtok"), err = d.querySelector("#gherr"); inp.focus();
      function done(v) { d.remove(); resolve(v); }
      d.querySelector("#ghcancel").onclick = function () { done(false); };
      d.querySelector("#ghok").onclick = function () {
        var t = inp.value.trim(); if (!t) return; setToken(t); err.hidden = true; this.textContent = "checking…";
        var b = this; check().then(function () { done(true); }).catch(function (e) { setToken(""); b.textContent = "sign in"; err.textContent = e.status === 401 ? "GitHub didn't accept this token." : e.status === 404 ? "This token can't see the repo. Give it access to " + c.owner + "/" + c.repo + "." : e.message; err.hidden = false; });
      };
      inp.onkeydown = function (e) { if (e.key === "Enter") d.querySelector("#ghok").click(); if (e.key === "Escape") done(false); };
    });
  }
  function ensure() { if (!token()) return askToken(); return check().then(function () { return true; }).catch(function () { setToken(""); return askToken(); }); }
  window.GH = { cfg: cfg, token: token, setToken: setToken, api: api, check: check, commit: commit, getText: getText, ensure: ensure };
})();
