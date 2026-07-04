/* =========================================================
   SPRINT · Typing Race — game logic
   Single player: YOU vs 4 bots (1 easy, 2 medium, 1 hard).
   No frameworks, no build step. Runs from a static file host.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- passage pool (rotated via a shuffle bag so it feels fresh) ---------- */
  const PASSAGES = [
    "The quick brown fox jumps over the lazy dog while the morning sun climbs slowly above the distant hills and paints the fields in gold.",
    "Every great runner knows that the race is won long before the starting gun fires, in the quiet hours of practice when nobody is watching.",
    "Focus on the rhythm of your fingers and let the words flow like water down a mountain stream, steady and certain and never in a hurry.",
    "Success is not about being faster than everyone else on a single day but about showing up again and again until speed becomes a habit.",
    "The stadium roared as the sprinters lined up, muscles tense and eyes fixed on the horizon, waiting for the moment the world would blur.",
    "A calm mind types faster than a frantic one, so breathe slowly, trust your training, and watch the letters fall neatly into place.",
    "Precision beats panic in every race worth running, because a single mistake can cost more time than a dozen careful, confident strokes.",
    "When the track stretches out before you and the crowd falls silent, remember that every champion once started exactly where you are now.",
    "The best keyboards feel almost invisible, so that thought becomes text without any friction between the mind and the glowing screen.",
    "Rain fell softly on the empty streets as the city slept, and a single lamp glowed warm against the cool blue shadows of the night.",
    "Curiosity is the engine that pulls a person forward, opening doors that fear would rather keep shut and questions worth chasing.",
    "A good habit is nothing more than a decision you no longer have to make, quietly repeated until it carries you on its own.",
    "The ocean does not hurry, yet it shapes entire coastlines, one patient wave at a time, over years far longer than we can imagine.",
    "Small daily improvements are the true secret to staggering long term results, so measure progress in weeks and not in single days.",
    "He packed a light bag, checked the map one final time, and stepped onto the trail just as the first pale light touched the peaks.",
    "Words are tools, and the more of them you keep sharp and ready, the more precisely you can carve your thoughts into the world.",
    "The clever engineer knew that the simplest design was almost always the strongest, so she deleted far more code than she ever wrote.",
    "Between the mountains and the sea there is a narrow road that few people travel, lined with old pines and the smell of warm dust.",
    "Speed comes from calm, and calm comes from practice, so the fastest hands in any room are usually the ones that look unhurried.",
    "A library is a quiet storm of ideas, each book a lightning bolt waiting for the right reader to reach up and pull it down.",
    "The scientist wrote her notes carefully, knowing that a future stranger might build something wonderful on the foundation she laid.",
    "Autumn arrived overnight, turning the whole valley to copper and flame, and the wind carried the sound of leaves like distant applause.",
    "Trust the process even on the days it feels slow, because roots grow in silence long before the first green shoot breaks the soil.",
    "The old clockmaker believed that time was a river you could not stop, only learn to row across with steady and honest strokes.",
    "Every expert was once a beginner who refused to quit, stumbling through the hard early days until the difficult became familiar.",
    "The city lights blurred into ribbons as the train picked up speed, carrying strangers toward a hundred different tomorrows at once.",
    "A single kind sentence can change the whole shape of someone's day, so spend your words the way you would spend rare and precious coins.",
    "The mountain did not care how badly he wanted to reach the summit; it only rewarded the climber who kept placing one foot higher.",
    "Great writing is mostly rewriting, cutting away everything that does not serve the story until only the sharp bright truth remains.",
    "She learned to code the way others learn a language, one small phrase at a time, until the strange symbols began to whisper back.",
    "The garden taught him patience, for no amount of shouting could make a seed grow faster than its own quiet inner clock allowed.",
    "In the workshop the smell of sawdust and coffee mixed together, and the steady rhythm of the hammer marked the passing of the hours.",
    "Discipline is choosing between what you want now and what you want most, and the gap between those two things is where character grows.",
    "The lighthouse stood alone against the storm, throwing its patient beam across the waves for ships it would never see or meet.",
    "Learning to type without looking is like learning to walk again, awkward at first, then suddenly so natural you forget you ever tried.",
    "The map is not the territory, so put down the plan now and then and let your own two feet discover what the paper left out.",
    "On July 20, 1969, at 10:56 p.m., Neil Armstrong stepped onto the Moon; over 600 million people watched it live on TV.",
    "The recipe needs 2 cups of flour, 1/2 cup of sugar, 3 eggs, and exactly 350 degrees for 25 minutes -- no more, no less.",
    "\"Are you serious?\" he asked. \"We shipped 1,000 units in 48 hours, and returns were under 0.5%!\" The whole team cheered.",
    "Room 214 is on the 2nd floor; take the elevator, turn left, and it's the 3rd door past the water cooler (near exit B).",
    "By 2030, experts predict that 75% of all cars sold will be electric, cutting emissions by roughly 1.8 billion tons a year.",
    "She scored 98, 100, and 95 on her tests -- an average of 97.6 -- which, honestly, was 12 points higher than she expected.",
    "The password must contain at least 8 characters: 1 uppercase, 1 number, and 1 symbol like @, #, or &. Simple, right?",
    "\"Meet me at 5:45,\" the note read, \"and bring $20, two tickets, and that map we bought back in 2019.\" It was signed X.",
    "Water boils at 100 C (212 F) at sea level, but on Mount Everest -- about 8,849 meters up -- it boils near 71 C instead.",
    "He ran the marathon (all 26.2 miles) in 3 hours, 14 minutes, and 9 seconds; his goal? To finish under 3:30 next year.",
    "The invoice totals $4,275.50, due within 30 days; a 2% discount applies if paid before the 15th -- otherwise, full price.",
    "Fun fact: honey never spoils. Archaeologists found 3,000-year-old jars in Egypt that were, believe it or not, still good!",
    "\"Section 4.2,\" the manual warns, \"must not be skipped.\" Yet 9 out of 10 users click 'Next' without reading a word.",
    "Our flight (BA-297) departs at 6:10 a.m. from Gate 42; boarding starts 45 minutes early, so don't arrive after 5:25.",
    "The stock jumped 14% on Monday, dipped 3% on Tuesday, then closed flat -- proving, once again, that markets love drama.",
    "\"Type faster!\" the coach yelled. In 60 seconds she hit 112 words, made only 2 errors, and beat her record by 8 WPM.",
  ];

  const LENGTH_SENTENCES = { short: 1, medium: 2, long: 3 };

  /* ---------- racer roster ---------- */
  // baseWpm = target average; jitter = per-tick variance;
  // burstChance/burstWpm = occasional surges (Titan only, per spec).
  const BOTS = [
    { id: "easy",   name: "Rookie", color: "#6ee7b7", baseWpm: 52, jitter: 5,  burstChance: 0,     burstWpm: 0,
      look: { skin: "#f2c9a0", hair: "#3a2b1a", pants: "#22543d" } },
    { id: "med1",   name: "Blaze",  color: "#7cc4ff", baseWpm: 78, jitter: 6,  burstChance: 0,     burstWpm: 0,
      look: { skin: "#e8b98a", hair: "#1a1a1a", pants: "#1e3a5f" } },
    { id: "med2",   name: "Nova",   color: "#b79bff", baseWpm: 77, jitter: 6,  burstChance: 0,     burstWpm: 0,
      look: { skin: "#d9a878", hair: "#4a2c1a", pants: "#3b2a5f" } },
    { id: "hard",   name: "Titan",  color: "#ff6b81", baseWpm: 93, jitter: 5,  burstChance: 0.16,  burstWpm: 104,
      look: { skin: "#c89060", hair: "#0f0f0f", pants: "#5f1e2a" } },
  ];

  const YOU_LOOK = { skin: "#f4d0a8", hair: "#2a1c10", pants: "#5f4a1e", color: "#ffd23f" };

  /* ---------- state ---------- */
  const S = {
    phase: "menu",          // menu | countdown | racing | done
    length: "medium",
    text: "",
    typedCount: 0,          // correct chars advanced (position in text)
    correctChars: 0,
    keystrokes: 0,          // total attempts (for accuracy)
    errors: 0,
    startTime: 0,
    lastFrame: 0,
    rafId: 0,
    finished: false,
    you: null,              // { progress:0..1, finishTime, wpmLive }
    bots: [],               // runtime bot state
    finishOrder: [],
  };

  const FINISH_MARGIN = 0.946; // matches CSS finish line position (right: 5.4%)

  /* ---------- element refs ---------- */
  const $ = (s) => document.querySelector(s);
  const el = {
    screens: {
      menu: $("#screen-menu"),
      race: $("#screen-race"),
      results: $("#screen-results"),
    },
    lengthSeg: $("#length-seg"),
    btnStart: $("#btn-start"),
    lanes: $("#lanes"),
    passage: $("#passage"),
    input: $("#hidden-input"),
    typePanel: $(".type-panel"),
    typeStatus: $("#type-status"),
    countdown: $("#countdown"),
    countdownNum: $("#countdown-num"),
    hud: {
      wpm: $("#hud-wpm"), acc: $("#hud-acc"), pos: $("#hud-pos"),
      time: $("#hud-time"), progress: $("#hud-progress"),
    },
    resultsPlace: $("#results-place"),
    resultsTitle: $("#results-title"),
    resultsBanner: $("#results-banner"),
    resWpm: $("#res-wpm"), resAcc: $("#res-acc"), resTime: $("#res-time"),
    btnAgain: $("#btn-again"), btnMenu: $("#btn-menu"),
  };

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const wpmToCps = (wpm) => (wpm * 5) / 60; // chars per second (5 chars = 1 word)
  const ordinal = (n) => ["1st", "2nd", "3rd", "4th", "5th"][n - 1] || n + "th";

  function showScreen(name) {
    Object.values(el.screens).forEach((s) => s.classList.remove("is-active"));
    el.screens[name].classList.add("is-active");
  }

  function buildRunnerMarkup(look) {
    return `
      <div class="runner" style="--c:${look.color};--skin:${look.skin};--hair:${look.hair};--pants:${look.pants}">
        <span class="head"></span>
        <span class="torso"></span>
        <span class="arm arm--back"></span>
        <span class="leg leg--back"></span>
        <span class="arm arm--front"></span>
        <span class="leg leg--front"></span>
      </div>`;
  }

  /* ---------- build the track lanes ---------- */
  function buildLanes() {
    // roster order top-to-bottom: YOU first, then bots
    const roster = [
      { id: "you", name: "YOU", color: YOU_LOOK.color, sub: "you", look: { ...YOU_LOOK } },
      ...BOTS.map((b) => ({ id: b.id, name: b.name, color: b.color, sub: b.baseWpm >= 90 ? "hard" : b.baseWpm >= 70 ? "medium" : "easy", look: { ...b.look, color: b.color } })),
    ];

    el.lanes.innerHTML = roster
      .map(
        (r) => `
      <div class="lane" data-id="${r.id}">
        <span class="lane__tag" style="color:${r.color}">
          <span class="racer-chip__dot" style="background:${r.color};width:9px;height:9px"></span>
          ${r.name} <small class="lane__wpm" data-wpm="${r.id}">0 wpm</small>
        </span>
        <div class="runner-unit ${r.id === "you" ? "runner-unit--you" : ""}" data-unit="${r.id}" style="left:2.5%">
          <span class="streak" style="--c:${r.color}"></span>
          <span class="dust"></span><span class="dust"></span><span class="dust"></span>
          ${buildRunnerMarkup(r.look)}
        </div>
      </div>`
      )
      .join("");
  }

  /* ---------- render passage into spans ---------- */
  function renderPassage() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < S.text.length; i++) {
      const c = S.text[i];
      const span = document.createElement("span");
      span.className = "ch" + (c === " " ? " space" : "");
      span.textContent = c;
      span.dataset.i = i;
      frag.appendChild(span);
    }
    // single gliding caret element (smooth, instead of a per-character pseudo)
    const caret = document.createElement("span");
    caret.className = "caret";
    // inner wrapper is what we translate vertically to keep the current line visible
    const inner = document.createElement("div");
    inner.className = "passage__inner";
    inner.appendChild(caret);
    inner.appendChild(frag);
    el.passage.innerHTML = "";
    el.passage.appendChild(inner);
    el.passageInner = inner;
    S.caret = caret;
    S.chars = inner.querySelectorAll(".ch");
    S.currentEl = null;
    markCurrent();
  }

  // glide the caret to the given character (or park it after the last one)
  function positionCaret(target) {
    if (!S.caret) return;
    if (target) {
      S.caret.style.display = "block";
      S.caret.style.transform = "translate(" + target.offsetLeft + "px," + target.offsetTop + "px)";
    } else if (S.chars.length) {
      // finished: sit just past the final character
      const last = S.chars[S.chars.length - 1];
      S.caret.style.transform = "translate(" + (last.offsetLeft + last.offsetWidth) + "px," + last.offsetTop + "px)";
    }
  }

  // Only touches the two chars that change (old caret + new caret) — no full loop,
  // so the caret stays snappy even on long passages.
  function markCurrent() {
    if (S.currentEl) S.currentEl.classList.remove("current");
    const next = S.typedCount < S.chars.length ? S.chars[S.typedCount] : null;
    if (next) next.classList.add("current");
    S.currentEl = next;
    positionCaret(next);
    updateScroll(next);
  }

  // Scroll the passage so the active line is always on screen. Keeps one line of
  // context above the caret; long passages that overflow now stay fully reachable.
  function updateScroll(activeEl) {
    if (!el.passageInner) return;
    const target = activeEl || S.chars[S.chars.length - 1];
    if (!target) return;
    const lineBox = parseFloat(getComputedStyle(el.passage).lineHeight) || target.offsetHeight || 30;
    // snap offsetTop to whole lines, then keep one line of lead above the caret
    const lineIndex = Math.round(target.offsetTop / lineBox);
    const offset = Math.max(0, (lineIndex - 1) * lineBox);
    el.passageInner.style.transform = "translateY(" + -offset + "px)";
  }

  /* ---------- game setup ---------- */
  // shuffle bag: draw passages without repeats until the whole pool is used,
  // then reshuffle — so it always feels like a brand-new text.
  let passageBag = [];
  function nextPassageIndex() {
    if (passageBag.length === 0) {
      passageBag = PASSAGES.map((_, i) => i);
      for (let i = passageBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passageBag[i], passageBag[j]] = [passageBag[j], passageBag[i]];
      }
    }
    return passageBag.pop();
  }

  function pickText() {
    const n = LENGTH_SENTENCES[S.length];
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(PASSAGES[nextPassageIndex()]);
    return parts.join(" ");
  }

  function resetState() {
    S.text = pickText();
    S.typedCount = 0;
    S.correctChars = 0;
    S.keystrokes = 0;
    S.errors = 0;
    S.finished = false;
    S.finishOrder = [];
    S.you = { progress: 0, finishTime: null, wpmLive: 0 };
    S.bots = BOTS.map((b) => ({
      ...b,
      progress: 0,
      wpmNow: b.baseWpm,
      finishTime: null,
      bursting: false,
      burstT: 0,
    }));
  }

  /* ---------- countdown then race ---------- */
  function startCountdown() {
    if (S.phase === "countdown") return; // guard against double-trigger (Enter + click)
    S.phase = "countdown";
    resetState();
    buildLanes();
    renderPassage();
    showScreen("race"); // also closes the results dialog if it was open
    el.input.value = "";
    el.typeStatus.textContent = "Get ready…";
    el.countdown.classList.add("is-active");

    const steps = ["3", "2", "1", "GO!"];
    let i = 0;
    const tick = () => {
      const n = el.countdownNum;
      n.textContent = steps[i];
      n.classList.remove("pop", "go");
      void n.offsetWidth; // reflow to restart animation
      n.classList.add(i === steps.length - 1 ? "go" : "pop");
      i++;
      if (i < steps.length) {
        setTimeout(tick, 900);
      } else {
        setTimeout(beginRace, 850);
      }
    };
    tick();
  }

  function beginRace() {
    el.countdown.classList.remove("is-active");
    S.phase = "racing";
    S.startTime = performance.now();
    S.lastFrame = S.startTime;
    el.typeStatus.textContent = "GO! Type as fast as you can.";
    el.input.focus();
    document.querySelectorAll(".runner-unit").forEach((u) => u.classList.add("is-running"));
    S.rafId = requestAnimationFrame(loop);
  }

  /* ---------- the main loop (bots + HUD) ---------- */
  function loop(now) {
    if (S.phase !== "racing") return;
    const dt = Math.min(0.05, (now - S.lastFrame) / 1000); // seconds, capped
    S.lastFrame = now;
    const total = S.text.length;

    // advance each bot
    S.bots.forEach((b) => {
      if (b.finishTime !== null) return;

      // occasional burst (Titan): sustained surge above 100 wpm
      if (b.burstChance > 0) {
        if (b.bursting) {
          b.burstT -= dt;
          if (b.burstT <= 0) b.bursting = false;
        } else if (Math.random() < b.burstChance * dt) {
          b.bursting = true;
          b.burstT = rand(1.2, 2.6);
        }
      }

      const target = b.bursting ? rand(b.burstWpm, b.burstWpm + 6) : b.baseWpm + rand(-b.jitter, b.jitter);
      // smooth toward target so the number doesn't flicker
      b.wpmNow += (target - b.wpmNow) * clamp(dt * 3, 0, 1);
      const cps = wpmToCps(Math.max(b.id === "easy" ? 50 : 0, b.wpmNow));
      b.progress += (cps * dt) / total;

      if (b.progress >= FINISH_MARGIN) {
        b.progress = FINISH_MARGIN;
        b.finishTime = (now - S.startTime) / 1000;
        S.finishOrder.push(b.id);
      }
    });

    // you: live wpm from correct chars
    const elapsedMin = (now - S.startTime) / 60000;
    S.you.wpmLive = elapsedMin > 0 ? (S.correctChars / 5) / elapsedMin : 0;
    S.you.progress = clamp((S.typedCount / total) * FINISH_MARGIN, 0, FINISH_MARGIN);

    renderRace(now);

    // NOTE: the race ends the instant YOU finish (see finishYou) — no waiting
    // for the bots. The loop just keeps the bots moving until then.
    S.rafId = requestAnimationFrame(loop);
  }

  function speedClass(wpm) {
    if (wpm >= 96) return "spd-turbo";
    if (wpm >= 72) return "spd-fast";
    return "";
  }

  function renderRace(now) {
    // position runners
    positionRunner("you", S.you.progress, S.you.wpmLive);
    S.bots.forEach((b) => positionRunner(b.id, b.progress, b.wpmNow));

    // HUD
    const elapsed = (now - S.startTime) / 1000;
    el.hud.wpm.textContent = Math.round(S.you.wpmLive);
    el.hud.progress.innerHTML = Math.round((S.you.progress / FINISH_MARGIN) * 100) + "<small>%</small>";
    const acc = S.keystrokes > 0 ? Math.round((S.correctChars / S.keystrokes) * 100) : 100;
    el.hud.acc.innerHTML = acc + "<small>%</small>";
    el.hud.time.innerHTML = elapsed.toFixed(1) + "<small>s</small>";

    // live position (1st..5th) by progress
    const ranked = [
      { id: "you", p: S.you.progress },
      ...S.bots.map((b) => ({ id: b.id, p: b.progress })),
    ].sort((a, z) => z.p - a.p);
    const youRank = ranked.findIndex((r) => r.id === "you") + 1;
    el.hud.pos.innerHTML = youRank + "<small>" + ordinal(youRank).slice(-2) + "</small>";
  }

  function positionRunner(id, progress, wpm) {
    const unit = el.lanes.querySelector(`[data-unit="${id}"]`);
    if (!unit) return;
    // map progress (0..FINISH_MARGIN) to the track: start 2.5% -> finish line ~92.5%
    const leftPct = 2.5 + (progress / FINISH_MARGIN) * 90;
    unit.style.left = leftPct + "%";
    const cls = speedClass(wpm);
    unit.classList.remove("spd-fast", "spd-turbo");
    if (cls) unit.classList.add(cls);
    const tag = el.lanes.querySelector(`[data-wpm="${id}"]`);
    if (tag) tag.textContent = Math.max(0, Math.round(wpm)) + " wpm";
  }

  /* ---------- typing input ---------- */
  function onInput(e) {
    if (S.phase !== "racing" || S.finished) { el.input.value = ""; return; }
    const val = el.input.value;
    el.input.value = "";
    for (const ch of val) handleChar(ch);
  }

  function onKeydown(e) {
    if (e.key === "Escape") { quitToMenu(); return; }
    if (S.phase !== "racing" || S.finished) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      if (S.typedCount > 0) {
        S.typedCount--;
        const span = S.chars[S.typedCount];
        if (span.classList.contains("correct")) S.correctChars--;
        span.classList.remove("correct", "wrong");
        markCurrent();
        el.typePanel.classList.remove("err");
      }
    }
  }

  function handleChar(ch) {
    const chars = S.chars;
    if (S.typedCount >= chars.length) return;
    const expected = S.text[S.typedCount];
    const span = chars[S.typedCount];
    S.keystrokes++;

    if (ch === expected) {
      span.classList.add("correct");
      span.classList.remove("wrong");
      S.correctChars++;
      S.typedCount++;
      el.typePanel.classList.remove("err");
      el.typeStatus.textContent = "Nice — keep the rhythm going.";
    } else {
      span.classList.add("wrong");
      S.errors++;
      S.typedCount++;
      el.typePanel.classList.add("err");
      el.typeStatus.textContent = "Typo! Backspace to fix, or push on.";
    }
    markCurrent();

    if (S.typedCount >= chars.length) finishYou();
  }

  function finishYou() {
    if (S.finished) return;
    S.finished = true;
    S.you.progress = FINISH_MARGIN;
    S.you.finishTime = (performance.now() - S.startTime) / 1000;
    const unit = el.lanes.querySelector('[data-unit="you"]');
    if (unit) { unit.classList.add("finished"); unit.classList.remove("is-running"); }
    el.typeStatus.textContent = "You crossed the line!";
    endRace(); // show the dialog immediately — no waiting for the bots
  }

  /* ---------- end + results ---------- */
  function endRace() {
    if (S.phase === "done") return;
    S.phase = "done";
    cancelAnimationFrame(S.rafId);
    document.querySelectorAll(".runner-unit").forEach((u) => u.classList.remove("is-running"));

    const yourTime = S.you.finishTime || (performance.now() - S.startTime) / 1000;
    const yourWpm = yourTime > 0 ? Math.round((S.correctChars / 5) / (yourTime / 60)) : 0;
    const acc = S.keystrokes > 0 ? Math.round((S.correctChars / S.keystrokes) * 100) : 100;

    // Your place = however many bots have ALREADY crossed the line + 1.
    // Any bot still on the track is behind you, so this is your final placement.
    const botsAhead = S.bots.filter((b) => b.finishTime !== null).length;
    const youPlace = botsAhead + 1;
    const won = youPlace === 1;

    el.resultsPlace.textContent = ordinal(youPlace);
    el.resultsPlace.classList.toggle("win", won);
    el.resultsTitle.classList.remove("win", "lose");
    if (won) {
      el.resultsBanner.textContent = "★ VICTORY ★";
      el.resultsTitle.textContent = yourWpm >= 95 ? "You won the race!" : "Photo finish — you took it!";
      el.resultsTitle.classList.add("win");
      confetti();
    } else {
      el.resultsBanner.textContent = "RACE COMPLETE";
      const msgs = {
        2: "So close — 2nd place!",
        3: "Solid run — 3rd place.",
        4: "4th this time. Push for 95+ WPM!",
        5: "The bots got you. Aim for 95+ WPM to win.",
      };
      el.resultsTitle.textContent = msgs[youPlace] || "Finished!";
      el.resultsTitle.classList.add("lose");
    }

    el.resWpm.textContent = yourWpm;
    el.resAcc.textContent = acc + "%";
    el.resTime.textContent = yourTime.toFixed(1) + "s";

    // open as a dialog on top of the finished race (race screen stays behind)
    el.screens.results.classList.add("is-active");
  }

  function confetti() {
    const colors = ["#ffd23f", "#ff8a3d", "#7cf3ff", "#6ee7b7", "#b79bff", "#ff6b81"];
    for (let i = 0; i < 90; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animation = `fall ${rand(2.2, 4.2)}s linear ${rand(0, 0.8)}s forwards`;
      c.style.transform = `rotate(${rand(0, 360)}deg)`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5200);
    }
  }

  function quitToMenu() {
    cancelAnimationFrame(S.rafId);
    S.phase = "menu";
    S.finished = true;
    showScreen("menu");
  }

  /* ---------- wiring ---------- */
  function init() {
    // length selector
    el.lengthSeg.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg__btn");
      if (!btn) return;
      el.lengthSeg.querySelectorAll(".seg__btn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      S.length = btn.dataset.len;
    });

    el.btnStart.addEventListener("click", startCountdown);
    el.btnAgain.addEventListener("click", startCountdown);
    el.btnMenu.addEventListener("click", () => { S.phase = "menu"; showScreen("menu"); });

    // typing
    el.input.addEventListener("input", onInput);
    document.addEventListener("keydown", onKeydown);

    // keep focus on the hidden input while racing
    el.typePanel.addEventListener("click", () => el.input.focus());
    el.input.addEventListener("focus", () => el.typePanel.classList.add("is-focused"));
    el.input.addEventListener("blur", () => el.typePanel.classList.remove("is-focused"));

    // Enter starts a race from the menu AND restarts from the results dialog
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (S.phase === "menu" || S.phase === "done")) {
        e.preventDefault();
        startCountdown();
      }
    });

    showScreen("menu");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
