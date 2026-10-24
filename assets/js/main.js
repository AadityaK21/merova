/* Merova: progressive enhancements. Every page works without this file.
   It adds the mobile menu, form sending, copy buttons, the hero object you can turn,
   and a few scroll moments that carry the story. No libraries. */

/* ------------------------------------------------------------------------
   SETTINGS: the only line you need to edit.
   Free key from https://web3forms.com. The key is meant to be public,
   so it's safe here.
   ------------------------------------------------------------------------ */
var WEB3FORMS_KEY = "37772fc7-8593-4118-9602-67d28a2ed094";

(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ======================================================================
     Sound: tiny synthesized UI cues (Web Audio, no files). Off by default.
     Turned on only by the visitor, remembered on this device, and the audio
     context is only started inside a real click or key press.
     ====================================================================== */
  var SOUND_KEY = "merova-sound";
  var soundOn = false, actx = null, master = null, lastPlay = {};
  try { soundOn = localStorage.getItem(SOUND_KEY) === "on"; } catch (err) { soundOn = false; }
  var AC = window.AudioContext || window.webkitAudioContext;
  function audio() {
    if (!AC) return null;
    if (!actx) {
      actx = new AC();
      var comp = actx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      master = actx.createGain(); master.gain.value = 0.8;
      master.connect(comp); comp.connect(actx.destination);
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function synth(freq, start, dur, peak, type, glideTo) {
    var o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, start);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    f.type = "lowpass"; f.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(start); o.stop(start + dur + 0.02);
  }
  function air(start, dur, peak, from, to) {
    var len = Math.ceil(actx.sampleRate * dur), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    n.buffer = buf; f.type = "bandpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, start); f.frequency.exponentialRampToValueAtTime(to, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(start); n.stop(start + dur + 0.02);
  }
  // a five-note scale so neighbouring menu rows sound related, not random
  var SCALE = [880, 988, 1109, 1319, 1480, 1661];
  function sfx(name, arg) {
    if (!soundOn || !actx) return;
    if (actx.state !== "running") { actx.resume(); return; }
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return;
    lastPlay[name] = now;
    var t = actx.currentTime + 0.005;
    if (name === "tick") { synth(SCALE[(arg || 0) % SCALE.length], t, 0.08, 0.075, "triangle"); }
    else if (name === "hover") { air(t, 0.18, 0.05, 900, 2600); synth(330, t, 0.16, 0.03, "sine", 392); }
    else if (name === "open") { air(t, 0.34, 0.045, 400, 1800); synth(523, t + 0.04, 0.24, 0.045, "sine", 659); }
    else if (name === "close") { air(t, 0.28, 0.04, 1800, 500); synth(659, t, 0.2, 0.04, "sine", 494); }
    else if (name === "align") { synth(1319, t, 0.55, 0.045, "sine"); synth(1976, t + 0.06, 0.5, 0.026, "sine"); }
    else if (name === "on") { synth(784, t, 0.09, 0.04, "triangle"); synth(1175, t + 0.08, 0.14, 0.035, "triangle"); }
  }
  function paintSound() {
    $$("[data-sound-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", soundOn ? "true" : "false");
      var l = $("[data-sound-label]", b);
      if (l) l.textContent = soundOn ? "Sound on" : "Sound off";
    });
    doc.classList.toggle("sound-on", soundOn);
  }
  function setSound(on) {
    soundOn = on;
    try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch (err) { /* private mode: just this visit */ }
    if (on) {
      var c = audio();
      if (c && c.state === "running") sfx("on");
      else if (c) c.resume().then(function () { sfx("on"); }, function () {});
    }
    else if (actx && actx.state === "running") { actx.suspend(); }
    paintSound();
  }
  // a remembered "on" starts audio only at the visitor's first click or key press, never by itself
  if (soundOn && AC) {
    var unlock = function () { audio(); ["pointerdown", "keydown"].forEach(function (ev) { window.removeEventListener(ev, unlock, true); }); };
    ["pointerdown", "keydown"].forEach(function (ev) { window.addEventListener(ev, unlock, true); });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sound-toggle]");
    if (b) setSound(!soundOn);
  });
  paintSound();
  // hover cues: mouse only (never on touch), and only on a few chosen elements
  function hoverSound(el, name, arg) {
    el.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") sfx(name, arg); });
  }

  /* ---------- The menu: a full-height panel from the right ---------- */
  var menu = document.getElementById("menu");
  var opener = $("[data-menu-open]");
  if (menu && opener) {
    var panel = $(".menu__panel", menu);
    var closeTimer = 0, focusTimer = 0, lastFocus = null;
    var focusables = function () {
      return $$('a[href], button:not([disabled])', panel).filter(function (el) { return el.offsetParent !== null; });
    };
    var setInert = function (on) { $$("main, .site-footer").forEach(function (el) { el.inert = on; }); };
    var openMenu = function () {
      clearTimeout(closeTimer);
      setInert(true);
      lastFocus = document.activeElement;
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add("is-open");
      doc.classList.add("menu-open");
      opener.setAttribute("aria-expanded", "true");
      sfx("open");
      var first = $(".menu__list a", panel);
      clearTimeout(focusTimer);
      focusTimer = setTimeout(function () { if (menu.classList.contains("is-open")) (first || panel).focus(); }, reduceMotion ? 0 : 120);
    };
    var closeMenu = function (restore) {
      if (!menu.classList.contains("is-open")) return;
      clearTimeout(focusTimer);
      menu.classList.remove("is-open");
      menu.classList.add("is-closing");
      opener.setAttribute("aria-expanded", "false");
      sfx("close");
      setInert(false);
      closeTimer = setTimeout(function () {
        menu.hidden = true;
        menu.classList.remove("is-closing");
        doc.classList.remove("menu-open");
      }, reduceMotion ? 0 : 560);
      if (restore !== false) (lastFocus && lastFocus.focus ? lastFocus : opener).focus();
    };
    // rows: a short tick on hover (pitch rises down the list), and the arrow leans toward the pointer
    $$(".menu__list a", menu).forEach(function (a, i) {
      hoverSound(a, "tick", i);
      if (!finePointer || reduceMotion) return;
      a.addEventListener("pointermove", function (e) {
        var r = a.getBoundingClientRect();
        a.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        a.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      a.addEventListener("pointerleave", function () { a.style.setProperty("--mx", "0"); a.style.setProperty("--my", "0"); });
    });
    opener.addEventListener("click", function () { if (menu.classList.contains("is-open")) closeMenu(); else openMenu(); });
    $$("[data-menu-close]", menu).forEach(function (b) { b.addEventListener("click", function () { closeMenu(); }); });
    menu.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var here = a.getAttribute("aria-current") === "page";
      closeMenu(false);
      if (here) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); }
    });
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) {
        clearTimeout(closeTimer); clearTimeout(focusTimer);
        menu.classList.remove("is-open", "is-closing"); menu.hidden = true;
        doc.classList.remove("menu-open"); opener.setAttribute("aria-expanded", "false");
        setInert(false);
      }
    });
  }

  var header = $(".site-header");
  var headerBrand = header && $(".brand", header);

  /* ======================================================================
     The Fold: two sheets in 3D. Drag (or use the arrow keys) to turn them;
     seen head on they line up into the Merova mark.
     ====================================================================== */
  var fold = $("[data-fold]");
  var hero = $(".hero");
  var foldScroll = 0;
  var renderFold = function () {};
  if (fold) {
    var scene = $(".fold3d__scene", fold);
    var obj = $(".fold3d__obj", fold);
    var ground = $(".fold3d__ground", fold);
    var angleOut = $("[data-angle]", fold);
    var stateOut = $("[data-state]", fold);
    var REST = { ry: -18, rx: 8 };
    var DEPTH = 90;
    var st = { ry: REST.ry, rx: REST.rx, d: DEPTH };
    var drag = null, tween = null, spin = null, aligned = false, intro = false, idleText = finePointer ? "Drag to turn" : "Swipe to turn";

    // light comes from the front left; a sheet facing it is brighter
    var IV = [246, 244, 238];
    var tone = function (k) { return "rgb(" + IV.map(function (c) { return Math.round(c * k); }).join(",") + ")"; };
    var lightFor = function (ry) { return 0.55 + 0.45 * Math.max(0, Math.cos((ry + 35) * Math.PI / 180)); };

    // One source of truth: `st` holds the angle the visitor set (by drag, keys, Line up, Reset or the intro).
    // Scroll never touches `st`. It only moves the whole object (lift, shrink, tilt) through --p, which is
    // a pure function of scroll position, so scrolling back to the top always restores the exact view.
    renderFold = function () {
      var ry = st.ry, rx = st.rx;
      var I = lightFor(ry);
      obj.style.setProperty("--ry", ry.toFixed(2));
      obj.style.setProperty("--rx", rx.toFixed(2));
      obj.style.setProperty("--d", st.d.toFixed(1));
      ground.style.setProperty("--ry", ry.toFixed(2));
      obj.style.setProperty("--l-hi", tone(0.78 + 0.22 * I));
      obj.style.setProperty("--l-lo", tone(0.6 + 0.24 * I));
      obj.style.setProperty("--l-edge", tone(0.36 + 0.2 * Math.abs(Math.sin(ry * Math.PI / 180))));
      obj.style.setProperty("--r-hi", tone(0.36 + 0.16 * I));
      obj.style.setProperty("--r-lo", tone(0.22 + 0.1 * I));
      obj.style.setProperty("--r-edge", tone(0.14 + 0.1 * Math.abs(Math.sin(ry * Math.PI / 180))));
      var shown = Math.round(ry);
      angleOut.textContent = (shown < 0 ? "−" : "") + Math.abs(shown) + "°";
      var nowAligned = Math.abs(ry) < 0.75 && rx < 1;
      if (nowAligned !== aligned) {
        aligned = nowAligned;
        fold.classList.toggle("is-aligned", aligned);
        if (aligned && !intro) sfx("align");
      }
      stateOut.textContent = aligned ? "Lined up: the Merova mark" : (drag ? "Turning" : idleText);
      scene.setAttribute("aria-valuenow", String(Math.round(st.ry)));
      scene.setAttribute("aria-valuetext", aligned ? "Lined up into the Merova logo" : "Turned " + Math.abs(Math.round(st.ry)) + " degrees " + (st.ry < 0 ? "left" : "right"));
    };

    var stopMotion = function () {
      intro = false;
      if (tween) { cancelAnimationFrame(tween); tween = null; }
      if (spin) { cancelAnimationFrame(spin); spin = null; }
    };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
    var animateTo = function (target, ms) {
      stopMotion();
      if (reduceMotion || ms === 0) {
        Object.keys(target).forEach(function (k) { st[k] = target[k]; });
        renderFold();
        return;
      }
      var from = { ry: st.ry, rx: st.rx, d: st.d }, t0 = performance.now();
      var step = function (now) {
        var t = clamp((now - t0) / ms, 0, 1), e = easeOut(t);
        Object.keys(target).forEach(function (k) { st[k] = from[k] + (target[k] - from[k]) * e; });
        renderFold();
        tween = t < 1 ? requestAnimationFrame(step) : null;
      };
      tween = requestAnimationFrame(step);
    };

    // first impression: the sheets unfold from edge-on and settle at rest
    if (!reduceMotion) {
      st.ry = -66; st.d = 10; st.rx = 14; intro = true;
      renderFold();
      setTimeout(function () { if (intro) { animateTo({ ry: REST.ry, rx: REST.rx, d: DEPTH }, 1500); intro = true; } }, 250);
      setTimeout(function () { intro = false; }, 1800);
    } else {
      renderFold();
    }

    // drag with a little inertia; let go near the front and it snaps into the logo
    scene.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      stopMotion();
      drag = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx, t: performance.now(), v: 0, lastX: e.clientX, id: e.pointerId, moved: false };
      fold.classList.add("is-dragging");
    });
    scene.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) > 3) { drag.moved = true; try { scene.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      if (!drag.moved) return;
      var now = performance.now();
      drag.v = (e.clientX - drag.lastX) / Math.max(8, now - drag.t);
      drag.t = now; drag.lastX = e.clientX;
      st.ry = clamp(drag.ry + dx * 0.32, -70, 70);
      if (e.pointerType === "mouse") st.rx = clamp(drag.rx - dy * 0.1, 0, 22);
      renderFold();
    });
    var endDrag = function (e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var v = drag.v * 16 * 0.32, moved = drag.moved;
      drag = null;
      fold.classList.remove("is-dragging");
      if (!moved) { renderFold(); return; }
      if (reduceMotion) { settle(); return; }
      var glide = function () {
        v *= 0.9;
        st.ry = clamp(st.ry + v, -70, 70);
        renderFold();
        spin = Math.abs(v) > 0.05 ? requestAnimationFrame(glide) : null;
        if (!spin) settle();
      };
      spin = requestAnimationFrame(glide);
    };
    var settle = function () {
      if (Math.abs(st.ry) < 4) animateTo({ ry: 0, rx: 0 }, 420);
      else renderFold();
    };
    scene.addEventListener("pointerup", endDrag);
    scene.addEventListener("pointercancel", endDrag);
    if (finePointer) {
      scene.addEventListener("pointerenter", function () { fold.classList.add("is-hover"); });
      scene.addEventListener("pointerleave", function () { fold.classList.remove("is-hover"); });
    }

    // keyboard: it's a slider
    scene.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 15 : 5, handled = true;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") st.ry = clamp(st.ry - step, -70, 70);
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") st.ry = clamp(st.ry + step, -70, 70);
      else if (e.key === "Home") { animateTo({ ry: 0, rx: 0 }, 600); }
      else if (e.key === "End") { animateTo(REST, 600); }
      else handled = false;
      if (handled) {
        e.preventDefault();
        if (e.key.indexOf("Arrow") === 0) { stopMotion(); if (Math.abs(st.ry) < 0.5) { st.rx = 0; } renderFold(); }
      }
    });
    $$("[data-fold]", fold).forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-fold") === "align") animateTo({ ry: 0, rx: 0, d: DEPTH }, 900);
        else animateTo({ ry: REST.ry, rx: REST.rx, d: DEPTH }, 900);
      });
    });
  }

  /* ---------- One scroll frame, with geometry measured only when layout changes ----------
     Measurement runs before any visual writes. The cached positions ignore reveal transforms,
     so scrolling back to a position always produces the same state. No idle animation loop. */
  var scrollRaf = null, layoutDirty = true, viewportHeight = window.innerHeight;
  var measureEffects = [], paintEffects = [], heroTop = 0, heroRange = 1;
  var docked = false, headerScrolled = null;
  function layoutTop(el) {
    var top = 0;
    while (el) { top += el.offsetTop; el = el.offsetParent; }
    return top;
  }
  function measureLayout() {
    viewportHeight = window.innerHeight;
    if (hero) {
      var pin = $(".hero__pin", hero);
      var pinned = pin && getComputedStyle(pin).position === "sticky";
      heroTop = layoutTop(hero) - (header ? header.offsetHeight : 0);
      heroRange = Math.max(1, pinned ? hero.offsetHeight - pin.offsetHeight : hero.offsetHeight * 0.7);
    }
    measureEffects.forEach(function (measure) { measure(); });
    layoutDirty = false;
  }
  function paintScroll() {
    scrollRaf = null;
    if (document.hidden) return;
    if (layoutDirty) measureLayout();
    var y = window.scrollY;
    if (header && headerScrolled !== (y > 8)) {
      headerScrolled = y > 8;
      header.classList.toggle("is-scrolled", headerScrolled);
    }
    if (fold && hero) {
      var p = reduceMotion ? 0 : clamp((y - heroTop) / heroRange, 0, 1);
      if (p !== foldScroll) { foldScroll = p; hero.style.setProperty("--p", p.toFixed(3)); }
      if (headerBrand && p > 0.85 && !docked) {
        docked = true;
        headerBrand.classList.add("is-docking");
      } else if (headerBrand && p < 0.4 && docked) {
        docked = false;
        headerBrand.classList.remove("is-docking");
      }
    }
    paintEffects.forEach(function (paint) { paint(y); });
  }
  function queueScroll() {
    if (scrollRaf === null && !document.hidden) scrollRaf = requestAnimationFrame(paintScroll);
  }
  function invalidateLayout() { layoutDirty = true; queueScroll(); }
  window.addEventListener("scroll", queueScroll, { passive: true });
  window.addEventListener("resize", invalidateLayout);
  window.addEventListener("load", invalidateLayout);
  window.addEventListener("pageshow", invalidateLayout);
  document.addEventListener("visibilitychange", queueScroll);
  if (document.fonts) document.fonts.ready.then(invalidateLayout);
  if ("ResizeObserver" in window) {
    var layoutObserver = new ResizeObserver(invalidateLayout);
    layoutObserver.observe(document.body);
    if (header) layoutObserver.observe(header);
  }
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (event) {
    reduceMotion = event.matches;
    if (reduceMotion && fold) { stopMotion(); renderFold(); }
    invalidateLayout();
  });
  queueScroll();

  /* ---------- The studio statement lights up word by word as you read down ---------- */
  var statement = $("[data-words]");
  if (statement && !reduceMotion) {
    var words = [];
    var text = statement.textContent.trim().split(/\s+/);
    statement.textContent = "";
    text.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      statement.appendChild(s);
      if (i < text.length - 1) statement.appendChild(document.createTextNode(" "));
      words.push(s);
    });
    var lit = -1, statementTop = 0, statementHeight = 0;
    measureEffects.push(function () { statementTop = layoutTop(statement); statementHeight = statement.offsetHeight; });
    paintEffects.push(function (y) {
      var p = reduceMotion ? 1 : clamp((viewportHeight * 0.82 - (statementTop - y)) / (statementHeight + viewportHeight * 0.3), 0, 1);
      var n = Math.round(p * words.length);
      if (n !== lit) {
        words.forEach(function (w, i) { w.classList.toggle("on", i < n); });
        lit = n;
      }
    });
  }

  /* ---------- Product story: the phone stays, the chapters change its screen ---------- */
  $$("[data-story]").forEach(function (story) {
    var stage = $(".story__stage", story);
    if (!stage || !hasIO) return;
    var screens = $$(".phone__screen", stage);
    var steps = $$(".story__step", story);
    var wide = window.matchMedia("(min-width: 900px)");
    var show = function (key) {
      screens.forEach(function (s) {
        var on = s.getAttribute("data-screen") === key;
        s.classList.toggle("is-on", on);
        if (on) s.loading = "eager";
      });
      steps.forEach(function (st) { st.classList.toggle("is-active", st.getAttribute("data-screen") === key); });
    };
    var setLive = function () { story.classList.toggle("is-live", wide.matches); };
    setLive();
    wide.addEventListener("change", setLive);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) show(en.target.getAttribute("data-screen")); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(function (s) { io.observe(s); });
    // fetch the other screens shortly before the stage comes into view
    var near = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      near.disconnect();
      screens.forEach(function (s) { s.loading = "eager"; });
    }, { rootMargin: "600px 0px" });
    near.observe(story);
  });

  /* ---------- Chapter indicator ----------
     Worked out from scroll position (the last section whose top has passed the middle of the screen),
     so it is right whichever way you scroll and however fast. Hidden in the first section and over the footer. */
  var chapter = $(".chapter");
  var chapters = $$("[data-chapter]");
  if (chapter && chapters.length) {
    var cn = $(".chapter__n", chapter), cname = $(".chapter__name", chapter), foot = $(".site-footer"), cur = null;
    var chapterTops = [], footerTop = Infinity;
    measureEffects.push(function () {
      chapterTops = chapters.map(layoutTop);
      footerTop = foot ? layoutTop(foot) : Infinity;
    });
    paintEffects.push(function (y) {
      var mid = y + viewportHeight * 0.5, now = null;
      for (var i = 0; i < chapters.length; i++) { if (chapterTops[i] <= mid) now = chapters[i]; }
      var hide = !now || now === chapters[0] || footerTop - y < viewportHeight * 0.85 || doc.classList.contains("menu-open");
      chapter.classList.toggle("is-hidden", hide);
      if (now && now !== cur) {
        cur = now;
        cn.textContent = now.getAttribute("data-chapter");
        cname.textContent = now.getAttribute("data-chapter-name");
      }
    });
  }

  /* ---------- Reversible reveals ----------
     Decided from scroll position on every scroll frame, not from one-off events, so jumps (scrollbar drags,
     "Back to top", anchor links) can't leave anything stuck. Above the reveal line: shown. Pushed back
     below the bottom of the screen (scrolling up): reset, so it plays again on the way down. */
  var revealEls = [], growEls = [], revealTops = [], growTops = [], growProgress = [];
  // wrap every word of a heading in a mask, keeping inner elements (like the italic word) intact
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(" ")); return; }
            var o = document.createElement("span"), i = document.createElement("span");
            o.className = "mw"; i.className = "mw__i"; i.textContent = w;
            i.style.setProperty("--i", String(n++));
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && !c.classList.contains("count")) { walk(c); }
      });
    })(el);
  }
  var paintReveals = function (y) {
    var vh = viewportHeight;
    // light sections open from a card to full bleed while their top travels up the screen
    for (var g = 0; g < growEls.length; g++) {
      var next = reduceMotion ? "1" : clamp((vh - (growTops[g] - y)) / (vh * 0.55), 0, 1).toFixed(3);
      if (next !== growProgress[g]) { growEls[g].style.setProperty("--e", next); growProgress[g] = next; }
    }
    for (var i = 0; i < revealEls.length; i++) {
      var el = revealEls[i], top = revealTops[i] - y;
      if (reduceMotion || top < vh * 0.9) { if (!el.classList.contains("is-in")) el.classList.add("is-in"); }
      else if (top > vh) { if (el.classList.contains("is-in")) el.classList.remove("is-in"); }
    }
  };
  if (!reduceMotion) {
    var vh0 = window.innerHeight;
    $$(".wcard, .case__frame, .case__hero, .wrow, .svc, .steps4 li, .pixels__specs > div").forEach(function (el) {
      if (el.getBoundingClientRect().top > vh0 * 0.9) { el.classList.add("rv-box"); revealEls.push(el); }
    });
    $$("main .h2, .pixels__title").forEach(function (h) {
      if (h.getBoundingClientRect().top > vh0 * 0.9) { splitWords(h); h.classList.add("rv-words"); revealEls.push(h); }
    });
    $$(".grow").forEach(function (g) { growEls.push(g); });
    measureEffects.push(function () { revealTops = revealEls.map(layoutTop); growTops = growEls.map(layoutTop); });
    paintEffects.push(paintReveals);
    window.addEventListener("beforeprint", function () { revealEls.forEach(function (el) { el.classList.add("is-in"); }); });
  }

  /* ---------- Home work teaser ---------- */
  var stage = $("[data-teaser-stage]");
  if (stage) {
    var slides = $$(".teaser__slide", stage), items = $$("[data-teaser]"), capT = $("[data-teaser-title]", stage), capK = $("[data-teaser-kind]", stage), activeT = 0;
    var kinds = items.map(function (a) { return $(".tlist__k", a).textContent; });
    var setActive = function (i) {
      if (i === activeT) return;
      activeT = i;
      slides.forEach(function (sl, k) { sl.classList.toggle("is-on", k === i); });
      items.forEach(function (a, k) { a.parentNode.classList.toggle("is-active", k === i); });
      var sl = slides[i];
      stage.setAttribute("href", sl.getAttribute("data-href"));
      capT.textContent = sl.getAttribute("data-title"); capK.textContent = kinds[i];
    };
    items[0].parentNode.classList.add("is-active");
    items.forEach(function (a, i) {
      a.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { setActive(i); sfx("tick", i + 1); } });
      a.addEventListener("focus", function () { setActive(i); });
    });
    hoverSound(stage, "hover");
    if (finePointer && !reduceMotion) {
      stage.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect();
        stage.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        stage.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      stage.addEventListener("pointerleave", function () { stage.style.setProperty("--tx", "0"); stage.style.setProperty("--ty", "0"); });
    }
  }

  /* ---------- Work list: the thumbnail follows the pointer ---------- */
  var rowsList = $(".wrows");
  if (rowsList && finePointer && !reduceMotion) {
    rowsList.addEventListener("pointermove", function (e) {
      var row = e.target.closest(".wrow__link");
      if (!row) return;
      var r = row.getBoundingClientRect();
      var thumb = $(".wrow__thumb", row);
      if (!thumb) return;
      thumb.style.setProperty("--tx", Math.round(e.clientX - r.left) + "px");
      thumb.style.setProperty("--ty", Math.round(e.clientY - r.top) + "px");
    });
  }

  /* ---------- Context cursor ----------
     The system cursor stays everywhere. Only two places get a small extra cue, on a mouse:
     project images ("View project", replacing the arrow inside the image) and the Fold ("Drag to turn"). */
  if (finePointer) {
    var cue = document.createElement("div");
    cue.className = "pcur";
    cue.setAttribute("aria-hidden", "true");
    cue.innerHTML = '<span class="pcur__dot"></span><span class="pcur__label"></span>';
    document.body.appendChild(cue);
    var cueLabel = $(".pcur__label", cue), cueOn = null, cx = 0, cy = 0, tx = 0, ty = 0, cueRaf = null;
    var cueBounds = null, cueWidth = 120, cueHeight = 32;
    var moveCue = function () {
      cx += (tx - cx) * (reduceMotion ? 1 : 0.32);
      cy += (ty - cy) * (reduceMotion ? 1 : 0.32);
      cue.style.setProperty("--cx", cx.toFixed(1) + "px");
      cue.style.setProperty("--cy", cy.toFixed(1) + "px");
      cueRaf = (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) ? requestAnimationFrame(moveCue) : null;
    };
    var track = function (e) {
      // keep the label inside the area it describes, so it never sits on the project title below
      var r = cueBounds;
      tx = clamp(e.clientX + 14, r.left + 8, r.right - cueWidth - 8);
      ty = clamp(e.clientY + 14, r.top + 8, r.bottom - cueHeight - 8);
      if (!cueRaf) cueRaf = requestAnimationFrame(moveCue);
    };
    var hideCue = function () {
      cueOn = null;
      cue.classList.remove("is-on");
      if (cueRaf) { cancelAnimationFrame(cueRaf); cueRaf = null; }
    };
    $$("[data-cursor]").forEach(function (el) {
      var activate = function (e) {
        if (e.pointerType !== "mouse") return;
        cueOn = el;
        cueLabel.textContent = el.getAttribute("data-cursor");
        cue.classList.toggle("pcur--view", el.getAttribute("data-cursor-kind") === "view");
        var r = cueBounds = el.getBoundingClientRect();
        cueWidth = cue.offsetWidth || 120; cueHeight = cue.offsetHeight || 32;
        cx = tx = clamp(e.clientX + 14, r.left + 8, r.right - 140); cy = ty = clamp(e.clientY + 14, r.top + 8, r.bottom - 40);
        track(e);
        cue.classList.add("is-on");
      };
      el.addEventListener("pointerenter", activate);
      // after a scroll hides it, the first move inside brings it straight back
      el.addEventListener("pointermove", function (e) { if (cueOn === el) track(e); else activate(e); });
      el.addEventListener("pointerleave", function () { if (cueOn === el) hideCue(); });
    });
    window.addEventListener("scroll", hideCue, { passive: true });
    window.addEventListener("resize", hideCue);
    document.addEventListener("visibilitychange", function () { if (document.hidden) hideCue(); });
  }
  // project hover: a soft breath of sound, once per entry
  $$(".wcard__visual, .wrow__link").forEach(function (el) { hoverSound(el, "hover"); });

  /* ---------- The band: native scroll drives a single transform ----------
     No secondary easing loop or layout reads while scrolling. The same position gives
     the same offset in either direction, including scrollbar jumps and back navigation. */
  var band = $(".talk__track");
  if (band) {
    var bandTop = 0, bandWidth = 1, bandHeight = 0, bandX = null;
    measureEffects.push(function () {
      bandTop = layoutTop(band.parentNode);
      bandWidth = band.scrollWidth / 2 || 1;
      bandHeight = band.parentNode.offsetHeight;
    });
    paintEffects.push(function (y) {
      if (!reduceMotion && (bandTop - y > viewportHeight + 200 || bandTop + bandHeight - y < -200)) return;
      var travel = (y + viewportHeight - bandTop) * 0.6;
      var x = reduceMotion ? "0.00" : (-(((travel % bandWidth) + bandWidth) % bandWidth)).toFixed(2);
      if (x !== bandX) { bandX = x; band.style.setProperty("--bx", x + "px"); }
    });
  }

  /* ---------- Copy buttons (contact emails, brand colours) ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 1600);
      };
      var fallback = function () {
        if (text.indexOf("@") > 0) { window.location.href = "mailto:" + text; } else { btn.textContent = text; }
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  /* ---------- Policy pages: highlight the section you're reading ---------- */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && hasIO) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var currentToc = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (currentToc) currentToc.classList.remove("is-active");
        currentToc = byId[en.target.id];
        if (currentToc) currentToc.classList.add("is-active");
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Forms (contact + launch list) via Web3Forms ---------- */
  var MESSAGES = {
    contact: { ok: "Message sent. You'll get a reply at the email you entered.", fail: "Your message didn't send. Try again, or email hello@merova.app." },
    enquiry: { ok: "Thanks. Your enquiry is in, and you'll get a personal reply at the email you entered.", fail: "Your enquiry didn't send. Try again, or email hello@merova.app." },
    waitlist: { ok: "You're on the list. We'll email you when it's out.", fail: "That didn't go through. Try again, or email hello@merova.app." }
  };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // "Start a project" links from a service row arrive with ?type=…; preselect that option
  $$("select[data-preselect]").forEach(function (sel) {
    var v = null;
    try { v = new URLSearchParams(window.location.search).get(sel.getAttribute("data-preselect")); } catch (err) { v = null; }
    if (v && $$("option", sel).some(function (o) { return o.value === v; })) sel.value = v;
  });

  /* ---------- Project finder: a useful starting point, then a real enquiry ----------
     Only the service choice goes in the URL. The visitor's optional note stays
     in sessionStorage in this tab, and is sent only by the enquiry form. */
  var BRIEF_KEY = "merova-project-brief-v1";
  var PROJECTS = {
    website: {
      goal: "A home for my business",
      title: "Website design and development",
      description: "A clear home for your business, designed around what visitors need to understand and do.",
      includes: ["Layout, type and art direction", "Responsive build and enquiry forms", "Search basics and fast loading"],
      image: "/assets/work/site-home.webp", alt: "The Merova website homepage with its interactive Fold",
      href: "/work/merova-site", project: "merova.app", kind: "Website and identity"
    },
    motion: {
      goal: "A site people remember",
      title: "Interactive and motion-led websites",
      description: "An expressive website with a clear story, thoughtful motion and moments visitors can explore.",
      includes: ["Art direction and a story to explore", "Purposeful scroll and pointer interactions", "Keyboard access and reduced-motion support"],
      image: "/assets/work/fold-a.webp", alt: "The Fold, Merova's interactive two-plane brand experiment",
      href: "/work/the-fold", project: "The Fold", kind: "Interactive experiment"
    },
    app: {
      goal: "An idea people can use",
      title: "Web applications and digital products",
      description: "Turn a useful idea into a working product, starting with the core task your customers need to complete.",
      includes: ["User journeys and interface design", "Accounts, dashboards, data and APIs", "A focused first version, scoped together"],
      image: "/assets/work/ch-home.webp", alt: "Company Hub, a self-initiated Merova web application",
      href: "/work/company-hub", project: "Company Hub", kind: "Web application"
    },
    improve: {
      goal: "A better version of my site",
      title: "Product design and ongoing improvements",
      description: "Start with what already exists. Find the confusing, slow or unfinished parts and agree what to improve first.",
      includes: ["A review of the existing experience", "Design, speed and accessibility improvements", "A prioritised scope before work starts"],
      image: "/assets/work/site-brand.webp", alt: "The Merova website's brand identity and design system",
      href: "/work/merova-site", project: "merova.app", kind: "Website and identity"
    }
  };
  var TIMELINES = ["Not sure yet", "As soon as possible", "Within a month", "One to three months", "Flexible"];
  function readProjectBrief() {
    try {
      var brief = JSON.parse(sessionStorage.getItem(BRIEF_KEY));
      if (!brief || brief.version !== 1 || !Object.prototype.hasOwnProperty.call(PROJECTS, brief.type) ||
          TIMELINES.indexOf(brief.timeline) < 0 || typeof brief.note !== "string" || brief.note.length > 1200) return null;
      return brief;
    } catch (err) { return null; }
  }
  function forgetProjectBrief() {
    try { sessionStorage.removeItem(BRIEF_KEY); } catch (err) { /* storage can be disabled */ }
  }
  var finder = $("[data-project-finder]");
  if (finder) {
    var choices = $$("[data-project-choice]", finder);
    var finderTime = $("[data-finder-timeline]", finder);
    var finderNote = $("[data-finder-note]", finder);
    var finderContinue = $("[data-finder-continue]", finder);
    var finderStatus = $("[data-finder-status]", finder);
    var savedBrief = readProjectBrief();
    if (savedBrief) {
      choices.forEach(function (choice) { choice.checked = choice.value === savedBrief.type; });
      finderTime.value = savedBrief.timeline;
      finderNote.value = savedBrief.note;
    }
    function chosenProject() {
      var checked = choices.filter(function (choice) { return choice.checked; })[0];
      return checked && Object.prototype.hasOwnProperty.call(PROJECTS, checked.value) ? checked.value : "website";
    }
    function paintProject(announce) {
      var key = chosenProject(), project = PROJECTS[key];
      $("[data-finder-title]", finder).textContent = project.title;
      $("[data-finder-description]", finder).textContent = project.description;
      var includes = $("[data-finder-includes]", finder);
      includes.textContent = "";
      project.includes.forEach(function (text) {
        var li = document.createElement("li"); li.textContent = text; includes.appendChild(li);
      });
      // The project preview only exists while the portfolio is shown (SHOW_WORK in build.py).
      var work = $("[data-finder-work]", finder);
      if (work) {
        var image = $("[data-finder-image]", finder);
        image.src = project.image; image.alt = project.alt;
        work.href = project.href;
        $("[data-finder-project]", finder).textContent = project.project;
        $("[data-finder-kind]", finder).textContent = project.kind;
      }
      finderContinue.href = "/services?type=" + key + "&from=finder#enquire";
      if (finderStatus) finderStatus.textContent = (announce ? "Starting point updated: " : "Starting point: ") + project.title + ".";
    }
    choices.forEach(function (choice) { choice.addEventListener("change", function () { paintProject(true); }); });
    finderContinue.addEventListener("click", function (event) {
      try {
        sessionStorage.setItem(BRIEF_KEY, JSON.stringify({ version: 1, type: chosenProject(),
          timeline: finderTime.value, note: finderNote.value.trim().slice(0, 1200) }));
      } catch (err) {
        // Never hand off a stale saved draft after a failed write.
        event.preventDefault();
        if (finderStatus) finderStatus.textContent = "This browser could not carry your brief. Copy your note and timeline, then use the direct enquiry link below.";
      }
    });
    window.addEventListener("pageshow", function () { paintProject(false); });
    paintProject(false);
  }

  /* ---------- Direction lab: one concept, three ways to tell its story ----------
     Local UI only. A direction enters the optional brief only when the visitor chooses
     "Use this direction"; it is sent through the existing enquiry flow. */
  var directionLab = $("[data-direction-lab]");
  if (directionLab) {
    var directions = {
      editorial: { name: "Editorial", description: "Expressive type, generous space and a story worth slowing down for." },
      bold: { name: "Bold", description: "Big statements, strong contrast and a confident first impression." },
      minimal: { name: "Minimal", description: "A quieter interface that puts the idea and the next step first." }
    };
    var labDirections = $$("[data-lab-direction]", directionLab);
    var labDevices = $$("[data-lab-device]", directionLab);
    var labStatus = $("[data-lab-status]", directionLab);
    function labChoice(inputs, fallback) {
      var input = inputs.filter(function (item) { return item.checked; })[0];
      return input ? input.value : fallback;
    }
    function paintLab(announce) {
      var key = labChoice(labDirections, "editorial");
      if (!Object.prototype.hasOwnProperty.call(directions, key)) key = "editorial";
      var device = labChoice(labDevices, "desktop") === "mobile" ? "mobile" : "desktop";
      directionLab.dataset.direction = key;
      directionLab.dataset.device = device;
      $("[data-lab-direction-name]", directionLab).textContent = directions[key].name;
      $("[data-lab-description]", directionLab).textContent = directions[key].description;
      if (announce && labStatus) {
        labStatus.classList.add("visually-hidden");
        labStatus.textContent = directions[key].name + " direction, " + (device === "mobile" ? "phone" : "desktop") + " preview.";
      }
      invalidateLayout();
    }
    labDirections.concat(labDevices).forEach(function (input) {
      input.addEventListener("change", function () { paintLab(true); });
    });
    var useDirection = $("[data-lab-use]", directionLab);
    if (useDirection && finder) useDirection.addEventListener("click", function (event) {
      var name = directions[directionLab.dataset.direction].name;
      var line = "Visual direction: " + name + " (Merova direction lab).";
      // Replace only this tool's own line. Keep the visitor's writing intact.
      var note = finderNote.value.replace(/(?:\r?\n){0,2}^Visual direction: (?:Editorial|Bold|Minimal) \(Merova direction lab\)\.$/gm, "");
      var next = note + (note ? "\n\n" : "") + line;
      if (next.length > finderNote.maxLength) {
        event.preventDefault();
        labStatus.classList.remove("visually-hidden");
        labStatus.textContent = "Your brief is full. Shorten the note in the project finder before adding a direction.";
        invalidateLayout();
        return;
      }
      finderNote.value = next;
      labStatus.classList.add("visually-hidden");
      finderNote.dispatchEvent(new Event("input", { bubbles: true }));
      if (finderStatus) finderStatus.textContent = name + " direction added to your optional note. Choose a starting point below.";
      var target = $(".finder__title", finder);
      if (target) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
      invalidateLayout();
    });
    window.addEventListener("pageshow", function () { paintLab(false); });
    paintLab(false);
  }
  var enquiry = $("#enquiry-form");
  if (enquiry) {
    var finderParams = new URLSearchParams(window.location.search);
    var projectBrief = finderParams.get("from") === "finder" ? readProjectBrief() : null;
    if (projectBrief && projectBrief.type === finderParams.get("type")) {
      var projectGoal = PROJECTS[projectBrief.type].goal;
      var enquiryType = $("#q-type", enquiry);
      enquiryType.value = projectBrief.type;
      $("#q-time", enquiry).value = projectBrief.timeline;
      var idea = $("#q-idea", enquiry);
      if (!idea.value && projectBrief.note) idea.value = projectBrief.note;
      var goalInput = $("[data-enquiry-goal]", enquiry);
      goalInput.value = projectGoal; goalInput.disabled = false;
      var enquirySummary = $("[data-enquiry-summary]", enquiry);
      function paintEnquiryBrief() {
        var key = enquiryType.value;
        var project = Object.prototype.hasOwnProperty.call(PROJECTS, key) ? PROJECTS[key] : null;
        goalInput.value = project ? project.goal : "Not sure yet";
        enquirySummary.textContent = project ? project.goal + ". " + project.title + "." : "Still deciding. We'll find the right starting point together.";
      }
      enquiryType.addEventListener("change", paintEnquiryBrief);
      paintEnquiryBrief();
      $("[data-enquiry-brief]", enquiry).hidden = false;
    }
  }

  $$("form[data-form]").forEach(function (form) {
    var kind = form.getAttribute("data-form");
    var msg = MESSAGES[kind] || MESSAGES.contact;
    var status = $(".form-status", form);
    var button = $("button[type=submit]", form);
    var show = function (state, text) { if (status) { status.dataset.state = state; status.textContent = text; } };

    $$("input, textarea, select", form).forEach(function (f) {
      f.addEventListener("input", function () { if (f.getAttribute("aria-invalid")) { f.removeAttribute("aria-invalid"); show("", ""); } });
    });

    var check = function () {
      var fields = $$("[required]", form);
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i], v = f.value.trim();
        var bad = !v || (f.type === "email" && !EMAIL.test(v));
        if (bad) {
          f.setAttribute("aria-invalid", "true");
          f.focus();
          var name = (f.labels && f.labels[0] ? f.labels[0].textContent : "this field").toLowerCase();
          show("error", f.type === "email" && v ? "That email address doesn't look right." : "Please fill in " + name + ".");
          return false;
        }
      }
      return true;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!WEB3FORMS_KEY || WEB3FORMS_KEY.indexOf("YOUR_") === 0) { show("error", "This form isn't connected yet. Please email hello@merova.app instead."); return; }
      if (!check()) return;
      var data = new FormData(form);
      data.append("access_key", WEB3FORMS_KEY);
      if (kind === "waitlist") {
        var picks = data.getAll("interest");
        if (!picks.length) { show("error", "Pick at least one launch to hear about."); return; }
        data.delete("interest");
        data.append("interest", picks.join(", "));
      }
      var original = button.innerHTML;
      button.disabled = true;
      button.textContent = "Sending…";
      show("", "");
      fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: data })
        .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
        .then(function (r) {
          if (r.ok && r.body && r.body.success) {
            form.reset();
            if (kind === "enquiry") {
              forgetProjectBrief();
              var briefNotice = $("[data-enquiry-brief]", form), briefGoal = $("[data-enquiry-goal]", form);
              if (briefNotice) briefNotice.hidden = true;
              if (briefGoal) { briefGoal.value = ""; briefGoal.disabled = true; }
            }
            show("ok", msg.ok);
          } else { show("error", msg.fail); }
        })
        .catch(function () { show("error", msg.fail); })
        .then(function () { button.disabled = false; button.innerHTML = original; });
    });
  });
})();
