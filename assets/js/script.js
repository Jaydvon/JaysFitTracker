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
    ["dashboard", "workouts", "progress", "goals", "achievements", "plan"].includes(
      location.hash.slice(1),
    )
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
  function goals() {
    return (
      heading(
        "Give your week a direction.",
        "Make it achievable. Make it yours.",
        false,
      ) +
      `<div class="dashboard-grid"><section class="panel goal-editor"><h2>Set your weekly goals</h2><p class="subtitle">These targets apply to each Monday–Sunday week.</p><form id="goals-form"><label>Workouts per week<input name="workouts" type="number" min="1" max="100" step="1" required value="${state.goals.workouts}"></label><label>Active minutes per week<input name="minutes" type="number" min="1" max="10080" step="1" required value="${state.goals.minutes}"></label><label>Estimated calories per week<input name="calories" type="number" min="1" max="100000" step="1" required value="${state.goals.calories}"></label><div class="info-banner">Start with a goal that fits your life. You can adjust it as your routine grows.</div><button class="button primary" type="submit">Save my goals ↗</button></form></section><div class="stack">${goalProgress()}<section class="panel"><h2>A fresh start, every week.</h2><p class="summary">Your weekly progress resets each Monday. Your workout history and achievements stay with you.</p><p class="helper">Changing these targets also updates comparisons for previous weeks.</p></section></div></div>`
    );
  }
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

  const planNav=document.createElement('a');planNav.href='#plan';planNav.dataset.page='plan';planNav.innerHTML=icon('target')+'90-day plan';document.querySelector('nav').append(planNav);
  function planDays(){return state.plan?Array.from({length:90},(_,i)=>{const date=dateKey(shiftDate(parseDate(state.plan.start),i));const day=(parseDate(date).getDay()+6)%7;return {date,minutes:day<5?Math.min(30,15+Math.floor(i/21)*5):0,strength:day===1||day===3};}):[];}
  function applyPlan(){if(!state.plan)return;const days=week().days;const sessions=planDays().filter(d=>d.date>=days[0]&&d.date<=days[6]);state.goals={...state.plan.previous};if(sessions.length){state.goals.workouts=Math.max(1,sessions.filter(d=>d.minutes).length);state.goals.minutes=Math.max(1,sum(sessions,'minutes')+sessions.filter(d=>d.strength).length*15);}}
  function plan(){
    if(!state.plan)return heading('Your next 90 days.','A gradual activity plan for adults. Target weight is a direction, not a guaranteed outcome.',false)+`<section class="panel"><form id="plan-form"><label>Current weight (kg)<input name="weight" type="number" min="30" max="400" step="0.1" required></label><label>Target weight (kg)<input name="target" type="number" min="30" max="400" step="0.1" required></label><label>Daily calorie intake target (optional, set with a qualified professional)<input name="intake" type="number" min="1" max="10000" step="1"></label><p>Weight alone cannot determine suitable calorie intake. This is a general activity plan, not a personalized weight-loss prescription. Seek individualized advice for medical conditions, pregnancy or eating-disorder concerns.</p><button class="button primary">Create my plan</button></form></section>`;
    const p=state.plan;return heading('Your 90-day journey.','Weekly activity goals update automatically.',false)+`<section class="panel"><h2>${p.weight} kg toward ${p.target} kg</h2><p>Latest weight: ${p.latest||p.weight} kg</p><p>Daily food target: ${p.intake?p.intake+' kcal (your personal target)':'Not set. Get individualized nutrition advice to establish a suitable target.'}</p><p>Choose regular, balanced meals with vegetables, fruit, protein foods and grains. Food intake and calories burned are separate measures.</p><form id="weigh-form"><label>Current weight (kg)<input name="weight" type="number" min="30" max="400" step="0.1" required></label><button class="button secondary">Save weight</button></form><p>Strength sessions: 15 minutes of comfortable chair squats, wall push-ups and band rows, with rests. Adapt to your ability; stop if in pain. The walking schedule gradually builds toward 150 minutes per full week.</p><a href="https://www.cdc.gov/physical-activity-basics/adding-adults/" class="text-link">CDC activity guidance</a><p>Weekly workout and minute goals follow this schedule. Your calorie-burn target stays unchanged. Previous goals return after 90 days.</p><button id="stop-plan" class="button secondary">End plan and restore goals</button></section><section class="panel" style="margin-top:20px"><h2>Daily schedule</h2>${planDays().map((d,i)=>`<div class="workout-row"><div><strong>Day ${i+1}: ${formatDate(d.date)}</strong><p>${d.minutes?d.minutes+' min walk'+(d.strength?' + 15 min strength':''):'Rest or gentle mobility'}</p></div></div>`).join('')}</section>`;
  }
  document.addEventListener('submit',event=>{if(!['plan-form','weigh-form'].includes(event.target.id))return;event.preventDefault();const data=Object.fromEntries(new FormData(event.target));const previous=JSON.parse(JSON.stringify(state));if(event.target.id==='plan-form')state.plan={weight:Number(data.weight),target:Number(data.target),intake:Number(data.intake),start:dateKey(new Date()),previous:{...state.goals}};else state.plan.latest=Number(data.weight);if(!persist()){state=previous;return;}render();toast('Plan saved.');});
  document.addEventListener('click',event=>{if(event.target.id!=='stop-plan')return;const previous=JSON.parse(JSON.stringify(state));state.goals=state.plan.previous;delete state.plan;if(!persist()){state=previous;return;}render();});
  window.addEventListener('focus',()=>{if(state.plan)render();});
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
        : "") + { dashboard, workouts, progress, goals, achievements, plan }[page]();
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
