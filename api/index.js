const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_IDS = new Set((process.env.ADMIN_IDS || "").split(",").map(x => x.trim()).filter(Boolean));

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Missing BOT_TOKEN, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function verifyTelegramInitData(initData) {
  if (!initData || !BOT_TOKEN) throw new Error("Telegram authorization missing");

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) throw new Error("Telegram hash missing");

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(receivedHash))) {
    throw new Error("Invalid Telegram authorization");
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > 86400) {
    throw new Error("Telegram authorization expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Telegram user missing");
  return { user: JSON.parse(userRaw), startParam: params.get("start_param") || "" };
}

function initDataFromReq(req) {
  return req.get("x-telegram-init-data") || req.body?.initData || req.query?.initData || "";
}

async function authUser(req) {
  const initData = initDataFromReq(req);
  const auth = verifyTelegramInitData(initData);
  const tg = auth.user;

  let { data: existing, error } = await supabase
    .from("users").select("*").eq("telegram_id", String(tg.id)).maybeSingle();
  if (error) throw error;

  if (!existing) {
    let referredBy = null;
    if (auth.startParam.startsWith("ref_")) {
      const ref = auth.startParam.slice(4);
      if (ref && ref !== String(tg.id)) {
        const { data: refUser } = await supabase.from("users")
          .select("telegram_id").eq("telegram_id", ref).maybeSingle();
        if (refUser) referredBy = ref;
      }
    }

    const { data: created, error: insertError } = await supabase.from("users")
      .insert({
        telegram_id: String(tg.id),
        username: tg.username || null,
        first_name: tg.first_name || null,
        last_name: tg.last_name || null,
        referred_by: referredBy
      }).select("*").single();

    if (insertError) throw insertError;
    existing = created;

    if (referredBy) {
      const { error: rpcError } = await supabase.rpc("increment_referral_count", {
        p_telegram_id: referredBy
      });
      if (rpcError) console.warn("Referral increment:", rpcError.message);
    }
  } else {
    const { data: updated } = await supabase.from("users")
      .update({
        username: tg.username || null,
        first_name: tg.first_name || null,
        last_name: tg.last_name || null,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", String(tg.id)).select("*").single();
    if (updated) existing = updated;
  }

  return { tg, user: existing };
}

app.get("/api/health", (req, res) => res.json({ ok: true, app: "BlueTasks" }));

app.get("/api/me", async (req, res) => {
  try {
    const { user } = await authUser(req);
    const { data: tasks, error: taskError } = await supabase.from("tasks")
      .select("*").eq("active", true).order("sort_order");
    if (taskError) throw taskError;

    const { data: claims, error: claimError } = await supabase.from("task_claims")
      .select("task_id, claimed_at").eq("telegram_id", user.telegram_id)
      .gte("claimed_at", new Date(new Date().setUTCHours(0,0,0,0)).toISOString());
    if (claimError) throw claimError;

    const { data: withdrawals, error: wdError } = await supabase.from("withdrawals")
      .select("*").eq("telegram_id", user.telegram_id).order("created_at", {ascending:false}).limit(20);
    if (wdError) throw wdError;

    res.json({
      ok: true,
      user,
      tasks,
      claimsToday: claims || [],
      withdrawals: withdrawals || [],
      referralLink: `https://t.me/${process.env.BOT_USERNAME || "YOUR_BOT"}/?startapp=ref_${user.telegram_id}`
    });
  } catch (e) {
    res.status(401).json({ ok:false, error:e.message });
  }
});

// DEVELOPMENT DEMO endpoint.
// For real ads, replace this flow with the ad/offer provider's verified server-to-server postback.
app.post("/api/task/complete", async (req, res) => {
  try {
    const { user } = await authUser(req);
    const taskId = String(req.body.taskId || "");
    if (!taskId) return res.status(400).json({ok:false,error:"taskId required"});

    const { data, error } = await supabase.rpc("claim_task", {
      p_telegram_id: user.telegram_id,
      p_task_id: taskId
    });
    if (error) throw error;

    res.json({ok:true, result:data});
  } catch (e) {
    res.status(400).json({ok:false,error:e.message});
  }
});

app.post("/api/withdraw", async (req, res) => {
  try {
    const { user } = await authUser(req);
    const amount = Number(req.body.amount);
    const payoutDetails = String(req.body.payoutDetails || "").trim();
    if (!Number.isInteger(amount) || amount < 1500) {
      return res.status(400).json({ok:false,error:"Minimum withdrawal is 1500 BLC"});
    }
    if (!payoutDetails) return res.status(400).json({ok:false,error:"Payout details required"});

    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_telegram_id: user.telegram_id,
      p_amount: amount,
      p_payout_details: payoutDetails
    });
    if (error) throw error;
    res.json({ok:true,result:data});
  } catch (e) {
    res.status(400).json({ok:false,error:e.message});
  }
});

function requireAdmin(req, telegramId) {
  if (!ADMIN_IDS.has(String(telegramId))) throw new Error("Admin access denied");
}

app.get("/api/admin/withdrawals", async (req, res) => {
  try {
    const { user } = await authUser(req);
    requireAdmin(req, user.telegram_id);
    const { data, error } = await supabase.from("withdrawals")
      .select("*").order("created_at", {ascending:false}).limit(200);
    if (error) throw error;
    res.json({ok:true, withdrawals:data});
  } catch (e) {
    res.status(403).json({ok:false,error:e.message});
  }
});

app.post("/api/admin/withdrawal/status", async (req, res) => {
  try {
    const { user } = await authUser(req);
    requireAdmin(req, user.telegram_id);
    const id = Number(req.body.id);
    const status = String(req.body.status || "");
    if (!["approved","rejected","paid"].includes(status)) {
      return res.status(400).json({ok:false,error:"Invalid status"});
    }
    const { data, error } = await supabase.rpc("set_withdrawal_status", {
      p_withdrawal_id: id,
      p_status: status
    });
    if (error) throw error;
    res.json({ok:true,result:data});
  } catch (e) {
    res.status(400).json({ok:false,error:e.message});
  }
});

app.use(express.static(path.join(process.cwd())));

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`BlueTasks running on ${port}`));
          }
