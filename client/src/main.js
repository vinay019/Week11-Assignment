const SERVER_URL = "https://week11-assignment-server.onrender.com";

const form = document.getElementById("plan-form");
const planSection = document.getElementById("plan");
const stepsEl = document.getElementById("steps");
const pomodoroEl = document.getElementById("pomodoro");

async function handleSubmit(event) {
  event.preventDefault();

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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Server error");
    }

    const plan = await res.json();

    stepsEl.innerHTML = "";
    (plan.steps || []).forEach(function (s) {
      const li = document.createElement("li");
      li.textContent = s.title + " -> " + s.minutes + " min";
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
    } else {
      pomodoroEl.textContent = "";
    }

    planSection.hidden = false;
  } catch (err) {
    console.error(err);
    alert("Couldn’t create a plan: " + (err.message || String(err)));
  }
}

function init() {
  form.addEventListener("submit", handleSubmit);
}

init();
