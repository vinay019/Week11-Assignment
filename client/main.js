const SERVER_URL = "https://week11-assignment-server.onrender.com/";

const form = document.getElementById("plan-form");
const planSection = document.getElementById("plan");
const stepsEl = document.getElementById("steps");
const pomodoroEl = document.getElementById("pomodoro");
const progressEl = document.getElementById("progress");

const timerSection = document.getElementById("timer");
const timerMeta = document.getElementById("timer-meta");
const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

let partyFired = false;

function updateProgress() {
  const items = Array.from(stepsEl.querySelectorAll("li"));
  const done = items.filter(function (li) {
    return li.classList.contains("done");
  }).length;
  progressEl.textContent = items.length
    ? "Progress: " + done + "/" + items.length + " steps"
    : "";

  if (items.length && done === items.length && !partyFired) {
    partyFired = true;
    planSection.classList.add("success");
    celebrate();
  }
}

function celebrate() {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(40);
    } catch (_) {}
  }

  let layer = document.getElementById("celebration");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "celebration";
    document.body.appendChild(layer);
  }

  const EMOJIS = ["🎉", "✨", "🎊", "✅", "🌟", "💫", "🥳"];
  const count = 80;
  const durMin = 1200,
    durMax = 2400;

  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.className = "confetti";
    span.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const left = Math.random() * 100;
    span.style.left = left + "vw";

    const drift = Math.random() * 120 - 60 + "px";
    const duration = Math.floor(Math.random() * (durMax - durMin)) + durMin;
    const delay = Math.floor(Math.random() * 250);

    span.style.setProperty("--drift", drift);
    span.style.animationDuration = duration + "ms";
    span.style.animationDelay = delay + "ms";

    layer.appendChild(span);

    setTimeout(function () {
      span.remove();
      if (!layer.children.length) layer.remove();
    }, duration + delay + 50);
  }

  setTimeout(function () {
    planSection.classList.remove("success");
  }, 1500);
}

let currentPomodoro = null;
let remainingSeconds = 0;
let phase = "idle";
let cyclesLeft = 0;
let tickingId = null;

function fmt(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return m + ":" + s;
}

function updateTimerUI() {
  const title =
    phase === "work"
      ? "Focus"
      : phase === "break"
      ? "Break"
      : phase === "finished"
      ? "Done"
      : "Ready";
  timerMeta.textContent = currentPomodoro
    ? title + " • cycles left: " + cyclesLeft
    : "No Pomodoro available";
  timerDisplay.textContent = fmt(Math.max(remainingSeconds, 0));

  startBtn.disabled = !currentPomodoro || phase === "work" || phase === "break";
  pauseBtn.disabled = !(phase === "work" || phase === "break");
  resetBtn.disabled = !currentPomodoro;
}

function stopTicking() {
  if (tickingId) {
    clearInterval(tickingId);
    tickingId = null;
  }
}

function startPhase(nextPhase) {
  phase = nextPhase;
  if (phase === "work") {
    remainingSeconds = Number(currentPomodoro.work) * 60;
  } else if (phase === "break") {
    remainingSeconds = Number(currentPomodoro.break) * 60;
  }
  stopTicking();
  tickingId = setInterval(tick, 1000);
  updateTimerUI();
}

function tick() {
  remainingSeconds -= 1;
  if (remainingSeconds <= 0) {
    stopTicking();
    // small beep
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.4);
      setTimeout(function () {
        o.stop();
        ctx.close();
      }, 420);
    } catch (_) {}

    if (phase === "work") {
      if (cyclesLeft > 1) {
        startPhase("break");
      } else {
        phase = "finished";
        updateTimerUI();
        alert("All cycles complete. Nice one!");
      }
    } else if (phase === "break") {
      cyclesLeft -= 1;
      startPhase("work");
    }
  } else {
    updateTimerUI();
  }
}

startBtn.addEventListener("click", function () {
  if (!currentPomodoro) return;
  if (phase === "idle" || phase === "finished") {
    cyclesLeft = Number(currentPomodoro.cycles) || 1;
    startPhase("work");
  }
});

pauseBtn.addEventListener("click", function () {
  if (phase === "work" || phase === "break") {
    stopTicking();
    phase = "idle";
    updateTimerUI();
  }
});

resetBtn.addEventListener("click", function () {
  if (!currentPomodoro) return;
  stopTicking();
  phase = "idle";
  cyclesLeft = Number(currentPomodoro.cycles) || 1;
  remainingSeconds = Number(currentPomodoro.work) * 60;
  updateTimerUI();
});

async function handleSubmit(event) {
  event.preventDefault();

  partyFired = false;
  planSection.classList.remove("success");

  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());
  body.minutes = Number(body.minutes);

  try {
    const res = await fetch(SERVER_URL + "/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      throw new Error(err.error || "Server error");
    }

    const plan = await res.json();

    stepsEl.innerHTML = "";
    (plan.steps || []).forEach(function (s, idx) {
      const li = document.createElement("li");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "step-" + idx;

      const label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = s.title + " → " + s.minutes + " min";

      checkbox.addEventListener("change", function () {
        if (checkbox.checked) li.classList.add("done");
        else li.classList.remove("done");
        updateProgress();
      });

      li.appendChild(checkbox);
      li.appendChild(label);
      stepsEl.appendChild(li);
    });

    if (plan.pomodoro) {
      pomodoroEl.textContent =
        "Pomodoro: " +
        plan.pomodoro.work +
        "/" +
        plan.pomodoro.break +
        " × " +
        plan.pomodoro.cycles;
      currentPomodoro = {
        work: Number(plan.pomodoro.work),
        break: Number(plan.pomodoro.break),
        cycles: Number(plan.pomodoro.cycles),
      };
      phase = "idle";
      cyclesLeft = currentPomodoro.cycles;
      remainingSeconds = currentPomodoro.work * 60;
      timerSection.hidden = false;
      updateTimerUI();
    } else {
      pomodoroEl.textContent = "";
      currentPomodoro = null;
      timerSection.hidden = true;
      stopTicking();
    }

    planSection.hidden = false;
    updateProgress();
  } catch (err) {
    console.error(err);
    alert("Couldn’t create a plan: " + (err.message || String(err)));
  }
}

function init() {
  planSection.hidden = true;
  if (timerSection) timerSection.hidden = true;
  form.addEventListener("submit", handleSubmit);
}

init();
