/* Merova: small progressive enhancements. Every page works without this file;
   it adds the mobile menu, form sending, copy buttons and a little motion. */

/* ------------------------------------------------------------------------
   SETTINGS: the only line you need to edit.
   Free key from https://web3forms.com (sign up with hello@merova.app).
   The key is meant to be public, so it's safe here. Until it's set, the
   forms ask people to email hello@merova.app instead.
   ------------------------------------------------------------------------ */
var WEB3FORMS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";

(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

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

  /* ---------- Header gets a firmer background once you scroll ---------- */
  var header = document.querySelector(".site-header");
  var onScrollHeader = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  /* ---------- Hero: the Fold answers the pointer and opens as you scroll ---------- */
  var fold = document.querySelector(".fold");
  var hero = document.querySelector(".hero");
  var tilt = 0, open = 0, progress = 0, ticking = false;
  var paintFold = function () {
    ticking = false;
    if (!fold) return;
    fold.style.setProperty("--tilt", tilt.toFixed(3));
    fold.style.setProperty("--open", open.toFixed(2));
    fold.style.setProperty("--p", progress.toFixed(3));
  };
  var queueFold = function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(paintFold); }
  };
  if (fold && hero && !reduceMotion) {
    if (finePointer) {
      hero.addEventListener("pointermove", function (e) {
        var r = fold.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
        tilt = Math.max(-1, Math.min(1, x));
        queueFold();
      });
      hero.addEventListener("pointerleave", function () { tilt = 0; queueFold(); });
    }
  }
  var onScrollFold = function () {
    if (!fold || !hero || reduceMotion) return;
    var h = hero.offsetHeight || 1;
    progress = Math.max(0, Math.min(1, window.scrollY / (h * 0.8)));
    open = progress * 9; // planes drift up to 9 units apart
    queueFold();
  };

  var onScroll = function () { onScrollHeader(); onScrollFold(); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Merova Fit phone demo plays once when it comes into view ---------- */
  var fitCard = document.querySelector(".app-fit");
  if (fitCard && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { fitCard.classList.add("is-live"); io.disconnect(); }
      });
    }, { threshold: 0.45 });
    io.observe(fitCard);
  } else if (fitCard) {
    fitCard.classList.add("is-live");
  }

  /* ---------- Copy buttons (contact page) ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { window.location.href = "mailto:" + text; });
      } else {
        window.location.href = "mailto:" + text;
      }
    });
  });

  /* ---------- Policy pages: highlight the section you're reading ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var current = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (current) current.classList.remove("is-active");
          current = byId[en.target.id];
          if (current) current.classList.add("is-active");
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

  document.querySelectorAll("form[data-form]").forEach(function (form) {
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

      var label = button.textContent;
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
          button.textContent = label;
        });
    });
  });
})();
