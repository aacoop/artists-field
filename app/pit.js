/* Ball pit: lime balls and tag pills fall and pile up. Pills are capsules, balls are circles.
   Pit.start(container, canvas, pillsEl, tags, onTag) → { setActive(tag), setTags(tags) } */
window.Pit = (function () {
  function segClosest(ax, ay, bx, by, px, py) { var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return [ax + dx * t, ay + dy * t]; }
  function segSeg(a, b) { /* closest points between two horizontal segments (pills) or points (balls) */
    var ax1 = a.x - a.hl, ax2 = a.x + a.hl, bx1 = b.x - b.hl, bx2 = b.x + b.hl;
    var lo = Math.max(ax1, bx1), hi = Math.min(ax2, bx2), xa, xb;
    if (lo <= hi) { xa = xb = (lo + hi) / 2; } else if (ax2 < bx1) { xa = ax2; xb = bx1; } else { xa = ax1; xb = bx2; }
    return [xa, a.y, xb, b.y];
  }
  function start(box, canvas, pillsEl, tags, onTag) {
    var ctx = canvas.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, bodies = [], pills = [], drag = null, running = false, visible = true, raf = 0, still = 0;
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, active = null;
    var lime = getComputedStyle(document.documentElement).getPropertyValue("--lime").trim() || "#9dff3c";
    function size() { var r = box.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function makeBalls() {
      bodies = bodies.filter(function (b) { return b.pill; });
      var n = Math.round(Math.min(300, Math.max(90, W * H / 1700))), r = W < 640 ? 11 : 17;
      for (var i = 0; i < n; i++) bodies.push({ x: Math.random() * W, y: -Math.random() * H * 1.6 - 20, vx: (Math.random() - .5) * 2, vy: 0, r: r * (0.85 + Math.random() * .3), hl: 0, m: 1 });
    }
    function makePills(list) {
      pillsEl.innerHTML = ""; bodies = bodies.filter(function (b) { return !b.pill; }); pills = [];
      list.forEach(function (t, i) {
        var el = document.createElement("button"); el.type = "button"; el.className = "pill"; el.textContent = t; el.dataset.tag = t; el.setAttribute("aria-pressed", "false");
        pillsEl.appendChild(el);
        var w = el.offsetWidth, h = el.offsetHeight, b = { pill: el, tag: t, w: w, h: h, r: h / 2, hl: Math.max(0, w / 2 - h / 2), x: W * (.1 + .8 * ((i * 0.618) % 1)), y: -H * 1.9 - i * 70, vx: 0, vy: 0, m: 4 };
        bodies.push(b); pills.push(b);
        el.addEventListener("pointerdown", function (e) { drag = { b: b, ox: e.clientX, oy: e.clientY, sx: b.x, sy: b.y, moved: false, lx: e.clientX, ly: e.clientY, t: performance.now() }; el.classList.add("drag"); try { el.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); kick(); });
        el.addEventListener("click", function (e) { e.preventDefault(); });
        el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTag(t); } });
      });
      if (reduce) layoutStatic();
    }
    function layoutStatic() { var x = 12, y = H - 50; pills.forEach(function (b) { if (x + b.w > W - 12) { x = 12; y -= 44; } b.x = x + b.w / 2; b.y = y; x += b.w + 8; }); bodies.forEach(function (b) { if (!b.pill) { b.x = Math.random() * W; b.y = H - b.r - Math.random() * 60; } }); draw(); }
    window.addEventListener("pointermove", function (e) { if (!drag) return; var b = drag.b, now = performance.now(), dt = Math.max(8, now - drag.t);
      if (Math.abs(e.clientX - drag.ox) + Math.abs(e.clientY - drag.oy) > 4) drag.moved = true;
      b.x = drag.sx + (e.clientX - drag.ox); b.y = drag.sy + (e.clientY - drag.oy); b.vx = (e.clientX - drag.lx) / dt * 16; b.vy = (e.clientY - drag.ly) / dt * 16; drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now; kick(); });
    window.addEventListener("pointerup", function () { if (!drag) return; var d = drag; drag = null; d.b.pill.classList.remove("drag"); if (!d.moved) { d.b.vx = 0; d.b.vy = 0; onTag(d.b.tag); } kick(); });
    box.addEventListener("pointermove", function (e) { if (drag || reduce) return; var r = box.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, any = false;
      bodies.forEach(function (b) { if (b.pill) return; var dx = b.x - mx, dy = b.y - my, d = Math.hypot(dx, dy); if (d < 70 && d > 0) { b.vx += dx / d * 1.6; b.vy += dy / d * 1.6 - .4; any = true; } }); if (any) kick(); });
    function step() {
      var g = .35, sub = 3;
      for (var s = 0; s < sub; s++) {
        bodies.forEach(function (b) { if (drag && drag.b === b) return; b.vy += g / sub; b.vx *= .995; b.x += b.vx / sub; b.y += b.vy / sub;
          var ex = b.r + b.hl; if (b.x < ex) { b.x = ex; b.vx *= -.4; } if (b.x > W - ex) { b.x = W - ex; b.vx *= -.4; } if (b.y > H - b.r) { b.y = H - b.r; b.vy *= -.25; b.vx *= .9; } });
        for (var i = 0; i < bodies.length; i++) for (var j = i + 1; j < bodies.length; j++) {
          var a = bodies[i], c = bodies[j], rr = a.r + c.r; if (Math.abs(a.y - c.y) > rr || Math.abs(a.x - c.x) > rr + a.hl + c.hl) continue;
          var p = segSeg(a, c), dx = p[2] - p[0], dy = p[3] - p[1], d = Math.hypot(dx, dy); if (d >= rr) continue;
          if (d < .001) { dx = 0; dy = 1; d = 1; var ov = rr; } else { var ov = rr - d; dx /= d; dy /= d; }
          var ia = drag && drag.b === a ? 0 : 1 / a.m, ic = drag && drag.b === c ? 0 : 1 / c.m, it = ia + ic; if (!it) continue;
          a.x -= dx * ov * ia / it; a.y -= dy * ov * ia / it; c.x += dx * ov * ic / it; c.y += dy * ov * ic / it;
          var rv = (c.vx - a.vx) * dx + (c.vy - a.vy) * dy; if (rv < 0) { var jimp = -(1.3) * rv / it; a.vx -= jimp * ia * dx; a.vy -= jimp * ia * dy; c.vx += jimp * ic * dx; c.vy += jimp * ic * dy; }
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = lime; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = .6;
      bodies.forEach(function (b) { if (b.pill) { b.pill.style.transform = "translate(" + (b.x - b.w / 2).toFixed(1) + "px," + (b.y - b.h / 2).toFixed(1) + "px)"; return; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); ctx.stroke(); });
    }
    function loop() {
      step(); draw();
      var e = 0; bodies.forEach(function (b) { e += b.vx * b.vx + b.vy * b.vy; }); still = e < bodies.length * .02 && !drag ? still + 1 : 0;
      if (still > 90 || !visible) { running = false; return; } raf = requestAnimationFrame(loop);
    }
    function kick() { if (reduce) { draw(); return; } still = 0; if (!running && visible) { running = true; raf = requestAnimationFrame(loop); } }
    size(); makePills(tags); makeBalls(); if (reduce) layoutStatic(); else kick();
    new ResizeObserver(function () { var oW = W; size(); if (Math.abs(W - oW) > 40) { makeBalls(); pills.forEach(function (b) { b.x = Math.min(b.x, W - b.w / 2); }); } kick(); }).observe(box);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(box);
    return {
      setActive: function (t) { active = t; pills.forEach(function (b) { var on = b.tag === t; b.pill.classList.toggle("on", on); b.pill.setAttribute("aria-pressed", on); if (on && !reduce) { b.vy = -9; b.vx = (Math.random() - .5) * 4; } }); kick(); },
      setTags: function (list) { makePills(list); this.setActive(active); kick(); }
    };
  }
  return { start: start };
})();
