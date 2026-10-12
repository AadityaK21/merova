/* Merova — small helpers. The site works without this file;
   it only adds the mobile menu and a nicer contact-form submit. */
(function () {
  "use strict";

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

  /* ---------- Contact form (Web3Forms) ---------- */
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("form-status");
  var button = form.querySelector("button[type=submit]");

  function show(state, text) {
    status.dataset.state = state;
    status.textContent = text;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var key = form.querySelector("input[name=access_key]").value;
    if (!key || key.indexOf("YOUR_") === 0) {
      show("error", "The form isn't connected yet. Please email hello@merova.app instead.");
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";
    show("", "");

    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        if (r.ok && r.data && r.data.success) {
          form.reset();
          show("ok", "Message sent. You'll get a reply at the email you entered.");
        } else {
          show("error", "Your message didn't send. Try again, or email hello@merova.app.");
        }
      })
      .catch(function () {
        show("error", "Your message didn't send. Check your connection and try again, or email hello@merova.app.");
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
