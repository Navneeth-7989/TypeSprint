/* =========================================================
   SPRINT · Authentication (compat / classic script)
   Two buttons shown immediately (no loader). Clicking either
   asks for a display name, THEN signs in:
     - Play as Guest        -> anonymous sign-in
     - Continue with Google -> Google popup
   Publishes the user on window.SPRINT_USER + fires "sprint:auth".
   ========================================================= */
(function () {
  "use strict";

  var auth = window.SprintAuth; // set by firebase-init.js
  var $ = function (s) { return document.querySelector(s); };

  var gate      = $("#auth-gate");
  var actions   = $("#auth-actions");
  var guestForm = $("#guest-form");
  var formLabel = $("#guest-form-label");
  var guestName = $("#guest-name-input");
  var goBtn     = $("#btn-guest-go");
  var errorEl   = $("#auth-error");

  var chip       = $("#user-chip");
  var chipName   = $("#user-name");
  var chipAvatar = $("#user-avatar");

  var pendingMethod = null; // "guest" | "google"

  var ADJ = ["Swift", "Turbo", "Rapid", "Nimble", "Blitz", "Zippy", "Flash", "Vivid", "Sonic", "Quill"];
  var NOUN = ["Typer", "Racer", "Sprinter", "Falcon", "Comet", "Dash", "Bolt", "Arrow", "Pilot", "Ace"];
  function randomName() {
    return ADJ[Math.floor(Math.random() * ADJ.length)] + NOUN[Math.floor(Math.random() * NOUN.length)];
  }
  function hashHue(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
  function clearError() { errorEl.hidden = true; }
  function setBusy(busy) {
    guestForm.querySelectorAll("button, input").forEach(function (b) { b.disabled = busy; });
    goBtn.textContent = busy ? "Signing in…" : "Enter";
  }

  function openNameForm(method) {
    if (!auth) { showError("Firebase isn't ready yet. Reload the page."); return; }
    pendingMethod = method;
    clearError();
    actions.hidden = true;
    guestForm.hidden = false;
    formLabel.textContent = method === "google"
      ? "Pick the name to show on the track"
      : "Choose a display name";
    guestName.value = localStorage.getItem("sprint_name") || "";
    setBusy(false);
    guestName.focus();
    guestName.select();
  }

  function closeNameForm() {
    pendingMethod = null;
    guestForm.hidden = true;
    actions.hidden = false;
    clearError();
  }

  function publishUser(user, nameOverride) {
    var name = (nameOverride && nameOverride.trim()) ||
               (user.displayName && user.displayName.trim()) ||
               localStorage.getItem("sprint_name") || randomName();
    var u = {
      uid: user.uid,
      name: name.slice(0, 16),
      isGuest: !!user.isAnonymous,
      photoURL: user.photoURL || null,
    };
    window.SPRINT_USER = u;
    localStorage.setItem("sprint_name", u.name);

    chipName.textContent = u.name;
    // Custom avatar tinted from the username (never the Google photo).
    var hue = hashHue(u.name);
    chipAvatar.style.background =
      "linear-gradient(135deg, hsl(" + hue + " 78% 60%), hsl(" + ((hue + 40) % 360) + " 78% 48%))";
    chip.hidden = false;

    gate.classList.add("is-hidden");
    document.dispatchEvent(new CustomEvent("sprint:auth", { detail: u }));
  }

  function submitName() {
    var clean = (guestName.value || "").trim() || randomName();
    if (clean.length < 2) { showError("Please enter a name with at least 2 characters."); return; }
    var finalName = clean.slice(0, 16);
    localStorage.setItem("sprint_name", finalName);
    clearError();
    setBusy(true);

    var flow;
    if (pendingMethod === "google") {
      flow = auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } else {
      flow = auth.signInAnonymously();
    }
    flow.then(function (cred) {
      var user = cred.user;
      return user.updateProfile({ displayName: finalName })
        .catch(function () {})
        .then(function () { publishUser(user, finalName); });
    }).catch(function (e) {
      console.error("[auth]", e);
      setBusy(false);
      handleError(e);
    });
  }

  function handleError(e) {
    var code = e && e.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    if (code === "auth/operation-not-allowed") {
      showError("This sign-in method isn't enabled. In Firebase Console → Authentication → Sign-in method, enable " +
        (pendingMethod === "google" ? "Google." : "Anonymous."));
    } else if (code === "auth/unauthorized-domain") {
      showError("This domain isn't authorized. Add it under Authentication → Settings → Authorized domains.");
    } else if (code === "auth/popup-blocked") {
      showError("Your browser blocked the sign-in popup. Allow popups for this site and try again.");
    } else {
      showError("Sign-in failed" + (code ? " (" + code + ")" : "") + ". Please try again.");
    }
  }

  /* ---- wiring ---- */
  var bg = $("#btn-guest"), bgo = $("#btn-google"), bb = $("#btn-guest-back"), bso = $("#btn-signout");
  if (bg)  bg.addEventListener("click", function () { openNameForm("guest"); });
  if (bgo) bgo.addEventListener("click", function () { openNameForm("google"); });
  if (bb)  bb.addEventListener("click", closeNameForm);
  if (guestForm) guestForm.addEventListener("submit", function (e) { e.preventDefault(); submitName(); });
  if (guestName) guestName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); submitName(); }
  });
  if (bso) bso.addEventListener("click", function () {
    (auth ? auth.signOut() : Promise.resolve()).then(function () { location.reload(); }, function () { location.reload(); });
  });

  /* ---- auto-continue a returning session (never blocks the buttons) ---- */
  if (auth) {
    auth.onAuthStateChanged(function (user) {
      if (user && !window.SPRINT_USER && guestForm.hidden) {
        publishUser(user, localStorage.getItem("sprint_name") || user.displayName);
      }
    });
  }
})();
