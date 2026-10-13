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

  /* ---------- The menu: a full-height panel from the right ---------- */
  var menu = document.getElementById("menu");
  var opener = $("[data-menu-open]");
  if (menu && opener) {
    var panel = $(".menu__panel", menu);
    var closeTimer = 0, lastFocus = null;
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
      var first = $(".menu__list a", panel);
      setTimeout(function () { (first || panel).focus(); }, reduceMotion ? 0 : 120);
    };
    var closeMenu = function (restore) {
      if (!menu.classList.contains("is-open")) return;
      menu.classList.remove("is-open");
      menu.classList.add("is-closing");
      opener.setAttribute("aria-expanded", "false");
      setInert(false);
      closeTimer = setTimeout(function () {
        menu.hidden = true;
        menu.classList.remove("is-closing");
        doc.classList.remove("menu-open");
      }, reduceMotion ? 0 : 560);
      if (restore !== false) (lastFocus && lastFocus.focus ? lastFocus : opener).focus();
    };
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
      if (e.persisted) { menu.classList.remove("is-open", "is-closing"); menu.hidden = true; doc.classList.remove("menu-open"); opener.setAttribute("aria-expanded", "false"); }
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
    var drag = null, tween = null, spin = null, aligned = false, idleText = finePointer ? "Drag to turn" : "Swipe to turn";

    // light comes from the front left; a sheet facing it is brighter
    var IV = [246, 244, 238];
    var tone = function (k) { return "rgb(" + IV.map(function (c) { return Math.round(c * k); }).join(",") + ")"; };
    var lightFor = function (ry) { return 0.55 + 0.45 * Math.max(0, Math.cos((ry + 35) * Math.PI / 180)); };

    renderFold = function () {
      var p = foldScroll;
      var ry = st.ry * (1 - p), rx = st.rx * (1 - p);
      var I = lightFor(ry);
      obj.style.setProperty("--ry", ry.toFixed(2));
      obj.style.setProperty("--rx", rx.toFixed(2));
      obj.style.setProperty("--d", st.d.toFixed(1));
      obj.style.setProperty("--s", (1 - p * 0.12).toFixed(3));
      ground.style.setProperty("--ry", ry.toFixed(2));
      ground.style.setProperty("--s", (1 - p * 0.12).toFixed(3));
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
      }
      stateOut.textContent = aligned ? "Lined up: the Merova mark" : (drag ? "Turning" : idleText);
      scene.setAttribute("aria-valuenow", String(Math.round(st.ry)));
      scene.setAttribute("aria-valuetext", aligned ? "Lined up into the Merova logo" : "Turned " + Math.abs(Math.round(st.ry)) + " degrees " + (st.ry < 0 ? "left" : "right"));
    };

    var stopMotion = function () {
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
      st.ry = -66; st.d = 10; st.rx = 14;
      renderFold();
      setTimeout(function () { animateTo({ ry: REST.ry, rx: REST.rx, d: DEPTH }, 1500); }, 250);
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

  /* ---------- Scroll: header, the Fold settling into the logo, the header logo docking ---------- */
  var docked = false, scrollQueued = false;
  var onScroll = function () {
    scrollQueued = false;
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (fold && hero && !reduceMotion) {
      var p = clamp(y / (hero.offsetHeight * 0.7), 0, 1);
      if (p !== foldScroll && (p < 1 || foldScroll < 1)) { foldScroll = p; renderFold(); }
      if (headerBrand && p > 0.85 && !docked) {
        docked = true;
        headerBrand.classList.remove("is-docking");
        void headerBrand.offsetWidth;
        headerBrand.classList.add("is-docking");
      } else if (p < 0.4) { docked = false; }
    }
  };
  window.addEventListener("scroll", function () {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

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
    var lit = -1, active = false, queued = false;
    var paintWords = function () {
      queued = false;
      var r = statement.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
      var n = Math.round(p * words.length);
      if (n !== lit) {
        words.forEach(function (w, i) { w.classList.toggle("on", i < n); });
        lit = n;
      }
    };
    var queueWords = function () { if (active && !queued) { queued = true; requestAnimationFrame(paintWords); } };
    if (hasIO) {
      new IntersectionObserver(function (en) { active = en[0].isIntersecting; if (active) queueWords(); }).observe(statement);
    } else { active = true; }
    window.addEventListener("scroll", queueWords, { passive: true });
    paintWords();
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

  /* ---------- Chapter indicator ---------- */
  var chapter = $(".chapter");
  var chapters = $$("[data-chapter]");
  if (chapter && chapters.length && hasIO) {
    var cn = $(".chapter__n", chapter), cname = $(".chapter__name", chapter);
    var inFirst = true, inFoot = false;
    var sync = function () { chapter.classList.toggle("is-hidden", inFirst || inFoot); };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target.getAttribute("data-chapter");
        cn.textContent = n;
        cname.textContent = en.target.getAttribute("data-chapter-name");
        inFirst = n === "01";
        sync();
      });
    }, { rootMargin: "-50% 0px -50% 0px" });
    chapters.forEach(function (c) { cio.observe(c); });
    var foot = $(".site-footer");
    if (foot) new IntersectionObserver(function (en) { inFoot = en[0].isIntersecting; sync(); }).observe(foot);
    sync();
  }

  /* ---------- Work cards and case-study frames open up as they scroll in ---------- */
  if (hasIO && !reduceMotion) {
    var vhR = window.innerHeight;
    var reveal = $$(".wcard, .case__frame, .case__hero, .wrow").filter(function (el) { return el.getBoundingClientRect().top > vhR * 0.92; });
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); rio.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveal.forEach(function (el) { el.classList.add("rv-box"); rio.observe(el); });
    window.addEventListener("beforeprint", function () { reveal.forEach(function (el) { el.classList.add("is-in"); }); });
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

  /* ---------- Section headings rise out of a mask (headings only) ---------- */
  if (hasIO && !reduceMotion) {
    var vh0 = window.innerHeight;
    var heads = $$("main .h2").filter(function (h) { return h.getBoundingClientRect().top > vh0 * 0.9; });
    var hio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); hio.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    heads.forEach(function (h) { h.classList.add("rv"); hio.observe(h); });
    window.addEventListener("beforeprint", function () { heads.forEach(function (h) { h.classList.add("is-in"); }); });
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
    waitlist: { ok: "You're on the list. We'll email you when it's out.", fail: "That didn't go through. Try again, or email hello@merova.app." }
  };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  $$("form[data-form]").forEach(function (form) {
    var kind = form.getAttribute("data-form");
    var msg = MESSAGES[kind] || MESSAGES.contact;
    var status = $(".form-status", form);
    var button = $("button[type=submit]", form);
    var show = function (state, text) { if (status) { status.dataset.state = state; status.textContent = text; } };

    $$("input, textarea", form).forEach(function (f) {
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
          if (r.ok && r.body && r.body.success) { form.reset(); show("ok", msg.ok); } else { show("error", msg.fail); }
        })
        .catch(function () { show("error", msg.fail); })
        .then(function () { button.disabled = false; button.innerHTML = original; });
    });
  });
})();
