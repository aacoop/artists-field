/* Tag cloud: pills float weightless around their home spots in a loose ellipse, with a few lime balls drifting between them.
   Bigger pill = tag used more often. Click a pill to filter, drag to throw; it drifts back home.
   Pit.start(container, canvas, pillsEl, tags[{t,n}], onTag) → { setActive(tag), setTags(tags) } */
window.Pit = (function () {
  function segSeg(a, b) {
    var ax1 = a.x - a.hl, ax2 = a.x + a.hl, bx1 = b.x - b.hl, bx2 = b.x + b.hl, lo = Math.max(ax1, bx1), hi = Math.min(ax2, bx2), xa, xb;
    if (lo <= hi) { xa = xb = (lo + hi) / 2; } else if (ax2 < bx1) { xa = ax2; xb = bx1; } else { xa = ax1; xb = bx2; }
    return [xa, a.y, xb, b.y];
  }
  function start(box, canvas, pillsEl, tags, onTag) {
    var ctx = canvas.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, bodies = [], pills = [], drag = null, running = false, visible = true, still = 0, t0 = performance.now();
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, active = null;
    var lime = getComputedStyle(document.documentElement).getPropertyValue("--lime").trim() || "#9dff3c";
    function size() { var r = box.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function homes() {
      /* golden-angle spiral squashed into the box: busiest tags near the middle */
      var n = bodies.length, cx = W * (W > 760 ? .62 : .5), cy = H * .52, rx = W * (W > 760 ? .36 : .46), ry = H * .4;
      bodies.slice().sort(function (a, b) { return (b.w || 0) - (a.w || 0); }).forEach(function (b, i) {
        var f = Math.sqrt((i + .5) / n), a = i * 2.39996;
        b.hx = cx + Math.cos(a) * rx * f; b.hy = cy + Math.sin(a) * ry * f; b.ph = Math.random() * 6.28;
        if (b.x == null) { b.x = b.hx + (Math.random() - .5) * 40; b.y = b.hy + (Math.random() - .5) * 40; }
      });
    }
    function build(list) {
      pillsEl.innerHTML = ""; bodies = []; pills = [];
      var max = list.reduce(function (m, x) { return Math.max(m, x.n || 1); }, 1);
      list.forEach(function (x) {
        var el = document.createElement("button"); el.type = "button"; el.className = "pill"; el.textContent = x.t; el.dataset.tag = x.t; el.setAttribute("aria-pressed", "false");
        var k = Math.sqrt((x.n || 1) / max); el.style.fontSize = (12 + k * 12).toFixed(1) + "px"; el.style.height = (26 + k * 16).toFixed(0) + "px"; el.style.borderRadius = "999px";
        pillsEl.appendChild(el);
        var w = el.offsetWidth, h = el.offsetHeight, b = { pill: el, tag: x.t, w: w, h: h, r: h / 2, hl: Math.max(0, w / 2 - h / 2), vx: 0, vy: 0, m: 2 + k * 3 };
        bodies.push(b); pills.push(b);
        el.addEventListener("pointerdown", function (e) { drag = { b: b, ox: e.clientX, oy: e.clientY, sx: b.x, sy: b.y, moved: false, lx: e.clientX, ly: e.clientY, t: performance.now() }; el.classList.add("drag"); try { el.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); kick(); });
        el.addEventListener("click", function (e) { e.preventDefault(); });
        el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTag(x.t); } });
      });
      var nb = Math.round(Math.min(40, Math.max(12, W * H / 16000)));
      for (var i = 0; i < nb; i++) bodies.push({ r: 5 + Math.random() * 9, hl: 0, vx: 0, vy: 0, m: .5 });
      homes(); if (reduce) { bodies.forEach(function (b) { b.x = b.hx; b.y = b.hy; }); settle(); draw(); }
    }
    function settle() { for (var i = 0; i < 120; i++) collide(1); }
    window.addEventListener("pointermove", function (e) { if (!drag) return; var b = drag.b, now = performance.now(), dt = Math.max(8, now - drag.t);
      if (Math.abs(e.clientX - drag.ox) + Math.abs(e.clientY - drag.oy) > 4) drag.moved = true;
      b.x = drag.sx + (e.clientX - drag.ox); b.y = drag.sy + (e.clientY - drag.oy); b.vx = (e.clientX - drag.lx) / dt * 16; b.vy = (e.clientY - drag.ly) / dt * 16; drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now; kick(); });
    window.addEventListener("pointerup", function () { if (!drag) return; var d = drag; drag = null; d.b.pill.classList.remove("drag"); if (!d.moved) { d.b.vx = 0; d.b.vy = 0; onTag(d.b.tag); } kick(); });
    box.addEventListener("pointermove", function (e) { if (drag || reduce) return; var r = box.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, any = false;
      bodies.forEach(function (b) { var dx = b.x - mx, dy = b.y - my, d = Math.hypot(dx, dy); if (d < 90 && d > 0) { var f = (1 - d / 90) * (b.pill ? .6 : 1.4); b.vx += dx / d * f; b.vy += dy / d * f; any = true; } }); if (any) kick(); });
    function collide(k) {
      for (var i = 0; i < bodies.length; i++) for (var j = i + 1; j < bodies.length; j++) {
        var a = bodies[i], c = bodies[j], rr = a.r + c.r + 4; if (Math.abs(a.y - c.y) > rr || Math.abs(a.x - c.x) > rr + a.hl + c.hl) continue;
        var p = segSeg(a, c), dx = p[2] - p[0], dy = p[3] - p[1], d = Math.hypot(dx, dy); if (d >= rr) continue;
        var ov; if (d < .001) { dx = Math.random() - .5; dy = 1; d = Math.hypot(dx, dy); dx /= d; dy /= d; ov = rr; } else { ov = rr - d; dx /= d; dy /= d; }
        var ia = drag && drag.b === a ? 0 : 1 / a.m, ic = drag && drag.b === c ? 0 : 1 / c.m, it = ia + ic; if (!it) continue;
        a.x -= dx * ov * ia / it * k; a.y -= dy * ov * ia / it * k; c.x += dx * ov * ic / it * k; c.y += dy * ov * ic / it * k;
        var rv = (c.vx - a.vx) * dx + (c.vy - a.vy) * dy; if (rv < 0) { var jimp = -1.2 * rv / it; a.vx -= jimp * ia * dx; a.vy -= jimp * ia * dy; c.vx += jimp * ic * dx; c.vy += jimp * ic * dy; }
      }
    }
    function step() {
      var t = (performance.now() - t0) / 1000;
      bodies.forEach(function (b) { if (drag && drag.b === b) return;
        var tx = b.hx + Math.sin(t * .5 + b.ph) * 6, ty = b.hy + Math.cos(t * .4 + b.ph) * 5;
        b.vx += (tx - b.x) * .006; b.vy += (ty - b.y) * .006; b.vx *= .92; b.vy *= .92; b.x += b.vx; b.y += b.vy;
        var ex = b.r + b.hl; if (b.x < ex) { b.x = ex; b.vx *= -.5; } if (b.x > W - ex) { b.x = W - ex; b.vx *= -.5; } if (b.y < b.r) { b.y = b.r; b.vy *= -.5; } if (b.y > H - b.r) { b.y = H - b.r; b.vy *= -.5; } });
      collide(.5);
    }
    function draw() {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = lime; ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = .6;
      bodies.forEach(function (b) { if (b.pill) { b.pill.style.transform = "translate(" + (b.x - b.w / 2).toFixed(1) + "px," + (b.y - b.h / 2).toFixed(1) + "px)"; return; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); ctx.stroke(); });
    }
    function loop() {
      step(); draw();
      var e = 0; bodies.forEach(function (b) { e += Math.abs(b.vx) + Math.abs(b.vy); });
      still = e < bodies.length * .06 && !drag ? still + 1 : 0;
      if (still > 240 || !visible) { running = false; return; } requestAnimationFrame(loop);
    }
    function kick() { if (reduce) { draw(); return; } still = 0; if (!running && visible) { running = true; requestAnimationFrame(loop); } }
    size(); build(tags); kick();
    new ResizeObserver(function () { var oW = W, oH = H; size(); if (Math.abs(W - oW) > 20 || Math.abs(H - oH) > 20) { homes(); } kick(); }).observe(box);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(box);
    return {
      setActive: function (t) { active = t; pills.forEach(function (b) { var on = b.tag === t; b.pill.classList.toggle("on", on); b.pill.setAttribute("aria-pressed", on); if (on && !reduce) { b.vy -= 4; } }); kick(); },
      setTags: function (list) { build(list); this.setActive(active); kick(); }
    };
  }
  return { start: start };
})();
