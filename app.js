const tg = window.Telegram?.WebApp;

let state = {
  user: null,
  tasks: [],
  claimsToday: [],
  withdrawals: [],
  referralLink: ""
};

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#087cf5");
  tg.setBackgroundColor("#f4f8ff");
}

function initData() {
  return tg?.initData || "";
}

async function api(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "x-telegram-init-data": initData()
  };

  const r = await fetch(url, options);
  const data = await r.json().catch(() => ({}));

  if (!r.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function toast(msg) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = msg;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2200);
}

/* =========================
   TAB CONTROL
========================= */

function openTab(tab) {
  const page = document.getElementById(tab);

  if (!page) {
    console.warn("Tab not found:", tab);
    return;
  }

  document.querySelectorAll(".page").forEach(x => {
    x.classList.add("hidden");
  });

  page.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(x => {
    x.classList.toggle(
      "active",
      x.dataset.tab === tab
    );
  });
}

/* Bottom navigation buttons */
document.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => {
    openTab(b.dataset.tab);
  };
});


/* =========================
   TELEGRAM STARTAPP
========================= */


  Telegram Mini App can be opened with:

  ?startapp=tasks
  ?startapp=wallet
  ?startapp=referral
  ?startapp=profile
  ?startapp=help

  Telegram WebApp normally exposes this through:
  tg.initDataUnsafe.start_param


function getStartAppSection() {
  try {
    /* Telegram Mini App start parameter */
    if (tg?.initDataUnsafe?.start_param) {
      return String(tg.initDataUnsafe.start_param)
        .toLowerCase()
        .trim();
    }

    /* Fallback for normal browser testing */
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("startapp") ||
      params.get("start") ||
      ""
    ).toLowerCase().trim();

  } catch (e) {
    return "";
  }
}


function openStartAppSection() {
  const section = getStartAppSection();

  if (!section) return;

  console.log("BlueTasks startapp:", section);

  switch (section) {

    case "tasks":
      openTab("tasks");
      break;

    case "wallet":
      openTab("wallet");
      break;

    case "referral":
      openTab("referral");
      break;

    case "profile":
      openTab("profile");
      break;

    case "help":
      openTab("help");
      break;

    case "home":
      openTab("home");
      break;

    default:
      console.log("Unknown startapp section:", section);
      break;
  }
}


/* =========================
   LOAD USER
========================= */

async function load() {

  if (!initData()) {
    toast("Open this app inside Telegram");
    return;
  }

  try {

    const d = await api("/api/me");

    state = d;

    render();

    /*
      Important:
      Render first, then open the requested section.
    */
    setTimeout(() => {
      openStartAppSection();
    }, 100);

  } catch (e) {

    toast(e.message);

  }
}


/* =========================
   RENDER
========================= */

function render() {

  const u = state.user || {};

  const balanceEl = document.getElementById("balance");
  const refCountEl = document.getElementById("refCount");
  const todayEarnedEl = document.getElementById("todayEarned");

  if (balanceEl) {
    balanceEl.textContent = u.balance || 0;
  }

  if (refCountEl) {
    refCountEl.textContent = u.referral_count || 0;
  }

  if (todayEarnedEl) {
    todayEarnedEl.textContent =
      state.claimsToday?.length || 0;
  }


  const initials =
    (
      (u.first_name || "B")[0] +
      (u.last_name || "T")[0]
    ).toUpperCase();


  const avatar = document.getElementById("avatar");
  const bigAvatar = document.getElementById("bigAvatar");

  if (avatar) {
    avatar.textContent = initials;
  }

  if (bigAvatar) {
    bigAvatar.textContent = initials;
  }


  const name = document.getElementById("name");

  if (name) {
    name.textContent =
      [u.first_name, u.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Telegram User";
  }


  const username = document.getElementById("username");

  if (username) {
    username.textContent =
      u.username
        ? "@" + u.username
        : "No username";
  }


  const tgid = document.getElementById("tgid");

  if (tgid) {
    tgid.textContent =
      "Telegram ID: " + u.telegram_id;
  }


  const refLink = document.getElementById("refLink");

  if (refLink) {
    refLink.value =
      state.referralLink || "";
  }


  renderTasks();
  renderWithdrawals();
}


/* =========================
   TASK CLAIM COUNT
========================= */

function claimCount(taskId) {

  return (state.claimsToday || [])
    .filter(x => x.task_id === taskId)
    .length;

}


/* =========================
   TASK LIST
========================= */

function renderTasks() {

  const list =
    document.getElementById("taskList");

  if (!list) return;

  list.innerHTML = "";


  for (const t of state.tasks || []) {

    const used =
      claimCount(t.id);

    const remaining =
      Math.max(
        0,
        t.daily_limit - used
      );


    const div =
      document.createElement("div");

    div.className = "task card";


    div.innerHTML = `
      <div class="taskTop">

        <div>

          <h3>
            ${escapeHtml(t.name)}
          </h3>

          <p>
            ${escapeHtml(
              t.description ||
              "Complete task and earn BLC"
            )}
          </p>

        </div>

        <div class="reward">
          +${t.reward}
          <small>BLC</small>
        </div>

      </div>

      <div class="taskBottom">

        <span>
          ${remaining}/${t.daily_limit}
          left today
        </span>

        <button
          class="primary small"
          ${remaining <= 0 ? "disabled" : ""}
          onclick="completeTask('${escapeHtml(t.id)}')"
        >
          ${
            remaining <= 0
              ? "Limit reached"
              : "Start task"
          }
        </button>

      </div>
    `;

    list.appendChild(div);
  }

}


/* =========================
   COMPLETE TASK
========================= */

async function completeTask(taskId) {

  try {

    /*
      NOTE:
      This is still your existing demo/direct
      reward flow.

      Production ad reward should only be credited
      after verified provider completion/postback.
    */

    const d = await api(
      "/api/task/complete",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          taskId
        })
      }
    );


    toast(
      "Reward credited: " +
      (d.result?.reward || 0) +
      " BLC"
    );


    await load();

  } catch (e) {

    toast(e.message);

  }

}


/* =========================
   WITHDRAW
========================= */

async function withdraw() {

  const amount =
    Number(
      document.getElementById("amount")?.value
    );

  const payoutDetails =
    document
      .getElementById("payout")
      ?.value
      .trim();


  if (!amount || !payoutDetails) {

    toast(
      "Enter amount and payout details"
    );

    return;
  }


  try {

    await api(
      "/api/withdraw",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          amount,
          payoutDetails
        })
      }
    );


    toast(
      "Withdrawal request submitted"
    );


    const amountEl =
      document.getElementById("amount");

    const payoutEl =
      document.getElementById("payout");


    if (amountEl) {
      amountEl.value = "";
    }

    if (payoutEl) {
      payoutEl.value = "";
    }


    await load();

  } catch (e) {

    toast(e.message);

  }

}


/* =========================
   WITHDRAWAL HISTORY
========================= */

function renderWithdrawals() {

  const el =
    document.getElementById(
      "withdrawals"
    );

  if (!el) return;


  if (
    !state.withdrawals?.length
  ) {

    el.innerHTML =
      '<p class="muted">No withdrawals yet.</p>';

    return;
  }


  el.innerHTML =
    state.withdrawals
      .map(w => `
        <div class="history">

          <b>
            ${w.amount} BLC
          </b>

          <span>
            ${escapeHtml(w.status)}
          </span>

        </div>
      `)
      .join("");

}


/* =========================
   COPY REFERRAL
========================= */

function copyReferral() {

  if (!state.referralLink) {
    return;
  }


  if (
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {

    navigator.clipboard
      .writeText(
        state.referralLink
      );

  }


  toast(
    "Referral link copied"
  );

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(s) {

  return String(s)
    .replace(
      /[&<>"']/g,
      m =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[m])
    );

}


/* =========================
   START APP
========================= */

load();
