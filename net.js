/* =========================================================
   SPRINT · Multiplayer network layer (compat / classic script)
   Exposes window.SprintNet for the game script.

   Start model (host-INDEPENDENT):
     - A room shares one absolute go-live time (meta.startAt).
     - EVERY client starts the race on its own when that time
       arrives — no single "host" has to trigger it, so a room
       can never hang because someone left.
     - Empty lanes are filled with DETERMINISTIC bots seeded from
       the roomId, so all clients agree without writing bots.
   ========================================================= */
(function () {
  "use strict";

  var db = window.SprintDB; // set by firebase-init.js
  var TS = (typeof firebase !== "undefined") ? firebase.database.ServerValue.TIMESTAMP : 0;

  var MAX_PLAYERS    = 5;
  var TARGET_TOTAL   = 5;
  var JOIN_WINDOW_MS = 12000; // public: gather + countdown window
  var COUNTDOWN_MS   = 4000;  // 3-2-1-GO shown at the end of the window

  var cfg = {
    makePassage: function () { return "the quick brown fox jumps over the lazy dog"; },
    makeBots: function () { return []; },
  };

  var offset = 0;
  if (db) db.ref(".info/serverTimeOffset").on("value", function (s) { offset = s.val() || 0; });
  function serverNow() { return Date.now() + offset; }

  var cur = null;
  function me() { return window.SPRINT_USER; }

  function playerRecord(u) {
    return {
      name: u.name, photoURL: u.photoURL || null, isGuest: !!u.isGuest,
      progress: 0, wpm: 0, acc: 100, finished: false, finishTime: null, joinedAt: TS,
    };
  }

  function randomCode() {
    var A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }

  /* ===================== MATCHMAKING ===================== */
  function quickMatch(cb) {
    var u = me();
    var newId = db.ref("rooms").push().key;
    var now = serverNow();
    var decision = null;

    return db.ref("matchmaking").transaction(function (m) {
      var open = m && m.roomId && m.status === "waiting" &&
                 (m.count || 0) < MAX_PLAYERS && (m.startAt || 0) > now + COUNTDOWN_MS;
      if (open) {
        decision = { action: "join", roomId: m.roomId };
        m.count = (m.count || 0) + 1;
        return m;
      }
      decision = { action: "create", roomId: newId, startAt: now + JOIN_WINDOW_MS };
      return { roomId: newId, count: 1, status: "waiting", startAt: now + JOIN_WINDOW_MS };
    }).then(function () {
      if (decision.action === "create") {
        return db.ref("rooms/" + newId + "/meta").set({
          status: "waiting", host: u.uid, private: false,
          createdAt: TS, startAt: decision.startAt, maxPlayers: MAX_PLAYERS,
        }).then(function () { return decision; });
      }
      return decision;
    }).then(function (d) {
      return enterRoom(d.roomId, { isPrivate: false, isHost: d.action === "create" }, cb);
    });
  }

  /* ===================== PRIVATE ROOMS ===================== */
  function createPrivate(cb) {
    var u = me();
    var roomId = db.ref("rooms").push().key;
    var code = randomCode();
    return db.ref("rooms/" + roomId + "/meta").set({
      status: "waiting", host: u.uid, private: true,
      createdAt: TS, startAt: null, maxPlayers: MAX_PLAYERS, code: code,
    }).then(function () {
      return db.ref("codes/" + code).set(roomId);
    }).then(function () {
      return enterRoom(roomId, { isPrivate: true, isHost: true, code: code }, cb);
    }).then(function () {
      return { roomId: roomId, code: code };
    });
  }

  function joinByCode(code, cb) {
    code = (code || "").trim().toUpperCase();
    return db.ref("codes/" + code).once("value").then(function (snap) {
      if (!snap.exists()) throw new Error("No room with that code.");
      return joinRoom(snap.val(), cb);
    });
  }

  function joinRoom(roomId, cb) {
    return db.ref("rooms/" + roomId + "/meta").once("value").then(function (metaSnap) {
      if (!metaSnap.exists()) throw new Error("That room no longer exists.");
      var meta = metaSnap.val();
      if (meta.status !== "waiting") throw new Error("That race has already started.");
      return db.ref("rooms/" + roomId + "/players").once("value").then(function (pSnap) {
        var count = pSnap.exists() ? Object.keys(pSnap.val()).length : 0;
        if (count >= (meta.maxPlayers || MAX_PLAYERS)) throw new Error("That room is full.");
        return enterRoom(roomId, { isPrivate: !!meta.private, isHost: false, code: meta.code }, cb);
      });
    });
  }

  /* ===================== ENTER / LISTEN ===================== */
  function enterRoom(roomId, opts, cb) {
    var u = me();
    return leave().then(function () {
      var playerRef = db.ref("rooms/" + roomId + "/players/" + u.uid);
      return playerRef.set(playerRecord(u)).then(function () {
        playerRef.onDisconnect().remove();

        cur = {
          roomId: roomId, isPrivate: !!opts.isPrivate, isHost: !!opts.isHost,
          me: u.uid, playerRef: playerRef, code: opts.code || null,
          started: false, raceState: null, lastSend: 0, cb: cb,
          enteredAt: Date.now(), tickTimer: null,
          roomRef: db.ref("rooms/" + roomId), roomCb: null, lastRoom: null,
        };
        cur.roomCb = function (snap) { onRoomSnap(snap); };
        cur.roomRef.on("value", cur.roomCb);
        cur.tickTimer = setInterval(onTick, 400);
      });
    });
  }

  function buildState(val) {
    var meta = val.meta;
    var playersObj = val.players || {};
    var players = Object.keys(playersObj).map(function (uid) {
      var p = playersObj[uid];
      return {
        uid: uid, name: p.name || "Racer", photoURL: p.photoURL || null,
        isGuest: !!p.isGuest, progress: p.progress || 0, wpm: p.wpm || 0,
        acc: p.acc == null ? 100 : p.acc, finished: !!p.finished,
        finishTime: p.finishTime == null ? null : p.finishTime,
        joinedAt: p.joinedAt || 0, isHost: uid === meta.host,
      };
    }).sort(function (a, b) { return a.joinedAt - b.joinedAt; });

    return {
      roomId: cur.roomId, isPrivate: cur.isPrivate, isHost: cur.isHost,
      code: cur.code || meta.code || null, status: meta.status,
      passage: meta.passage || null, startAt: meta.startAt || null,
      raceStartAt: meta.raceStartAt || null, maxPlayers: meta.maxPlayers || MAX_PLAYERS,
      bots: meta.bots || [], me: cur.me, players: players,
      serverNow: serverNow(), joinWindowMs: JOIN_WINDOW_MS, countdownMs: COUNTDOWN_MS,
    };
  }

  function onRoomSnap(snap) {
    if (!cur) return;
    var val = snap.val();
    if (!val || !val.meta) { emit(null); return; }
    var state = buildState(val);
    cur.lastRoom = state;

    if (cur.started && cur.raceState) {
      // race is running locally — keep feeding fresh opponent data
      var live = Object.assign({}, cur.raceState, { players: state.players, serverNow: serverNow() });
      emit(live);
      return;
    }
    if (!val.players || !val.players[cur.me]) return; // we were removed
    emit(state);
    maybeStartLocal(state);
  }

  // 400ms heartbeat: refresh the lobby countdown + guarantee the start
  function onTick() {
    if (!cur || cur.started) return;
    var state = cur.lastRoom;
    if (!state || state.status === "done") return;
    state = Object.assign({}, state, { serverNow: serverNow() });
    emit(state);
    maybeStartLocal(state);
  }

  function emit(state) { if (cur && cur.cb && cur.cb.onRoom) cur.cb.onRoom(state); }

  // Any client starts the race on its own once the shared go-live time hits.
  function maybeStartLocal(state) {
    if (!cur || cur.started) return;
    var goLive = state.startAt; // absolute ms; null for a private room not yet started
    if (!goLive) return;
    var byClock  = serverNow() >= (goLive - COUNTDOWN_MS);
    var byBackup = (Date.now() - cur.enteredAt) >= (JOIN_WINDOW_MS + 3000); // clock-skew safety net
    if (!byClock && !byBackup) return;

    cur.started = true;
    var seed = cur.roomId;
    var passage = cfg.makePassage(seed);
    var realCount = state.players.length;
    var botCount = cur.isPrivate ? (realCount >= 2 ? 0 : (TARGET_TOTAL - realCount))
                                 : Math.max(0, TARGET_TOTAL - realCount);
    var bots = cfg.makeBots(passage, botCount, seed);
    var raceStartAt = Math.max(goLive, serverNow() + 1500); // guarantee a short countdown

    cur.raceState = Object.assign({}, state, {
      status: "racing", passage: passage, bots: bots, raceStartAt: raceStartAt, serverNow: serverNow(),
    });
    emit(cur.raceState);

    // free the public matchmaking slot so later players open a fresh room
    if (!cur.isPrivate && cur.isHost) {
      db.ref("matchmaking").transaction(function (m) {
        return (m && m.roomId === cur.roomId) ? null : m;
      });
    }
  }

  // Private-room host presses "Start": set a shared go-live time; every client reacts.
  function hostStart() {
    if (!cur || !cur.lastRoom) return;
    db.ref("rooms/" + cur.roomId + "/meta").update({ startAt: serverNow() + COUNTDOWN_MS });
  }

  /* ===================== LIVE SYNC ===================== */
  function sendProgress(data) {
    if (!cur) return;
    var now = Date.now();
    if (now - cur.lastSend < 90) return;
    cur.lastSend = now;
    cur.playerRef.update({
      progress: data.progress || 0,
      wpm: Math.round(data.wpm || 0),
      acc: Math.round(data.acc == null ? 100 : data.acc),
    }).catch(function () {});
  }

  function sendFinished(data) {
    if (!cur) return;
    cur.playerRef.update({
      progress: data.progress || 0,
      wpm: Math.round(data.wpm || 0),
      acc: Math.round(data.acc == null ? 100 : data.acc),
      finished: true, finishTime: data.time || 0,
    }).catch(function () {});
  }

  /* ===================== LEAVE / CLEANUP ===================== */
  function leave() {
    if (!cur) return Promise.resolve();
    var c = cur;
    cur = null;
    if (c.tickTimer) clearInterval(c.tickTimer);
    if (c.roomRef && c.roomCb) c.roomRef.off("value", c.roomCb);
    var p = Promise.resolve();
    try {
      p = c.playerRef.onDisconnect().cancel()
        .then(function () { return c.playerRef.remove(); })
        .catch(function () {});
    } catch (e) {}
    return p.then(function () {
      if (!c.isPrivate) {
        return db.ref("matchmaking").transaction(function (m) {
          if (m && m.roomId === c.roomId) {
            var n = (m.count || 1) - 1;
            return n <= 0 ? null : (m.count = n, m);
          }
          return m;
        }).catch(function () {});
      }
    });
  }

  /* ===================== PUBLIC API ===================== */
  window.SprintNet = {
    configure: function (o) { for (var k in o) cfg[k] = o[k]; },
    serverNow: serverNow,
    quickMatch: quickMatch,
    createPrivate: createPrivate,
    joinByCode: joinByCode,
    joinRoom: joinRoom,
    hostStart: hostStart,
    sendProgress: sendProgress,
    sendFinished: sendFinished,
    leave: leave,
    get roomId() { return cur ? cur.roomId : null; },
  };

  document.dispatchEvent(new Event("sprint:net-ready"));
})();
