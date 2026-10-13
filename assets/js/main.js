/* Merova: small progressive enhancements. Every page works without this file;
   it adds the mobile menu, form sending, copy buttons, the cursor and the motion. */

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
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 800px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- Header firms up once you scroll ---------- */
  var header = document.querySelector(".site-header");
  var headerBrand = header && header.querySelector(".brand");

  /* ---------- Hero: the Fold answers the pointer and becomes the logo as you scroll ---------- */
  var fold = document.querySelector(".hero .fold");
  var hero = document.querySelector(".hero");
  var figure = fold && fold.closest(".hero__figure");
  var tx = 0, ty = 0, p = 0, docked = false, foldQueued = false;
  var paintFold = function () {
    foldQueued = false;
    fold.style.setProperty("--tx", tx.toFixed(3));
    fold.style.setProperty("--ty", ty.toFixed(3));
    fold.style.setProperty("--p", p.toFixed(3));
  };
  var queueFold = function () {
    if (fold && !foldQueued) { foldQueued = true; window.requestAnimationFrame(paintFold); }
  };
  if (fold && hero && !reduceMotion) {
    if (finePointer) {
      hero.addEventListener("pointermove", function (e) {
        var r = fold.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        if (figure) figure.classList.add("is-live");
        queueFold();
      });
      hero.addEventListener("pointerleave", function () {
        tx = 0; ty = 0;
        if (figure) figure.classList.remove("is-live");
        queueFold();
      });
    }
  }

  var onScroll = function () {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (fold && hero && !reduceMotion) {
      p = Math.max(0, Math.min(1, y / (hero.offsetHeight * 0.75)));
      queueFold();
      // as the drawing finishes turning into the logo, the header logo settles into place
      if (headerBrand && p > 0.85 && !docked) {
        docked = true;
        headerBrand.classList.remove("is-docking");
        void headerBrand.offsetWidth;
        headerBrand.classList.add("is-docking");
      } else if (p < 0.4) {
        docked = false;
      }
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Merova Fit showcase: real screens, tabs, tilt, one short tour ---------- */
  $$("[data-showcase]").forEach(function (box) {
    var screens = $$(".phone2__screen", box);
    var tabs = $$(".showcase__tab", box);
    var phone = box.querySelector(".phone2");
    var frame = box.querySelector(".phone2__frame");
    var order = screens.map(function (s) { return s.getAttribute("data-screen"); });
    var current = 0, tour = null, touched = false;

    var show = function (i) {
      current = (i + screens.length) % screens.length;
      screens.forEach(function (s, k) {
        var on = k === current;
        s.classList.toggle("is-on", on);
        if (on) { s.removeAttribute("aria-hidden"); s.loading = "eager"; } else { s.setAttribute("aria-hidden", "true"); }
      });
      tabs.forEach(function (t) {
        t.setAttribute("aria-pressed", t.getAttribute("data-screen") === order[current] ? "true" : "false");
      });
    };
    var stopTour = function () { touched = true; if (tour) { clearTimeout(tour); tour = null; } };

    tabs.forEach(function (t) {
      t.addEventListener("click", function () { stopTour(); show(order.indexOf(t.getAttribute("data-screen"))); });
    });
    if (phone) {
      phone.addEventListener("click", function () { stopTour(); show(current + 1); });
    }
    if (frame && finePointer && !reduceMotion) {
      phone.addEventListener("pointermove", function (e) {
        var r = phone.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        frame.style.setProperty("--rx", (x * 12).toFixed(2));
        frame.style.setProperty("--ry", (-y * 9).toFixed(2));
      });
      phone.addEventListener("pointerleave", function () {
        frame.style.setProperty("--rx", "0");
        frame.style.setProperty("--ry", "0");
      });
    }
    // fetch the other screens a little before the phone scrolls into view, so switching never flashes
    if (hasIO) {
      var near = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        near.disconnect();
        screens.forEach(function (s) { s.loading = "eager"; });
      }, { rootMargin: "400px 0px" });
      near.observe(box);
    }
    // a single short tour the first time it comes into view (not on reduced motion)
    if (hasIO && !reduceMotion && screens.length > 1) {
      var seen = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        var step = 0;
        var next = function () {
          if (touched) return;
          step += 1;
          show(step % screens.length);
          if (step < screens.length) tour = setTimeout(next, 2400);
        };
        tour = setTimeout(next, 2200);
      }, { threshold: 0.6 });
      seen.observe(box);
    }
  });

  /* ---------- Merova Fit card: a soft light follows the pointer ---------- */
  var fitCard = document.querySelector(".app-fit");
  if (fitCard && finePointer && !reduceMotion) {
    fitCard.addEventListener("pointermove", function (e) {
      var r = fitCard.getBoundingClientRect();
      fitCard.style.setProperty("--mx", (e.clientX - r.left) + "px");
      fitCard.style.setProperty("--my", (e.clientY - r.top) + "px");
      fitCard.classList.add("is-lit");
    });
    fitCard.addEventListener("pointerleave", function () { fitCard.classList.remove("is-lit"); });
  }

  /* ---------- Scroll story: things ease in, headings rise, rules draw ---------- */
  var REVEAL = ".intro__head > p, .cell, .apps__head > p, .app-fit, .app-next, .cta__copy > p, .cta__copy .actions, .waitlist, " +
    ".faq__head > p, .faq__item, .split, .mailbox, .business, .form, .feat, .how li, .logo-tile, .swatch, .type, " +
    ".rules > div, .brand-mark__copy > p, .fit-cta > p, .fit-cta .actions, .feats__more";
  var HEADS = "main .h2";
  var LINES = ".cells, .faq__list, .how, .list-lines, .types, .facts, .mailboxes, .app-next__spec, .band";
  var MARKS = ".eyebrow, .frame--marks";
  if (hasIO && !reduceMotion) {
    var vh = window.innerHeight;
    var below = function (el) { return el.getBoundingClientRect().top > vh * 0.92; };
    var watch = [];
    var tag = function (sel, cls) {
      $$(sel).forEach(function (el) {
        if (cls) el.classList.add(cls);
        if (below(el)) watch.push(el); else el.classList.add("is-in");
      });
    };
    tag(REVEAL, "reveal");
    tag(HEADS, "rv-head");
    tag(LINES, "rv-line");
    tag(MARKS, "");
    var seenIO = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target.classList.contains("reveal")) {
          en.target.style.setProperty("--d", (Math.min(batch++, 4) * 0.07) + "s");
        }
        en.target.classList.add("is-in");
        seenIO.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    watch.forEach(function (el) { seenIO.observe(el); });
    // never leave anything hidden: printing, or jumping straight to an anchor further down
    var showAll = function () { watch.forEach(function (el) { el.classList.add("is-in"); }); };
    window.addEventListener("beforeprint", showAll);
    setTimeout(function () {
      if (location.hash) {
        watch.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in"); });
      }
    }, 300);
  } else {
    $$(".app-next").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Back to top ---------- */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    var onScrollTop = function () { toTop.classList.toggle("is-on", window.scrollY > window.innerHeight * 1.5); };
    window.addEventListener("scroll", onScrollTop, { passive: true });
    onScrollTop();
    toTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var main = document.getElementById("main");
      if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
    });
  }

  /* ---------- Copy buttons (contact page emails, brand page colours) ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 1600);
      };
      var fallback = function () {
        if (text.indexOf("@") > 0) { window.location.href = "mailto:" + text; }
        else { btn.textContent = text; }
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
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
        if (en.isIntersecting) {
          if (currentToc) currentToc.classList.remove("is-active");
          currentToc = byId[en.target.id];
          if (currentToc) currentToc.classList.add("is-active");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ---------- Forms (contact + waitlist) via Web3Forms ---------- */
  var MESSAGES = {
    contact: {
      ok: "Message sent. You'll get a reply at the email you entered.",
      fail: "Your message didn't send. Try again, or email hello@merova.app."
    },
    waitlist: {
      ok: "You're on the list. We'll email you when it's out.",
      fail: "That didn't go through. Try again, or email hello@merova.app."
    }
  };

  $$("form[data-form]").forEach(function (form) {
    var kind = form.getAttribute("data-form");
    var msg = MESSAGES[kind] || MESSAGES.contact;
    var status = form.querySelector(".form-status");
    var button = form.querySelector("button[type=submit]");

    var show = function (state, text) {
      if (!status) return;
      status.dataset.state = state;
      status.textContent = text;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!WEB3FORMS_KEY || WEB3FORMS_KEY.indexOf("YOUR_") === 0) {
        show("error", "This form isn't connected yet. Please email hello@merova.app instead.");
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
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
        .then(function (res) {
          return res.json().then(function (body) { return { ok: res.ok, body: body }; });
        })
        .then(function (r) {
          if (r.ok && r.body && r.body.success) {
            form.reset();
            show("ok", msg.ok);
          } else {
            show("error", msg.fail);
          }
        })
        .catch(function () { show("error", msg.fail); })
        .then(function () {
          button.disabled = false;
          button.innerHTML = original;
        });
    });
  });

  /* ---------- Custom cursor: a dot, a ring that trails it, and a label on things you can open ----------
     Only for a real mouse. Touch screens and keyboards keep the normal behaviour; form fields
     keep the normal text cursor. The ring only animates while it is catching up. */
  if (finePointer) {
    var ring = document.createElement("div");
    var dot = document.createElement("div");
    ring.className = "cursor__ring";
    dot.className = "cursor__dot";
    ring.setAttribute("aria-hidden", "true");
    dot.setAttribute("aria-hidden", "true");
    var shape = document.createElement("div");
    shape.className = "cursor__shape";
    var label = document.createElement("span");
    label.className = "cursor__label";
    shape.appendChild(label);
    ring.appendChild(shape);
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    doc.classList.add("has-cursor", "cur-hidden");

    var mx = -100, my = -100, rx = -100, ry = -100, raf = 0;
    var ease = reduceMotion ? 1 : 0.2;
    var place = function (el, x, y) { el.style.transform = "translate3d(" + x + "px," + y + "px,0)"; };
    var loop = function () {
      rx += (mx - rx) * ease;
      ry += (my - ry) * ease;
      place(ring, rx, ry);
      if (Math.abs(mx - rx) > 0.15 || Math.abs(my - ry) > 0.15) raf = requestAnimationFrame(loop);
      else { raf = 0; place(ring, mx, my); }
    };

    var PILL = ".btn, [data-cursor], .copy, .showcase__tab, .to-top, .faq__item summary";
    var LINK = "a, button, summary, label, select, [role='button']";
    var FIELD = "input:not([type='checkbox']):not([type='radio']):not([type='submit']), textarea, select, [contenteditable]";
    var labelFor = function (el) {
      if (el.hasAttribute("data-cursor")) return el.getAttribute("data-cursor");
      if (el.classList.contains("copy")) return "Copy";
      if (el.classList.contains("showcase__tab")) return "View";
      if (el.classList.contains("to-top")) return "Top ↑";
      if (el.tagName === "SUMMARY") return el.parentElement.open ? "Close" : "Open";
      if (el.tagName === "BUTTON") return el.type === "submit" ? "Send" : "Open";
      var href = el.getAttribute("href") || "";
      if (el.hasAttribute("download")) return "Download ↓";
      if (href.charAt(0) === "#") return "Jump ↓";
      if (href.indexOf("mailto:") === 0) return "Email";
      if (/^https?:/.test(href) && href.indexOf(location.host) === -1) return "Open ↗";
      return "View";
    };
    var setState = function (target) {
      var cls = doc.classList;
      if (!target || !target.closest) return;
      if (target.closest(FIELD)) { cls.add("cur-hidden"); return; }
      cls.remove("cur-hidden");
      var pill = target.closest(PILL);
      if (pill) {
        label.textContent = labelFor(pill);
        ring.style.setProperty("--pill-w", (label.scrollWidth + 30) + "px");
        // dark pill on light surfaces (and on bone or sage buttons), light pill on dark ones
        var theme = pill.closest(".app-fit, .s-light, .s-dark, .site-header");
        var onLight = !!theme && theme.classList.contains("s-light");
        var filled = pill.classList.contains("btn--primary") || pill.classList.contains("btn--fit");
        cls.toggle("cur-light", onLight !== filled);
        cls.add("cur-pill");
        cls.remove("cur-link");
        return;
      }
      cls.remove("cur-pill", "cur-light");
      cls.toggle("cur-link", !!target.closest(LINK));
    };

    document.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      place(dot, mx, my);
      if (doc.classList.contains("cur-hidden") && !e.target.closest(FIELD)) {
        doc.classList.remove("cur-hidden");
        if (rx < 0) { rx = mx; ry = my; }
      }
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener("pointerover", function (e) { if (!e.pointerType || e.pointerType === "mouse") setState(e.target); });
    document.addEventListener("pointerdown", function () { doc.classList.add("cur-down"); });
    document.addEventListener("pointerup", function () { doc.classList.remove("cur-down"); });
    document.addEventListener("click", function (e) {
      // labels like OPEN/CLOSE on the FAQ change after a click
      setTimeout(function () { setState(e.target); }, 0);
    });
    document.documentElement.addEventListener("mouseleave", function () { doc.classList.add("cur-hidden"); });
    window.addEventListener("blur", function () { doc.classList.add("cur-hidden"); });
  }
})();
