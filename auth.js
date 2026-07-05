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

  // Unique-username step (Google only)
  var userForm   = $("#username-form");
  var userInput  = $("#username-input");
  var userHint   = $("#username-hint");
  var userError  = $("#username-error");
  var userGo     = $("#btn-username-go");

  // Sign-out confirmation
  var signoutModal   = $("#signout-modal");
  var signoutConfirm = $("#btn-signout-confirm");
  var signoutCancel  = $("#btn-signout-cancel");

  var HANDLE_RE = /^[a-z0-9_]{3,16}$/;
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

  // Build + expose the user (updates the chip) but does NOT enter the app yet.
  function setUser(user, nameOverride) {
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
    return u;
  }

  // Drop the gate and let the rest of the app boot.
  function enterApp(u) {
    gate.classList.add("is-hidden");
    document.dispatchEvent(new CustomEvent("sprint:auth", { detail: u }));
  }

  function whenNet(fn) {
    if (window.SprintNet) fn();
    else document.addEventListener("sprint:net-ready", fn, { once: true });
  }

  // Finish sign-in. Guests go straight in; Google accounts must own a unique
  // @username first (claimed once, then reused everywhere — incl. Friends).
  function proceed(user, nameOverride) {
    var u = setUser(user, nameOverride);
    if (u.isGuest) { enterApp(u); return; }
    whenNet(function () {
      window.SprintNet.getMyProfile().then(function (p) {
        if (p && p.username) enterApp(u);
        else showUsernameStep();
      }).catch(function () { showUsernameStep(); });
    });
  }

  /* ---- unique @username step (Google accounts only) ---- */
  var uCheckTimer = null;

  function setUserHint(msg, tone) {
    userHint.textContent = msg;
    userHint.classList.remove("is-ok", "is-bad");
    if (tone) userHint.classList.add(tone === "ok" ? "is-ok" : "is-bad");
  }

  function showUsernameStep() {
    actions.hidden = true;
    guestForm.hidden = true;
    userForm.hidden = false;
    userError.hidden = true;
    userGo.disabled = false; userGo.textContent = "Continue";
    userInput.value = "";
    setUserHint("3–16 characters · letters, numbers, underscore", "");
    userInput.focus();
  }

  function onUsernameInput() {
    var v = (userInput.value || "").trim().toLowerCase();
    userError.hidden = true;
    clearTimeout(uCheckTimer);
    if (!v) { setUserHint("3–16 characters · letters, numbers, underscore", ""); return; }
    if (!HANDLE_RE.test(v)) { setUserHint("Only letters, numbers, underscore (3–16).", "bad"); return; }
    setUserHint("Checking availability…", "");
    uCheckTimer = setTimeout(function () {
      window.SprintNet.checkUsername(v).then(function (free) {
        if ((userInput.value || "").trim().toLowerCase() !== v) return; // input changed
        if (free) setUserHint("@" + v + " is available!", "ok");
        else setUserHint("@" + v + " is taken — try another.", "bad");
      }).catch(function () { setUserHint("Couldn't check right now — you can still try.", ""); });
    }, 300);
  }

  function submitUsername() {
    var v = (userInput.value || "").trim().toLowerCase();
    userError.hidden = true;
    if (!HANDLE_RE.test(v)) {
      userError.textContent = "Pick 3–16 characters: letters, numbers, underscore.";
      userError.hidden = false; return;
    }
    userGo.disabled = true; userGo.textContent = "Saving…";
    window.SprintNet.claimUsername(v).then(function () {
      enterApp(window.SPRINT_USER);
    }).catch(function (e) {
      userGo.disabled = false; userGo.textContent = "Continue";
      userError.textContent = (e && e.message) || "That username is taken. Try another.";
      userError.hidden = false;
      setUserHint("@" + v + " is taken — try another.", "bad");
    });
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
        .then(function () { proceed(user, finalName); });
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
  if (userInput) userInput.addEventListener("input", onUsernameInput);
  if (userForm)  userForm.addEventListener("submit", function (e) { e.preventDefault(); submitUsername(); });

  /* ---- sign out: confirm before exiting ---- */
  function doSignOut() {
    (auth ? auth.signOut() : Promise.resolve()).then(function () { location.reload(); }, function () { location.reload(); });
  }
  function closeSignout() { if (signoutModal) signoutModal.hidden = true; }
  if (bso) bso.addEventListener("click", function () {
    if (signoutModal) signoutModal.hidden = false; else doSignOut();
  });
  if (signoutConfirm) signoutConfirm.addEventListener("click", doSignOut);
  if (signoutCancel)  signoutCancel.addEventListener("click", closeSignout);
  if (signoutModal) signoutModal.addEventListener("click", function (e) {
    if (e.target === signoutModal) closeSignout(); // click backdrop to dismiss
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && signoutModal && !signoutModal.hidden) closeSignout();
  });

  /* ---- auto-continue a returning session (never blocks the buttons) ---- */
  if (auth) {
    auth.onAuthStateChanged(function (user) {
      if (user && !window.SPRINT_USER && guestForm.hidden && userForm.hidden) {
        proceed(user, localStorage.getItem("sprint_name") || user.displayName);
      }
    });
  }
})();
