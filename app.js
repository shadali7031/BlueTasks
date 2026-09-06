const tg = window.Telegram?.WebApp;

const ADSGRAM_BLOCK_ID = "46524";
let adsgramController = null;
let adInProgress = false;

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
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function openTab(tab) {
  document.querySelectorAll(".page").forEach(x => x.classList.add("hidden"));
  const page = document.getElementById(tab);
  if (page) page.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(x =>
    x.classList.toggle("active", x.dataset.tab === tab)
  );

  if (tab === "referral") {
    document.getElementById("referralPageCount").textContent =
      state.user?.referral_count || 0;
    document.getElementById("referralPageLink").value =
      state.referralLink || "";
  }
}

document.querySelectorAll(".tab").forEach(
  b => (b.onclick = () => openTab(b.dataset.tab))
);

function getTodayEarned() {
  return (state.claimsToday || []).reduce(
    (sum, claim) => sum + Number(claim.reward || 0),
    0
  );
}

async function load() {
  if (!initData()) {
    toast("Open this app inside Telegram");
    return;
  }

  try {
    const d = await api("/api/me");
    state = d;
    render();
  } catch (e) {
    toast(e.message);
  }
}

function render() {
  const u = state.user || {};
  const todayEarned = getTodayEarned();

  document.getElementById("balance").textContent = u.balance || 0;
  document.getElementById("refCount").textContent = u.referral_count || 0;
  document.getElementById("todayEarned").textContent =
    `${todayEarned} / 240`;

  const initials = (
    (u.first_name || "B")[0] + (u.last_name || "T")[0]
  ).toUpperCase();

  document.getElementById("avatar").textContent = initials;
  document.getElementById("bigAvatar").textContent = initials;
  document.getElementById("name").textContent =
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    "Telegram User";
  document.getElementById("username").textContent = u.username
    ? "@" + u.username
    : "No username";
  document.getElementById("tgid").textContent =
    "Telegram ID: " + u.telegram_id;
  document.getElementById("refLink").value = state.referralLink || "";
  document.getElementById("referralPageCount").textContent =
    u.referral_count || 0;
  document.getElementById("referralPageLink").value =
    state.referralLink || "";

  renderTasks();
  renderWithdrawals();
}

function claimCount(taskId) {
  return (state.claimsToday || []).filter(
    x => x.task_id === taskId
  ).length;
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  const todayEarned = getTodayEarned();

  for (const t of state.tasks || []) {
    const used = claimCount(t.id);
    const remaining = Math.max(
      0,
      Number(t.daily_limit || 0) - used
    );

    const blockedByDailyCap =
      todayEarned + Number(t.reward || 0) > 240;

    const disabled = remaining <= 0 || blockedByDailyCap;

    let buttonText = "Start task";
    if (remaining <= 0) buttonText = "Limit reached";
    else if (blockedByDailyCap) buttonText = "Daily max reached";

    const div = document.createElement("div");
    div.className = "task card";

    div.innerHTML = `
      <div class="taskTop">
        <div>
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(
            t.description || "Complete task and earn BLC"
          )}</p>
        </div>
        <div class="reward">+${Number(t.reward)}<small>BLC</small></div>
      </div>
      <div class="taskBottom">
        <span>${remaining}/${Number(t.daily_limit)} left today</span>
        <button
          class="primary small"
          ${disabled ? "disabled" : ""}
          onclick="startTask('${escapeJs(t.id)}')"
        >
          ${buttonText}
        </button>
      </div>
    `;

    list.appendChild(div);
  }
}

function getAdsgramController() {
  if (!window.Adsgram || typeof window.Adsgram.init !== "function") {
    throw new Error("AdsGram is still loading. Please try again.");
  }

  if (!adsgramController) {
    adsgramController = window.Adsgram.init({
      blockId: ADSGRAM_BLOCK_ID,
      debug: false
    });
  }

  return adsgramController;
}

async function startTask(taskId) {
  if (adInProgress) {
    toast("An ad is already running. Please wait.");
    return;
  }

  const task = (state.tasks || []).find(t => t.id === taskId);
  if (!task) return;

  const used = claimCount(taskId);
  const todayEarned = getTodayEarned();

  if (used >= Number(task.daily_limit || 0)) {
    toast("Daily limit reached");
    return;
  }

  if (todayEarned + Number(task.reward || 0) > 240) {
    toast("Daily earning limit is 240 BLC");
    return;
  }

  adInProgress = true;

  try {
    const controller = getAdsgramController();

    toast("Loading reward ad...");

    const result = await controller.show();

    if (result?.error || result?.done === false) {
      throw new Error("Ad was not completed");
    }

    // AdsGram Reward promise resolves after the rewarded ad is watched
    // to the end. Only then ask the BlueTasks server to credit the task.
    const d = await api("/api/task/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        taskId,
        adProvider: "adsgram",
        adBlockId: ADSGRAM_BLOCK_ID
      })
    });

    toast(
      "Reward credited: " +
      Number(d.result?.reward || 0) +
      " BLC"
    );

    await load();
  } catch (e) {
    console.error("AdsGram reward error:", e);
    toast(e.message || "Ad could not be completed");
  } finally {
    adInProgress = false;
  }
}

async function withdraw() {
  const amount = Number(document.getElementById("amount").value);
  const payoutDetails = document
    .getElementById("payout")
    .value.trim();

  if (!amount || !payoutDetails) {
    return toast("Enter amount and payout details");
  }

  try {
    await api("/api/withdraw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        payoutDetails
      })
    });

    toast("Withdrawal request submitted");
    document.getElementById("amount").value = "";
    document.getElementById("payout").value = "";
    await load();
  } catch (e) {
    toast(e.message);
  }
}

function renderWithdrawals() {
  const el = document.getElementById("withdrawals");

  if (!state.withdrawals?.length) {
    el.innerHTML = '<p class="muted">No withdrawals yet.</p>';
    return;
  }

  el.innerHTML = state.withdrawals
    .map(
      w => `
        <div class="history">
          <b>${Number(w.amount)} BLC</b>
          <span>${escapeHtml(w.status)}</span>
        </div>
      `
    )
    .join("");
}

function copyReferral() {
  if (!state.referralLink) return;

  navigator.clipboard?.writeText(state.referralLink);
  toast("Referral link copied");
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    m =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[m]
  );
}

function escapeJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

load();
