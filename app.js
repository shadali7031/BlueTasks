const tg = window.Telegram?.WebApp;

let state = {
  user: null,
  tasks: [],
  claimsToday: [],
  withdrawals: [],
  referralLink: ""
};

const TADS_TGB_ID = "11984";
const TADS_FULLSCREEN_ID = "11986";
let tadsFullscreenController = null;
let pendingTadsTaskId = null;

function initTadsBanner() {
  try {
    if (!window.tads || typeof window.tads.init !== "function") return;
    const container = document.getElementById(`tads-container-${TADS_TGB_ID}`);
    if (!container || container.dataset.tadsReady === "1") return;
    container.dataset.tadsReady = "1";
    const controller = window.tads.init({
      widgetId: TADS_TGB_ID,
      type: "static",
      debug: false,
      onClickReward: (adId) => console.log("TADS TGB click:", adId),
      onAdsNotFound: () => console.log("TADS TGB: no ad found")
    });
    controller.loadAd().then(() => controller.showAd()).catch(err => console.log("TADS TGB:", err));
  } catch (e) {
    console.log("TADS banner init:", e);
  }
}

async function showTadsFullscreen(taskId) {
  if (!window.tads || typeof window.tads.init !== "function") {
    toast("Ad system is loading. Try again.");
    return;
  }
  pendingTadsTaskId = taskId;
  try {
    if (!tadsFullscreenController) {
      tadsFullscreenController = window.tads.init({
        widgetId: TADS_FULLSCREEN_ID,
        type: "fullscreen",
        debug: false,
        onShowReward: async (result) => {
          const rewardedTask = pendingTadsTaskId;
          pendingTadsTaskId = null;
          if (!rewardedTask) return;
          try {
            const d = await api("/api/task/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskId: rewardedTask, adProvider: "tads", adResult: result || null })
            });
            toast("Reward credited: " + (d.result?.reward || 0) + " BLC");
            await load();
          } catch (e) {
            toast(e.message);
          }
        },
        onAdsNotFound: () => {
          pendingTadsTaskId = null;
          toast("No ad available right now. Try again later.");
        }
      });
    }
    await tadsFullscreenController.loadAd();
    await tadsFullscreenController.showAd();
  } catch (e) {
    pendingTadsTaskId = null;
    console.error("TADS fullscreen:", e);
    toast("Unable to show ad right now. Try again later.");
  }
}

if (tg) {
  tg.ready();
  tg.expand();

  try {
    tg.setHeaderColor("#087cf5");
    tg.setBackgroundColor("#f4f8ff");
  } catch (e) {
    console.log("Telegram UI settings unavailable");
  }
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

function openTab(tab) {
  const page = document.getElementById(tab);

  if (!page) {
    console.log("Tab not found:", tab);
    return;
  }

  document.querySelectorAll(".page").forEach(x => {
    x.classList.add("hidden");
  });

  page.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(x => {
    x.classList.toggle("active", x.dataset.tab === tab);
  });
}

document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => openTab(button.dataset.tab);
});

function getStartAppSection() {
  try {
    if (tg?.initDataUnsafe?.start_param) {
      return String(tg.initDataUnsafe.start_param).toLowerCase().trim();
    }

    const params = new URLSearchParams(window.location.search);

    return (
      params.get("startapp") ||
      params.get("start") ||
      ""
    ).toLowerCase().trim();
  } catch (e) {
    console.log("Unable to read startapp:", e);
    return "";
  }
}

function openStartAppSection() {
  const section = getStartAppSection();
  if (!section) return;

  switch (section) {
    case "home":
      openTab("home");
      break;
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
    default:
      console.log("Unknown startapp:", section);
      break;
  }
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

    setTimeout(() => {
      openStartAppSection();
    }, 100);
  } catch (e) {
    toast(e.message);
  }
}

function render() {
  const u = state.user || {};

  const balance = document.getElementById("balance");
  if (balance) balance.textContent = u.balance || 0;

  const refCount = document.getElementById("refCount");
  if (refCount) refCount.textContent = u.referral_count || 0;

  const todayEarned = document.getElementById("todayEarned");
  if (todayEarned) todayEarned.textContent = state.claimsToday?.length || 0;

  const initials = (
    (u.first_name || "B")[0] +
    (u.last_name || "T")[0]
  ).toUpperCase();

  const avatar = document.getElementById("avatar");
  if (avatar) avatar.textContent = initials;

  const bigAvatar = document.getElementById("bigAvatar");
  if (bigAvatar) bigAvatar.textContent = initials;

  const name = document.getElementById("name");
  if (name) {
    name.textContent =
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      "Telegram User";
  }

  const username = document.getElementById("username");
  if (username) {
    username.textContent = u.username ? "@" + u.username : "No username";
  }

  const tgid = document.getElementById("tgid");
  if (tgid) tgid.textContent = "Telegram ID: " + u.telegram_id;

  const refLink = document.getElementById("refLink");
  if (refLink) refLink.value = state.referralLink || "";

  const referralPageCount = document.getElementById("referralPageCount");
  if (referralPageCount) referralPageCount.textContent = u.referral_count || 0;

  const referralPageLink = document.getElementById("referralPageLink");
  if (referralPageLink) referralPageLink.value = state.referralLink || "";

  renderTasks();
  renderWithdrawals();
}

function claimCount(taskId) {
  return (state.claimsToday || []).filter(x => x.task_id === taskId).length;
}

function renderTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;

  list.innerHTML = "";

  for (const t of state.tasks || []) {
    const used = claimCount(t.id);
    const remaining = Math.max(0, t.daily_limit - used);

    const div = document.createElement("div");
    div.className = "task card";

    div.innerHTML = `
      <div class="taskTop">
        <div>
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(t.description || "Complete task and earn BLC")}</p>
        </div>
        <div class="reward">
          +${t.reward}
          <small>BLC</small>
        </div>
      </div>

      <div class="taskBottom">
        <span>${remaining}/${t.daily_limit} left today</span>

        <button
          class="primary small"
          ${remaining <= 0 ? "disabled" : ""}
          onclick="startTask('${escapeHtml(t.id)}')"
        >
          ${remaining <= 0 ? "Limit reached" : (t.id === "premium3" ? "🎬 Watch Ad & Earn" : "Start task")}
        </button>
      </div>
    `;

    list.appendChild(div);
  }
}

async function startTask(taskId) {
  const task = (state.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  if (task.id === "premium3") {
    await showTadsFullscreen(task.id);
    return;
  }
  await completeTask(taskId);
}

async function completeTask(taskId) {
  try {
    const d = await api("/api/task/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ taskId })
    });

    toast("Reward credited: " + (d.result?.reward || 0) + " BLC");
    await load();
  } catch (e) {
    toast(e.message);
  }
}

async function withdraw() {
  const amount = Number(document.getElementById("amount")?.value);
  const payoutDetails = document.getElementById("payout")?.value.trim();

  if (!amount || !payoutDetails) {
    toast("Enter amount and payout details");
    return;
  }

  try {
    await api("/api/withdraw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount, payoutDetails })
    });

    toast("Withdrawal request submitted");

    const amountEl = document.getElementById("amount");
    const payoutEl = document.getElementById("payout");

    if (amountEl) amountEl.value = "";
    if (payoutEl) payoutEl.value = "";

    await load();
  } catch (e) {
    toast(e.message);
  }
}

function renderWithdrawals() {
  const el = document.getElementById("withdrawals");
  if (!el) return;

  if (!state.withdrawals?.length) {
    el.innerHTML = '<p class="muted">No withdrawals yet.</p>';
    return;
  }

  el.innerHTML = state.withdrawals.map(w => `
    <div class="history">
      <b>${w.amount} BLC</b>
      <span>${escapeHtml(w.status)}</span>
    </div>
  `).join("");
}

function copyReferral() {
  if (!state.referralLink) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(state.referralLink);
  }

  toast("Referral link copied");
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}

load();
setTimeout(initTadsBanner, 800);
