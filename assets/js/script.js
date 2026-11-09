(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
    chart: '<path d="M4 4v16h17M8 15l4-5 4 2 5-7"/>',
    target:
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flame:
      '<path d="M12 3c2 5 7 7 7 12a7 7 0 0 1-14 0c0-3 2-5 4-7 0 3 2 4 2 4s3-4 1-9Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.activity}</svg>`;
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const shiftDate = (date, amount) => {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  };
  const validDate = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(+parseDate(value)) &&
    dateKey(parseDate(value)) === value;
  const formatDate = (value, options = { month: "short", day: "numeric" }) =>
    parseDate(value).toLocaleDateString(undefined, options);
  const sum = (items, field) =>
    items.reduce((total, item) => total + (item[field] || 0), 0);
  const number = (value) => value.toLocaleString();
  const storageKey = "jays-fit-tracker-v1";
  const types = [
    "Walking",
    "Running",
    "Strength",
    "Cycling",
    "Swimming",
    "Yoga",
    "Other",
  ];
  let storageWarning = "";
  let state = {
    workouts: [],
    goals: { workouts: 3, minutes: 150, calories: 1000 },
  };
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (
        !data ||
        !Array.isArray(data.workouts) ||
        !data.goals ||
        !["workouts", "minutes", "calories"].every(
          (k) => Number.isInteger(data.goals[k]) && data.goals[k] > 0,
        ) ||
        !data.workouts.every(
          (w) =>
            w &&
            typeof w.id === "string" &&
            typeof w.name === "string" &&
            validDate(w.date) &&
            types.includes(w.type) &&
            Number.isInteger(w.minutes) &&
            w.minutes > 0 &&
            Number.isInteger(w.calories) &&
            w.calories >= 0 &&
            typeof w.notes === "string" &&
            typeof w.intensity === "string",
        )
      )
        throw Error("Invalid saved data");
      state = data;
    }
  } catch {
    storageWarning =
      "Saved data could not be loaded. Changes will not overwrite it. Please enable browser storage or use another browser to start fresh.";
  }
  const persist = () => {
    if (storageWarning) {
      toast(storageWarning);
      return false;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch {
      toast(
        "Could not save. Your browser storage may be full or unavailable. Please try again.",
      );
      return false;
    }
  };
  let weekOffset = 0,
    quoteIndex = 0,
    pendingDelete = null,
    toastTimer;
  const quotes = [
    "You don’t have to be perfect. You just have to keep showing up.",
    "Progress isn’t always loud. Sometimes it’s simply trying again tomorrow.",
    "Your only competition is the person you were yesterday.",
    "A short workout still counts. Every step is a step forward.",
    "Build a routine you can return to. Consistency grows one day at a time.",
  ];
  const currentPage = () =>
    [
      "dashboard",
      "workouts",
      "progress",
      "goals",
      "achievements",
      "plan",
    ].includes(location.hash.slice(1))
      ? location.hash.slice(1)
      : "dashboard";
  $(".skip").addEventListener("click", (event) => {
    event.preventDefault();
    $("#main").focus();
  });
  function week() {
    const now = new Date();
    const monday = shiftDate(now, -((now.getDay() + 6) % 7) + weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) =>
      dateKey(shiftDate(monday, i)),
    );
    return {
      days,
      items: state.workouts.filter(
        (w) => w.date >= days[0] && w.date <= days[6],
      ),
    };
  }
  function streak(longest = false) {
    const dates = [
      ...new Set(
        state.workouts
          .map((w) => w.date)
          .filter((d) => d <= dateKey(new Date())),
      ),
    ].sort();
    if (longest) {
      let best = 0,
        count = 0,
        last = null;
      dates.forEach((d) => {
        count =
          last && dateKey(shiftDate(parseDate(last), 1)) === d ? count + 1 : 1;
        best = Math.max(best, count);
        last = d;
      });
      return best;
    }
    let date = new Date(),
      count = 0;
    if (!dates.includes(dateKey(date))) date = shiftDate(date, -1);
    while (dates.includes(dateKey(date))) {
      count++;
      date = shiftDate(date, -1);
    }
    return count;
  }
  function milestones() {
    return [
      {
        name: "First step",
        description: "Log your very first workout.",
        value: state.workouts.length,
        target: 1,
      },
      {
        name: "Finding your rhythm",
        description: "Complete 5 workouts.",
        value: state.workouts.length,
        target: 5,
      },
      {
        name: "The consistent club",
        description: "Build a 3-day workout streak.",
        value: streak(true),
        target: 3,
      },
      {
        name: "Time well spent",
        description: "Reach 150 total active minutes.",
        value: sum(state.workouts, "minutes"),
        target: 150,
      },
      {
        name: "Double digits",
        description: "Complete 10 workouts.",
        value: state.workouts.length,
        target: 10,
      },
      {
        name: "A week of you",
        description: "Build a 7-day workout streak.",
        value: streak(true),
        target: 7,
      },
    ];
  }
  function heading(title, subtitle, action = true) {
    return `<div class="page-heading"><div><p class="eyebrow">LET’S BUILD YOUR CONSISTENCY</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action ? '<button class="button primary" data-log><span>＋</span> Log workout</button>' : ""}</div>`;
  }
  function stats() {
    const values = [
      [
        "Total workouts",
        number(state.workouts.length),
        "",
        "Every session counts",
        "activity",
      ],
      [
        "Active minutes",
        number(sum(state.workouts, "minutes")),
        "min",
        "Time invested in you",
        "clock",
      ],
      [
        "Calories burned",
        number(sum(state.workouts, "calories")),
        "kcal",
        "Your logged estimates",
        "flame",
      ],
      [
        "Current streak",
        streak(),
        streak() === 1 ? "day" : "days",
        "One day at a time",
        "bolt",
      ],
    ];
    return `<div class="stats">${values.map(([title, value, unit, note, i]) => `<article class="stat"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon(i)}</span></div><div class="stat-value">${value}<small>${unit}</small></div><div class="stat-note">${note}</div></article>`).join("")}</div>`;
  }
  function weekControls() {
    const { days } = week();
    return `<div class="week-controls"><button class="icon-button" data-week="-1" aria-label="Previous week">‹</button><span>${formatDate(days[0])} – ${formatDate(days[6], { month: "short", day: "numeric", year: "numeric" })}</span><button class="icon-button" data-week="1" aria-label="Next week" ${weekOffset >= 0 ? "disabled" : ""}>›</button></div>`;
  }
  function calendar() {
    const { days, items } = week();
    return `<section class="panel"><div class="section-heading"><h2>${weekOffset === 0 ? "This week" : "Your week"}</h2>${weekControls()}</div><div class="calendar">${days
      .map((d) => {
        const count = items.filter((w) => w.date === d).length;
        return `<div class="day ${count ? "completed" : ""} ${d === dateKey(new Date()) ? "is-today" : ""}" aria-label="${formatDate(d, { weekday: "long", month: "long", day: "numeric" })}: ${count} workouts"><span class="day-name">${formatDate(d, { weekday: "short" })}</span><strong>${parseDate(d).getDate()}</strong><span class="dot"></span></div>`;
      })
      .join(
        "",
      )}</div><p class="calendar-key"><i></i> Workout completed <span style="margin-left:auto">${new Set(items.map((w) => w.date)).size} of 7 days active</span></p></section>`;
  }
  function goalProgress() {
    const { items } = week();
    const values = {
      workouts: items.length,
      minutes: sum(items, "minutes"),
      calories: sum(items, "calories"),
    };
    const labels = {
      workouts: "Workouts",
      minutes: "Active minutes",
      calories: "Calories burned",
    };
    return `<section class="panel"><div class="section-heading"><h2>Weekly goals</h2><a class="text-link" href="#goals">Edit goals ↗</a></div>${Object.keys(
      values,
    )
      .map(
        (k) =>
          `<div class="goal"><div class="goal-line"><span>${labels[k]}</span><span>${number(values[k])} / ${number(state.goals[k])}</span></div><progress value="${Math.min(values[k], state.goals[k])}" max="${state.goals[k]}" aria-label="${labels[k]}: ${values[k]} of ${state.goals[k]}"></progress></div>`,
      )
      .join(
        "",
      )}<p class="goal-foot">${Object.keys(values).filter((k) => values[k] >= state.goals[k]).length} of 3 goals reached · ${weekOffset === 0 ? "You’ve got this." : "Keep building on your progress."}</p></section>`;
  }
  const empty = () =>
    `<div class="empty"><span class="empty-icon">${icon("activity")}</span><h3>Your story starts with one workout.</h3><p>A walk, a swim, a session at the gym. Start where you are and make it count.</p><button class="button secondary" data-log>Log your first workout ↗</button></div>`;
  function rows(items, editable = false) {
    if (!items.length)
      return state.workouts.length && editable
        ? '<div class="empty"><h3>No matching workouts</h3><p>Try another name or workout type.</p></div>'
        : empty();
    return items
      .map(
        (w) =>
          `<article class="workout-row"><span class="workout-icon">${icon(w.type === "Strength" ? "bolt" : "activity")}</span><div class="workout-info"><strong>${escapeHTML(w.name)}</strong><small>${escapeHTML(w.type)} · ${formatDate(w.date, { month: "short", day: "numeric", year: "numeric" })}${editable ? " · " + escapeHTML(w.intensity) : ""}</small>${editable && w.notes ? `<p>${escapeHTML(w.notes)}</p>` : ""}</div><div class="workout-metrics">${number(w.minutes)} min<small>${number(w.calories)} kcal</small></div>${editable ? `<div class="row-actions"><button data-edit="${escapeHTML(w.id)}" aria-label="Edit ${escapeHTML(w.name)}">Edit</button><button data-delete="${escapeHTML(w.id)}" aria-label="Delete ${escapeHTML(w.name)}">Delete</button></div>` : ""}</article>`,
      )
      .join("");
  }
  const sorted = () =>
    [...state.workouts].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    );
  function dashboard() {
    const next =
      milestones().find((m) => m.value < m.target) || milestones()[5];
    return (
      heading(
        "Every move matters.",
        "Welcome to your personal space for a stronger you.",
      ) +
      `<section class="hero"><p class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>Small steps today.<br><em>Stronger you tomorrow.</em></h2><p>Find your rhythm, celebrate your progress, and keep moving forward.</p><div class="hero-art" aria-hidden="true"><span>↗</span></div></section>` +
      stats() +
      `<div class="dashboard-grid"><div class="stack">${calendar()}<section class="panel"><div class="section-heading"><h2>Recent workouts</h2><a href="#workouts" class="text-link">View all ↗</a></div>${rows(sorted().slice(0, 3))}</section></div><div class="stack">${goalProgress()}<section class="panel quote-panel"><p class="eyebrow">${icon("bolt")} A LITTLE EXTRA MOTIVATION</p><blockquote id="quote">“${quotes[quoteIndex]}”</blockquote><button class="text-link" data-inspire>Another boost ↗</button></section><section class="panel"><div class="section-heading"><h2>Your next milestone</h2><a class="text-link" href="#achievements">View all ↗</a></div><div class="achievement-mini"><span class="badge-icon">${icon("award")}</span><div><strong>${next.name}</strong><p>${next.description}</p><span class="badge-status">${Math.min(next.value, next.target)} / ${next.target} ${next.value >= next.target ? "· Unlocked" : ""}</span></div></div></section></div></div>`
    );
  }
  function workouts() {
    return (
      heading(
        "Your effort, recorded.",
        "Every workout is another step forward. Here’s your journey so far.",
      ) +
      `<section class="panel"><div class="toolbar"><input type="search" id="search" aria-label="Search workouts" placeholder="Search your workouts…"><select id="type-filter" aria-label="Filter workout type"><option value="">All activities</option>${types.map((t) => `<option>${t}</option>`).join("")}</select></div><div id="workout-list">${rows(sorted(), true)}</div></section>`
    );
  }
  function progress() {
    const { days, items } = week();
    const minutes = days.map((d) =>
      sum(
        items.filter((w) => w.date === d),
        "minutes",
      ),
    );
    const max = Math.max(30, ...minutes);
    return (
      heading(
        "Look how far you’ve come.",
        "See the habits you’re building, one week at a time.",
      ) +
      stats() +
      `<div class="dashboard-grid"><div class="stack"><section class="panel"><div class="section-heading"><div><h2>Weekly activity</h2><p>Exercise minutes per day</p></div>${weekControls()}</div><div class="chart" role="img" aria-label="${days.map((d, i) => formatDate(d, { weekday: "long" }) + ": " + minutes[i] + " minutes").join(", ")}">${minutes.map((m, i) => `<div class="chart-column"><small>${m}</small><div class="chart-bar" style="height:${Math.max(2, (m / max) * 145)}px"></div><span class="chart-label">${formatDate(days[i], { weekday: "short" })}</span></div>`).join("")}</div><div class="summary"><strong>${items.length} workouts</strong> · ${number(sum(items, "minutes"))} minutes · ${number(sum(items, "calories"))} estimated kcal<p style="margin:12px 0 0">${items.length ? "That’s time you chose to invest in yourself. Keep building on it." : "No workouts recorded for this week yet. A little movement is a great start."}</p></div></section>${calendar()}</div><div class="stack">${goalProgress()}<section class="panel"><h2>Your consistency</h2><p class="summary">Longest streak: <strong>${streak(true)} days</strong><br>Total active days: <strong>${new Set(state.workouts.map((w) => w.date)).size}</strong></p><p class="helper">A streak counts consecutive days with a logged workout. Rest days are valuable, too.</p></section></div></div>`
    );
  }

  function assignedWeek() {
    const { days } = week();
    return planDays().filter((d) => d.date >= days[0] && d.date <= days[6]);
  }
  // Include the prescription in the key so an edited schedule isn't marked done by an old check.
  const sessionKey = (d) =>
    `${state.plan.start}|${d.date}|${d.kind}|${d.total}`;
  function assignedGoals() {
    const days = assignedWeek(),
      active = days.filter((d) => d.total);
    const done = active.filter((d) => state.planChecks?.[sessionKey(d)]).length;
    if (!state.plan)
      return `<section class="panel"><h2>Your assigned workouts</h2><p class="muted">Create a 90-day plan to see your daily workouts here.</p><a class="button primary" href="#plan">Create a plan ↗</a></section>`;
    if (!days.length)
      return '<section class="panel"><h2>Your assigned workouts</h2><p class="muted">This week is outside your 90-day plan.</p></section>';
    return `<section class="panel"><div class="section-heading"><h2>Your assigned workouts</h2><a href="#plan" class="text-link">View plan ↗</a></div><p><strong>${done} of ${active.length} sessions complete</strong> · ${sum(days, "total")} planned minutes</p><progress value="${done}" max="${Math.max(1, active.length)}" aria-label="Assigned sessions completed"></progress><p class="helper">Check off the session you completed. Use Log workout to record its actual minutes and calories in your statistics. Checking a box alone does not add a workout.</p>${days.map((d) => `<div class="assigned-row ${d.date === dateKey(new Date()) ? "assigned-today" : ""}">${d.total ? `<label class="check-label"><input type="checkbox" data-plan-check="${escapeHTML(sessionKey(d))}" ${state.planChecks?.[sessionKey(d)] ? "checked" : ""} ${d.date > dateKey(new Date()) ? "disabled" : ""}><span><strong>${formatDate(d.date, { weekday: "long", month: "short", day: "numeric" })}${d.date === dateKey(new Date()) ? " · Today" : ""}</strong><span>${d.kind} · ${d.total} minutes</span><small>${sessionDescription(d)}</small></span></label><button class="button secondary" data-log-assigned="${d.date}" ${d.date > dateKey(new Date()) ? "disabled" : ""}>Log workout</button>` : `<div class="rest-label"><strong>${formatDate(d.date, { weekday: "long", month: "short", day: "numeric" })}</strong><span>Rest day · Recover and recharge. No session to complete.</span></div>`}</div>`).join("")}</section>`;
  }
  function personalGoals() {
    const key = week().days[0],
      items = state.personalGoals?.[key] || [];
    return `<section class="panel"><h2>${state.plan ? "My extra goals" : "My weekly checklist"}</h2><p class="helper">Optional personal reminders for this week. Use the activity targets to track workouts, time and calories automatically; use this checklist for other habits.</p><p>${items.filter((g) => g.done).length} of ${items.length} complete</p>${items.map((g) => `<div class="assigned-row"><label class="check-label"><input type="checkbox" data-personal-check="${escapeHTML(g.id)}" ${g.done ? "checked" : ""}><span>${escapeHTML(g.text)}</span></label><button class="icon-button" data-remove-goal="${escapeHTML(g.id)}" aria-label="Remove ${escapeHTML(g.text)}">×</button></div>`).join("")}<form id="personal-goal-form"><label>Add a goal for this week<input name="goal" maxlength="120" placeholder="e.g. Stretch after each strength session" required></label><button class="button primary">Add personal goal</button></form></section>`;
  }
  function goals() {
    const manual = state.plan
      ? `<section class="panel"><h2>Plan-managed targets</h2><p class="helper">Your workout count and minutes come from this week's assigned sessions. Add your own checklist goals without changing the plan.</p><a href="#plan" class="text-link">Edit the 90-day plan ↗</a></section>`
      : `<section class="panel"><h2>Create your weekly activity goals</h2><p class="helper">No 90-day plan needed. Set a workout count, exercise minutes and estimated calories burned. Log workouts to update all three progress bars automatically. These targets repeat each week until you change them.</p><form id="goals-form"><label>Workouts per week<input name="workouts" type="number" min="1" max="100" required value="${state.goals.workouts}"></label><label>Minutes per week<input name="minutes" type="number" min="1" max="10080" required value="${state.goals.minutes}"></label><label>Estimated calories burned per week<input name="calories" type="number" min="1" max="100000" required value="${state.goals.calories}"></label><button class="button primary">Save activity targets</button></form></section>`;
    return (
      heading(
        "Your week, one step at a time.",
        "Follow your assigned sessions and make room for your own goals.",
        false,
      ) +
      `<div class="section-heading"><h2>Weekly checklist</h2>${weekControls()}</div><div class="dashboard-grid"><div class="stack">${state.plan ? assignedGoals() : manual}${personalGoals()}</div><div class="stack">${goalProgress()}${state.plan ? manual : '<section class="panel"><h2>Track your exercise</h2><p class="helper">Record running, walking, lifting, swimming or another activity, with its duration and estimated calories burned.</p><button class="button primary" data-log>Log workout</button></section>'}<section class="panel"><h2>Two ways to see your progress</h2><p class="helper">The checklist shows which assigned sessions you marked complete. The activity bars show workouts and minutes you actually logged. Rest days are not counted as missed workouts.</p></section></div></div>`
    );
  }
  function saveGoalChange(change) {
    const previous = JSON.parse(JSON.stringify(state));
    change();
    if (!persist()) {
      state = previous;
      render();
      return;
    }
    render();
  }
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el.hasAttribute("data-plan-check")) {
      const session = assignedWeek().find(
        (d) => sessionKey(d) === el.dataset.planCheck,
      );
      if (!session || session.date > dateKey(new Date())) return;
      saveGoalChange(() => {
        state.planChecks ??= {};
        state.planChecks[el.dataset.planCheck] = el.checked;
      });
    }
    if (el.hasAttribute("data-personal-check"))
      saveGoalChange(() => {
        const goal = state.personalGoals?.[week().days[0]]?.find(
          (g) => g.id === el.dataset.personalCheck,
        );
        if (goal) goal.done = el.checked;
      });
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id !== "personal-goal-form") return;
    event.preventDefault();
    const text = new FormData(event.target).get("goal").trim();
    if (!text) {
      toast("Enter a goal first.");
      return;
    }
    saveGoalChange(() => {
      state.personalGoals ??= {};
      const key = week().days[0];
      state.personalGoals[key] ??= [];
      state.personalGoals[key].push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: text.slice(0, 120),
        done: false,
      });
    });
    toast("Personal goal added for this week.");
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-remove-goal"))
      saveGoalChange(() => {
        const key = week().days[0];
        state.personalGoals[key] = state.personalGoals[key].filter(
          (g) => g.id !== button.dataset.removeGoal,
        );
      });
    if (button.hasAttribute("data-log-assigned")) {
      const d = assignedWeek().find(
        (d) => d.date === button.dataset.logAssigned,
      );
      if (!d || d.date > dateKey(new Date())) return;
      openWorkout();
      const form = $("#workout-form");
      form.elements.name.value = d.kind;
      form.elements.date.value = d.date;
      form.elements.minutes.value = d.total;
      form.elements.type.value = d.strength
        ? "Strength"
        : d.cardio
          ? d.kind === "Cycling"
            ? "Cycling"
            : "Walking"
          : "Other";
      form.elements.notes.value = d.exercises;
    }
  });
  function achievements() {
    const list = milestones();
    return (
      heading(
        "Celebrate your small wins.",
        "Every milestone has a story. These are yours.",
        false,
      ) +
      `<div class="info-banner">${list.filter((m) => m.value >= m.target).length} of ${list.length} milestones unlocked. Your achievements reflect your current workout history.</div><div class="achievement-grid">${list.map((m) => `<article class="panel achievement-card ${m.value < m.target ? "locked" : ""}"><span class="badge-icon">${icon("award")}</span><span class="badge-status ${m.value < m.target ? "locked" : ""}">${m.value >= m.target ? "✓ Unlocked" : "In progress · " + Math.min(m.value, m.target) + " / " + m.target}</span><h2 style="margin-top:10px">${m.name}</h2><p>${m.description}</p><progress value="${Math.min(m.value, m.target)}" max="${m.target}" aria-label="${m.name}: ${m.value} of ${m.target}"></progress></article>`).join("")}</div>`
    );
  }

  // Older plans stored kilograms. Convert once, including the latest weigh-in.
  if (state.plan && state.plan.unit !== "lb") {
    const old = JSON.parse(JSON.stringify(state.plan));
    ["weight", "target", "latest"].forEach((k) => {
      if (state.plan[k])
        state.plan[k] = Math.round(state.plan[k] * 2.2046226218 * 10) / 10;
    });
    state.plan.unit = "lb";
    if (!persist()) state.plan = old;
  }
  const avatar = $(".avatar");
  const menu = document.createElement("details");
  menu.className = "profile-menu";
  menu.innerHTML =
    '<summary aria-label="Personal workspace appearance">J <span>⌄</span></summary><div class="appearance-menu"><strong>Appearance</strong><button type="button" data-theme="dark">Dark mode</button><button type="button" data-theme="light">Light mode</button></div>';
  avatar.replaceWith(menu);
  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    menu
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.theme === theme)),
      );
  };
  try {
    setTheme(localStorage.getItem("jays-theme") === "light" ? "light" : "dark");
  } catch {
    setTheme("dark");
  }
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme]");
    if (!b) return;
    setTheme(b.dataset.theme);
    try {
      localStorage.setItem("jays-theme", b.dataset.theme);
    } catch {
      toast("Appearance changed for this visit only.");
    }
    menu.open = false;
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.open = false;
    }
  });
  const planNav = document.createElement("a");
  planNav.href = "#plan";
  planNav.dataset.page = "plan";
  planNav.innerHTML = icon("target") + "90-day plan";
  document.querySelector("nav").append(planNav);

  let editingPlan = false;
  const direction = (p) =>
    p.target > p.weight ? "gain" : p.target < p.weight ? "lose" : "maintain";
  function planDays() {
    return state.plan
      ? Array.from({ length: 90 }, (_, i) => {
          const p = state.plan,
            date = dateKey(shiftDate(parseDate(p.start), i)),
            day = (parseDate(date).getDay() + 6) % 7;
          const gain = direction(p) === "gain",
            budget = Number(p.time) || 45;
          // Gradual first three weeks; longer availability is a ceiling, not a mandate.
          const cap =
            { beginner: 45, regular: 60, experienced: 90 }[p.level] || 45;
          const factor = i < 7 ? 0.75 : i < 14 ? 0.85 : 1;
          const total =
            day < 5
              ? Math.max(
                  5,
                  Math.min(
                    Math.floor(budget / 5) * 5,
                    Math.round((Math.min(budget, cap) * factor) / 5) * 5,
                  ),
                )
              : 0;
          const strengthDay = gain
            ? [0, 2, 4].includes(day)
            : [1, 3].includes(day);
          const warmup = total >= 15 ? 5 : 0;
          const work = total - warmup;
          const strength = strengthDay ? work : 0;
          const cardio = !strengthDay && !gain ? work : 0;
          const mobility = !strengthDay && gain ? work : 0;
          const kind = !total
            ? "Rest day"
            : strengthDay
              ? gain
                ? day === 0
                  ? "Upper body — chest & shoulders"
                  : day === 2
                    ? "Lower body — legs & glutes"
                    : "Upper body — back & arms"
                : day === 1
                  ? "Upper body — chest & back"
                  : "Lower body — legs & glutes"
              : gain
                ? "Stretching"
                : day === 2
                  ? "Cycling"
                  : "Brisk walking";
          const exercises = !total
            ? "Rest and recover."
            : strengthDay
              ? kind.includes("Lower")
                ? "Chair squats, glute bridges and standing calf raises."
                : kind.includes("back & arms")
                  ? "Resistance-band rows, light dumbbell curls and standing reverse flyes."
                  : kind.includes("chest & back")
                    ? "Wall push-ups, resistance-band rows and light dumbbell shoulder presses."
                    : "Wall or incline push-ups and light dumbbell shoulder presses."
              : gain
                ? "Standing calf stretch, seated hamstring stretch, doorway chest stretch and shoulder circles. Move comfortably; do not bounce or force a stretch."
                : day === 2
                  ? "Ride a stationary or outdoor bicycle at a comfortable, steady pace."
                  : "Walk at a comfortable-to-brisk pace on a flat route or treadmill.";
          return {
            date,
            total,
            strength,
            cardio,
            mobility,
            warmup,
            kind,
            exercises,
          };
        })
      : [];
  }
  function sessionDescription(d) {
    if (!d.total) return "No planned training. Rest and recover.";
    const main = d.strength || d.cardio || d.mobility;
    return `${main} min ${d.strength ? "lifting / bodyweight exercises (including rests)" : d.cardio ? (d.kind === "Cycling" ? "cycling" : "walking") : "stretching"}${d.warmup ? ` + ${d.warmup} min warm-up / cool-down` : ""}. ${d.exercises}${d.strength ? " Start with 1–2 comfortable sets of each exercise, resting between sets. Repeat only within your scheduled time." : ""}${!d.warmup ? " Start and finish gently within this short session." : ""}`;
  }
  function calorieEstimate(p) {
    if (!p.age || !p.sex || !p.activity)
      return {
        reason:
          "Add age, equation setting and activity level in Edit plan to calculate your estimate.",
      };
    if (p.age < 18 || p.age > 78 || p.special === "yes")
      return {
        reason:
          "This calculator is not suitable for your profile. A clinician or dietitian can set an individual nutrition target; your workout schedule remains available.",
      };
    const kg = (p.latest || p.weight) / 2.2046226218,
      cm = (p.feet * 12 + p.inches) * 2.54;
    const bmi = kg / (cm / 100) ** 2,
      goalBmi = p.target / 2.2046226218 / (cm / 100) ** 2;
    if (bmi < 18.5 || goalBmi < 18.5)
      return {
        reason:
          "Your current or target weight is below the standard adult screening range. Get an individual nutrition target rather than using an automatic calorie recommendation.",
      };
    const rest =
      10 * kg + 6.25 * cm - 5 * p.age + (p.sex === "male" ? 5 : -161);
    const maintenance = Math.round((rest * Number(p.activity)) / 50) * 50;
    const mode = direction(p),
      adjust =
        mode === "gain"
          ? 300
          : mode === "lose"
            ? -Math.min(300, maintenance * 0.15)
            : 0;
    const target = Math.round((maintenance + adjust) / 50) * 50;
    if (target < (p.sex === "male" ? 1500 : 1200))
      return {
        reason:
          "The estimated intake is too low for this general calculator. Please use an individually assessed nutrition target.",
      };
    return { maintenance, target, mode };
  }
  function applyPlan() {
    if (!state.plan) return;
    const days = week().days,
      sessions = planDays().filter(
        (d) => d.date >= days[0] && d.date <= days[6],
      );
    state.goals = { ...state.plan.previous };
    if (sessions.length) {
      state.goals.workouts = Math.max(
        1,
        sessions.filter((d) => d.total).length,
      );
      state.goals.minutes = Math.max(1, sum(sessions, "total"));
    }
  }
  function planForm() {
    const p = state.plan || {};
    const input = (name, label, min, max, step = 1) =>
      `<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${escapeHTML(p[name] ?? "")}" required></label>`;
    const select = (name, label, options) =>
      `<label>${label}<select name="${name}">${options.map(([v, t]) => `<option value="${v}" ${String(p[name]) === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
    return (
      heading(
        "A plan that fits you.",
        "Build strength, find your rhythm, and leave room to recover.",
        false,
      ) +
      `<section class="panel"><form id="plan-form"><div class="form-grid">${input("weight", "Starting weight (lb / pounds)", 66, 880, 0.1)}${input("target", "Target weight (lb / pounds)", 66, 880, 0.1)}${input("feet", "Height (feet)", 3, 8)}${input("inches", "Height (inches)", 0, 11)}${input("age", "Age (years)", 18, 100)}${select(
        "sex",
        "Sex setting for the calorie equation",
        [
          ["female", "Female equation"],
          ["male", "Male equation"],
        ],
      )}</div>${select("level", "Current fitness level", [
        ["beginner", "Beginner — starting or returning"],
        ["regular", "Regular — active some days"],
        ["experienced", "Experienced — consistent routine"],
      ])}${select("activity", "Overall activity, including planned workouts", [
        ["1.2", "Mostly seated / very little activity"],
        ["1.375", "Lightly active"],
        ["1.55", "Moderately active"],
        ["1.725", "Very active / physical work"],
      ])}<p class="helper">Choose your expected overall activity. Workout calories are not added again. The equation uses sex-specific constants and may be less accurate for some bodies, including during hormone therapy.</p><div class="form-grid">${input("currentIntake", "Current daily calorie intake (kcal)", 1, 10000)}${input("time", "Available workout time per day (minutes)", 5, 180)}</div>${select(
        "special",
        "Pregnant, breastfeeding, eating-disorder history, or a condition needing a prescribed diet?",
        [
          ["no", "No"],
          ["yes", "Yes — skip automatic calorie advice"],
        ],
      )}<p class="helper">An estimate, not a guarantee of weight change. If weight loss is unexplained or continues despite eating more, seek medical advice.</p><button class="button primary">${state.plan ? "Update plan" : "Create my plan"}</button>${state.plan ? '<button type="button" class="button secondary" id="cancel-plan-edit">Cancel</button>' : ""}</form></section>`
    );
  }
  function plan() {
    if (!state.plan || editingPlan) return planForm();
    const p = state.plan,
      e = calorieEstimate(p),
      mode = direction(p),
      days = planDays();
    const nutrition = e.reason
      ? `<p>${e.reason}</p>`
      : `<div class="stats"><div class="stat"><div class="stat-top">Estimated maintenance</div><div class="stat-value">${number(e.maintenance)}<small>kcal/day</small></div></div><div class="stat"><div class="stat-top">Starting daily food target</div><div class="stat-value">${number(e.target)}<small>kcal/day</small></div></div></div><p>${mode === "gain" ? "A modest surplus supports gradual weight gain alongside strength training. Add a snack or larger portions, with protein at meals." : mode === "lose" ? "A modest deficit supports gradual weight loss. Keep regular meals, protein, vegetables and satisfying portions; avoid skipping meals to compensate for workouts." : "Aim near estimated maintenance while keeping a balanced routine."}</p><p>Compared with your reported ${number(p.currentIntake)} kcal/day: ${Math.abs(e.target - p.currentIntake)} kcal ${e.target >= p.currentIntake ? "more" : "less"}. Your reported intake is not a measured maintenance level.</p>`;
    return (
      heading(
        "Grow at your own pace.",
        `${mode === "gain" ? "Strength-focused" : mode === "lose" ? "Cardio + strength" : "Balanced"} plan · 90 days of movement and recovery`,
        false,
      ) +
      `<section class="panel"><div class="section-heading"><h2>${p.weight} lb toward ${p.target} lb</h2><button class="button secondary" id="edit-plan">Edit plan</button></div><p>Latest weight: ${p.latest || p.weight} lb · Available time: ${p.time || 45} min/day</p>${nutrition}<details><summary>How the estimate works</summary><p>Mifflin–St Jeor resting energy estimate × your selected overall activity factor, then +300 kcal for gain, or up to −300 kcal (at most 15%) for loss. Rounded to 50 kcal. The 90-day deadline does not force a faster change. Recheck your weight trend over 2–3 weeks and adjust with qualified advice; actual needs can differ substantially. Weigh-ins refresh the estimate. Food needs remain on rest days, too.</p><a class="text-link" href="https://pubmed.ncbi.nlm.nih.gov/2305711/">Equation source</a> · <a class="text-link" href="https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/healthy-ways-to-gain-weight/">NHS weight-gain guidance</a></details><form id="weigh-form"><label>Current weight (lb / pounds)<input name="weight" type="number" min="66" max="880" step="0.1" required></label><button class="button secondary">Save weight</button></form><h3>Your training approach</h3><p>${mode === "gain" ? "Monday: chest and shoulders. Wednesday: legs and glutes. Friday: back and arms. Tuesday and Thursday: stretching." : "Tuesday: chest and back. Thursday: legs and glutes. Monday and Friday: brisk walking. Wednesday: cycling."} Weekends are rest days.</p><p>Strength: alternate chair squats, wall or incline push-ups, band rows and glute bridges. Use controlled repetitions, comfortable resistance, and rest between sets. Start with 1–2 sets; add a set or resistance only when comfortable. Session time includes rests and warm-up/cool-down.</p><p class="helper">First two weeks ease in at approximately 75% and 85% of session time, rounded to five-minute increments without exceeding your available time. Then use available time up to 45 minutes for beginners, 60 for regular exercisers, or 90 for experienced exercisers. More time is not automatically better; shorten any session if needed. Weekly goals include the whole session and update automatically. Calorie-burn goals remain separate.</p><button id="stop-plan" class="button secondary">End plan and restore goals</button></section><section class="nature-break"><img src="../images/nature-scene.svg" alt="Quiet lake, layered green hills and evergreen trees"><div><p class="eyebrow">ROOM TO BREATHE</p><h2>Recovery is part of growing.</h2><p>On rest days, enjoy a nature view or a quiet moment outside. No workout to make up.</p></div></section><section class="panel"><h2>Your daily schedule</h2>${days.map((d, i) => `<div class="workout-row"><div><strong>Day ${i + 1} · ${formatDate(d.date)} · ${d.kind}</strong><p>${sessionDescription(d)}</p></div></div>`).join("")}</section>`
    );
  }
  document.addEventListener("submit", (event) => {
    if (!["plan-form", "weigh-form"].includes(event.target.id)) return;
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const data = Object.fromEntries(new FormData(event.target)),
      previous = JSON.parse(JSON.stringify(state));
    if (event.target.id === "plan-form") {
      const p = {
        unit: "lb",
        level: data.level,
        sex: data.sex,
        activity: data.activity,
        special: data.special,
        start: state.plan?.start || dateKey(new Date()),
        previous: { ...(state.plan?.previous || state.goals) },
      };
      for (const k of [
        "feet",
        "inches",
        "age",
        "currentIntake",
        "time",
        "weight",
        "target",
      ])
        p[k] = Number(data[k]);
      if (state.plan?.latest) p.latest = state.plan.latest;
      state.plan = p;
    } else state.plan.latest = Number(data.weight);
    if (!persist()) {
      state = previous;
      return;
    }
    editingPlan = false;
    render();
    toast("Plan saved.");
  });
  document.addEventListener("click", (event) => {
    if (event.target.id === "edit-plan") {
      editingPlan = true;
      render();
    }
    if (event.target.id === "cancel-plan-edit") {
      editingPlan = false;
      render();
    }
    if (event.target.id !== "stop-plan") return;
    const previous = JSON.parse(JSON.stringify(state));
    state.goals = state.plan.previous;
    delete state.plan;
    if (!persist()) {
      state = previous;
      return;
    }
    editingPlan = false;
    render();
  });

  function render() {
    applyPlan();
    const page = currentPage();
    $("#today").textContent = new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    document.querySelectorAll("[data-page]").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === page);
      if (el.dataset.page === page) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    $("#main").innerHTML =
      (storageWarning
        ? `<div class="info-banner" role="alert">${escapeHTML(storageWarning)}</div>`
        : "") +
      { dashboard, workouts, progress, goals, achievements, plan }[page]();
    const buddy = document.createElement("div");
    buddy.className = "buddy-note";
    buddy.innerHTML =
      '<img src="../images/buddy.svg" alt="A smiling, round green fitness buddy with big eyes"><div><strong>A little progress. A big smile.</strong><p>We’re on your team. Take it one comfortable step at a time.</p></div>';
    $("#main").prepend(buddy);
    if (page === "dashboard") {
      const nature = document.createElement("section");
      nature.className = "nature-break";
      nature.innerHTML =
        '<img src="../images/nature-scene.svg" alt="Sunlit green hills, trees and a still lake"><div><p class="eyebrow">A MOMENT OUTSIDE</p><h2>Find your little patch of calm.</h2><p>Take a screen break. Notice a tree, the sky, or the light through your window.</p></div>';
      $("#main").append(nature);
    }
    document.title = `${{ plan: "90-day plan", dashboard: "Overview", workouts: "My workouts", progress: "Progress", goals: "Weekly goals", achievements: "Achievements" }[page]} · Jay’s Fit Tracker`;
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("visible");
    toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      5000,
    );
  }
  function openWorkout(id) {
    const form = $("#workout-form");
    form.reset();
    form.elements.id.value = "";
    form.elements.date.max = dateKey(new Date());
    form.elements.date.value = dateKey(new Date());
    const workout = state.workouts.find((w) => w.id === id);
    if (workout)
      Object.keys(workout).forEach((k) => {
        if (form.elements[k]) form.elements[k].value = workout[k];
      });
    $("#dialog-title").textContent = workout ? "Edit workout" : "Log a workout";
    $("#workout-dialog").showModal();
    form.elements.name.focus();
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-log")) openWorkout();
    if (button.hasAttribute("data-close")) $("#workout-dialog").close();
    if (button.hasAttribute("data-edit")) openWorkout(button.dataset.edit);
    if (button.hasAttribute("data-delete")) {
      pendingDelete = button.dataset.delete;
      $("#delete-dialog").showModal();
      $("[data-cancel-delete]").focus();
    }
    if (button.hasAttribute("data-cancel-delete")) $("#delete-dialog").close();
    if (button.hasAttribute("data-week")) {
      weekOffset = Math.min(0, weekOffset + Number(button.dataset.week));
      render();
    }
    if (button.hasAttribute("data-inspire")) {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      $("#quote").textContent = `“${quotes[quoteIndex]}”`;
    }
  });
  $("#confirm-delete").addEventListener("click", () => {
    const previous = state.workouts;
    state.workouts = state.workouts.filter((w) => w.id !== pendingDelete);
    if (!persist()) {
      state.workouts = previous;
      return;
    }
    $("#delete-dialog").close();
    render();
    toast("Workout deleted. Your progress is up to date.");
  });
  $("#workout-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form));
    const item = {
      ...values,
      id:
        values.id ||
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: values.name.trim(),
      minutes: Number(values.minutes),
      calories: Number(values.calories || 0),
      notes: values.notes.trim(),
    };
    if (
      !item.name ||
      !validDate(item.date) ||
      item.date > dateKey(new Date()) ||
      !Number.isInteger(item.minutes) ||
      item.minutes < 1 ||
      item.minutes > 1440 ||
      !Number.isInteger(item.calories) ||
      item.calories < 0 ||
      item.calories > 20000 ||
      !types.includes(item.type)
    ) {
      toast(
        "Please enter a name, a valid past or current date, and a valid duration.",
      );
      return;
    }
    const unlocked = milestones().filter((m) => m.value >= m.target).length;
    const previous = state.workouts;
    state.workouts = values.id
      ? state.workouts.map((w) => (w.id === values.id ? item : w))
      : [...state.workouts, item];
    if (!persist()) {
      state.workouts = previous;
      return;
    }
    $("#workout-dialog").close();
    render();
    toast(
      milestones().filter((m) => m.value >= m.target).length > unlocked
        ? "Milestone unlocked! Your consistency is paying off."
        : values.id
          ? "Workout updated. Your progress is up to date."
          : "Workout saved. You showed up for yourself today!",
    );
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id !== "goals-form") return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const previous = state.goals;
    const next = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, Number(v)]),
    );
    if (!Object.values(next).every((v) => Number.isInteger(v) && v > 0)) return;
    state.goals = next;
    if (!persist()) {
      state.goals = previous;
      return;
    }
    render();
    toast("Weekly goals saved. Let’s make it a good week.");
  });
  function filterWorkouts() {
    const search = $("#search"),
      filter = $("#type-filter");
    if (!search || !filter) return;
    const query = search.value.toLowerCase().trim();
    $("#workout-list").innerHTML = rows(
      sorted().filter(
        (w) =>
          (!filter.value || w.type === filter.value) &&
          `${w.name} ${w.notes}`.toLowerCase().includes(query),
      ),
      true,
    );
  }
  document.addEventListener("input", (event) => {
    if (event.target.id === "search") filterWorkouts();
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "type-filter") filterWorkouts();
  });
  window.addEventListener("hashchange", () => {
    weekOffset = 0;
    render();
    $("#main").focus();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) location.reload();
  });
  render();
})();
