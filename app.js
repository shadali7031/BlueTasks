const tg = window.Telegram?.WebApp;
let state = {user:null,tasks:[],claimsToday:[],withdrawals:[],referralLink:""};

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#087cf5");
  tg.setBackgroundColor("#f4f8ff");
}

function initData(){
  return tg?.initData || "";
}

async function api(url, options={}) {
  options.headers = {...(options.headers||{}), "x-telegram-init-data": initData()};
  const r = await fetch(url, options);
  const data = await r.json().catch(()=>({}));
  if (!r.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data;
}

function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}

function openTab(tab){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  document.getElementById(tab).classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>openTab(b.dataset.tab));

async function load(){
  if (!initData()) {
    toast("Open this app inside Telegram");
    return;
  }
  try {
    const d=await api("/api/me");
    state=d;
    render();
  } catch(e){ toast(e.message); }
}

function render(){
  const u=state.user||{};
  document.getElementById("balance").textContent=u.balance||0;
  document.getElementById("refCount").textContent=u.referral_count||0;
  document.getElementById("todayEarned").textContent=state.claimsToday?.length||0;

  const initials=((u.first_name||"B")[0]+(u.last_name||"T")[0]).toUpperCase();
  document.getElementById("avatar").textContent=initials;
  document.getElementById("bigAvatar").textContent=initials;
  document.getElementById("name").textContent=[u.first_name,u.last_name].filter(Boolean).join(" ")||"Telegram User";
  document.getElementById("username").textContent=u.username?("@"+u.username):"No username";
  document.getElementById("tgid").textContent="Telegram ID: "+u.telegram_id;
  document.getElementById("refLink").value=state.referralLink||"";

  renderTasks();
  renderWithdrawals();
}

function claimCount(taskId){
  return (state.claimsToday||[]).filter(x=>x.task_id===taskId).length;
}

function renderTasks(){
  const list=document.getElementById("taskList");
  list.innerHTML="";
  for(const t of state.tasks||[]){
    const used=claimCount(t.id);
    const remaining=Math.max(0,t.daily_limit-used);
    const div=document.createElement("div");
    div.className="task card";
    div.innerHTML=`
      <div class="taskTop">
        <div>
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(t.description||"Complete task and earn BLC")}</p>
        </div>
        <div class="reward">+${t.reward}<small>BLC</small></div>
      </div>
      <div class="taskBottom"><span>${remaining}/${t.daily_limit} left today</span>
      <button class="primary small" ${remaining<=0?"disabled":""} onclick="completeTask('${t.id}')">
        ${remaining<=0?"Limit reached":"Start task"}
      </button></div>`;
    list.appendChild(div);
  }
}

async function completeTask(taskId){
  try{
    // Demo flow: production ad crediting must be done by a verified provider postback.
    const d=await api("/api/task/complete",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({taskId})
    });
    toast("Reward credited: "+(d.result?.reward||0)+" BLC");
    await load();
  }catch(e){toast(e.message);}
}

async function withdraw(){
  const amount=Number(document.getElementById("amount").value);
  const payoutDetails=document.getElementById("payout").value.trim();
  if(!amount || !payoutDetails) return toast("Enter amount and payout details");
  try{
    await api("/api/withdraw",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({amount,payoutDetails})});
    toast("Withdrawal request submitted");
    document.getElementById("amount").value="";
    document.getElementById("payout").value="";
    await load();
  }catch(e){toast(e.message);}
}

function renderWithdrawals(){
  const el=document.getElementById("withdrawals");
  if(!state.withdrawals?.length){el.innerHTML='<p class="muted">No withdrawals yet.</p>';return;}
  el.innerHTML=state.withdrawals.map(w=>`
    <div class="history"><b>${w.amount} BLC</b><span>${escapeHtml(w.status)}</span></div>
  `).join("");
}

function copyReferral(){
  if(!state.referralLink) return;
  navigator.clipboard?.writeText(state.referralLink);
  toast("Referral link copied");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

load();