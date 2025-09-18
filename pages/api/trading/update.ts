// pages/api/trading/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, getTradingCollection } from "../db/mongo";

// -------- helpers --------
const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};
// optional number: undefined wenn keine valide Zahl
const toNumOpt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
function trimOrUndef(v: any): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
}
function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return ["true", "1", "on", "yes"].includes(v.toLowerCase());
  return false;
}
const toStr = (v: any) => (v === undefined || v === null ? undefined : String(v));

const date10 = (d: any) => {
  const s = String(d || "");
  return s ? s.slice(0, 10) : undefined;
};
const clampResult = (r: any): "win" | "loss" | "BE" | undefined => {
  if (r === undefined || r === null || r === "") return undefined;
  const s = String(r || "").toLowerCase();
  if (s === "win") return "win";
  if (s === "loss") return "loss";
  return "BE";
};

function adherenceOk(a: any): "yes" | "partial" | "no" | undefined {
  const s = String(a ?? "").toLowerCase();
  if (s === "yes" || s === "partial" || s === "no") return s as any;
  return undefined;
};

const biasExecOk = (b: any) => {
  const s = String(b || "").toUpperCase();
  return (["RR", "RW", "WR", "WW"] as const).includes(s as any) ? (s as any) : undefined;
};
const sessionOk = (s: any) => {
  const v = String(s || "");
  return ["Asia", "London", "NewYork", "Overlap"].includes(v) ? v : undefined;
};
const gradeOk = (g: any) => {
  const v = String(g || "").toUpperCase();
  return (["A", "B", "C"] as const).includes(v as any) ? (v as any) : undefined;
};

type Concept = { name: string; direction?: "bullish" | "bearish" | "neutral"; timeframe?: string; note?: string };
function sanitizeConcepts(raw: any): Concept[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Concept[] = [];
  for (const it of raw) {
    const name = trimOrUndef(it?.name);
    if (!name) continue;
    const direction = ((): Concept["direction"] | undefined => {
      const d = String(it?.direction || "").toLowerCase();
      return d === "bullish" || d === "bearish" || d === "neutral" ? (d as any) : undefined;
    })();
    const timeframe = trimOrUndef(it?.timeframe);
    const note = trimOrUndef(it?.note);
    out.push({ name, direction, timeframe, note });
  }
  return out.length ? out : undefined;
}
function sanitizeStringArray(raw: any): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const vals = raw
    .map((x) => trimOrUndef(x))
    .filter((x): x is string => !!x);
  return vals.length ? vals : undefined;
}
const shouldUnset = (v: any) =>
  v === null || v === "" || (Array.isArray(v) && v.length === 0);

// --- Partial Exits ---
type PartialExit = { label?: string; price?: number; percent?: number; at?: string; note?: string };
function sanitizePartialExits(raw: any): PartialExit[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PartialExit[] = [];
  let idx = 0;
  for (const it of raw) {
    const label = trimOrUndef(it?.label) ?? `TP ${++idx}`;
    const price = toNumOpt(it?.price);
    let percent = toNumOpt(it?.percent);
    if (percent !== undefined) {
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
    }
    const at = trimOrUndef(it?.at);
    const note = trimOrUndef(it?.note);

    // nur behalten, wenn wenigstens etwas gesetzt ist
    if (!label && price === undefined && percent === undefined && !at && !note) continue;
    out.push({ label, price, percent, at, note });
  }
  return out.length ? out : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    const idRaw = (req.query.id ?? (req.body?.id as any)) as string | undefined;
    if (!idRaw) return res.status(400).json({ error: "id ist erforderlich" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(String(idRaw));
    } catch {
      return res.status(400).json({ error: "id ist ungültig" });
    }

    const body = req.body ?? {};

    // ⚠️ userId aus Body oder Query akzeptieren
    const userIdQ = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const userId = trimOrUndef(body.userId ?? userIdQ);

    console.log("📥 /api/trading/update", {
      id: String(_id),
      userId,
      date: body?.date,
      symbol: body?.symbol,
      accountId: body?.accountId,
      strategy: body?.strategy || body?.strategy_name,
      coll: col.collectionName,
    });

    // optional Ownership prüfen
    const match: any = { _id };
    if (userId) match.userId = userId;

    // Vorherigen Zustand laden (für Balance-Delta)
    const prev = await col.findOne(match);

    const set: any = { updatedAt: new Date().toISOString() };
    const unset: any = {};

    // --- Kernfelder ---
    if ("date" in body) {
      const v = date10(body.date);
      v ? (set.date = v) : (unset.date = "");
    }
    if ("symbol" in body) {
      const v = trimOrUndef(body.symbol);
      v ? (set.symbol = v) : (unset.symbol = "");
    }
    if ("accountId" in body) {
      const v = trimOrUndef(body.accountId);
      v ? (set.accountId = v) : (unset.accountId = "");
    }
    if ("tradeType" in body) {
      const v = String(body.tradeType || "").toLowerCase() === "sell" ? "sell" : "buy";
      set.tradeType = v;
    }

    // --- Zahlen ---
    if ("entry" in body) {
      const v = toNum(body.entry);
      v === undefined ? (unset.entry = "") : (set.entry = v);
    }
    if ("exit" in body) {
      const v = toNum(body.exit);
      v === undefined ? (unset.exit = "") : (set.exit = v);
    }
    if ("pnl" in body) {
      const v = toNum(body.pnl, 0);
      set.pnl = v; // bewusst 0 als Default
    }
    if ("lotSize" in body) {
      const v = toNum(body.lotSize);
      v === undefined ? (unset.lotSize = "") : (set.lotSize = v);
    }
    if ("potentialLoss" in body) {
      const v = toNum(body.potentialLoss);
      v === undefined ? (unset.potentialLoss = "") : (set.potentialLoss = v);
    }
    if ("rating" in body) {
      const v = toNum(body.rating);
      v === undefined ? (unset.rating = "") : (set.rating = v);
    }

    // --- Result/Notes ---
    if ("result" in body) {
      const raw = String(body.result ?? "").trim().toLowerCase();
      if (raw === "ongoing") {
        // "ongoing" ⇒ Result entfernen & sicherheitshalber Draft markieren
        unset.result = "";
        set.status = "draft";
        set.completed = false;
      } else {
        const v = clampResult(body.result);
        v ? (set.result = v) : (unset.result = "");
      }
    }
    if ("notes" in body) {
      const v = trimOrUndef(body.notes);
      v ? (set.notes = v) : (unset.notes = "");
    }

    // --- Reflection / Journal (NEU) ---
    if ("reflectionNotes" in body) {
      const v = trimOrUndef(body.reflectionNotes);
      if (v !== undefined) set.reflectionNotes = v;
      else unset.reflectionNotes = "";
    }
    if ("triggerEvent" in body) {
      const v = trimOrUndef(body.triggerEvent);
      if (v !== undefined) set.triggerEvent = v;
      else unset.triggerEvent = "";
    }
    if ("tiltDetected" in body) {
      const v = toBool(body.tiltDetected);
      if (v) set.tiltDetected = true;
      else unset.tiltDetected = "";
    }

    // --- Zeiten/Session ---
    if ("startTime" in body) {
      const v = trimOrUndef(body.startTime);
      v ? (set.startTime = v) : (unset.startTime = "");
    }
    if ("endTime" in body) {
      const v = trimOrUndef(body.endTime);
      v ? (set.endTime = v) : (unset.endTime = "");
    }
    if ("durationMin" in body) {
      const v = toNum(body.durationMin);
      v === undefined ? (unset.durationMin = "") : (set.durationMin = v);
    }
    if ("session" in body) {
      const v = sessionOk(body.session);
      v ? (set.session = v) : (unset.session = "");
    }

    // --- Flags/Bias ---
    if ("outcomeFlags" in body || "breakEven" in body || "stopHit" in body) {
      const be = toBool(body?.outcomeFlags?.breakEven) || toBool(body.breakEven);
      const sh = toBool(body?.outcomeFlags?.stopHit) || toBool(body.stopHit);
      set.outcomeFlags = { breakEven: !!be, stopHit: !!sh };
    }
    if ("biasExecution" in body) {
      const v = biasExecOk(body.biasExecution);
      v ? (set.biasExecution = v) : (unset.biasExecution = "");
    }

    // --- Arrays/Konzepte/TFs ---
    if ("tradingMistakes" in body) {
      const v = sanitizeStringArray(body.tradingMistakes);
      v ? (set.tradingMistakes = v) : (unset.tradingMistakes = "");
    }
    if ("viewTimeframes" in body) {
      const v = sanitizeStringArray(body.viewTimeframes);
      v ? (set.viewTimeframes = v) : (unset.viewTimeframes = "");
    }
    if ("entryTimeframe" in body) {
      const v = trimOrUndef(body.entryTimeframe);
      v ? (set.entryTimeframe = v) : (unset.entryTimeframe = "");
    }
    if ("concepts" in body) {
      const v = sanitizeConcepts(body.concepts);
      v ? (set.concepts = v) : (unset.concepts = "");
    }

    // --- Ort/Range ---
    if ("location" in body) {
      const v = trimOrUndef(body.location);
      v ? (set.location = v) : (unset.location = "");
    }
    if ("rangeDefined" in body) {
      const v = toBool(body.rangeDefined);
      v ? (set.rangeDefined = true) : (unset.rangeDefined = "");
    }
    if ("rangeNote" in body) {
      const v = trimOrUndef(body.rangeNote);
      v ? (set.rangeNote = v) : (unset.rangeNote = "");
    }

    // --- Game ---
    if ("gameComputed" in body) {
      const v = gradeOk(body.gameComputed);
      v ? (set.gameComputed = v) : (unset.gameComputed = "");
    }
    if ("gameSelf" in body) {
      const v = gradeOk(body.gameSelf);
      v ? (set.gameSelf = v) : (unset.gameSelf = "");
    }
    // --- Strategy Adherence (Tri-State) ---
    if ("strategyAdherence" in body) {
      const v = adherenceOk(body.strategyAdherence);
      v ? (set.strategyAdherence = v) : (unset.strategyAdherence = "");
    }

    // --- RiskReward (String) ---
    if ("riskReward" in body) {
      const v = trimOrUndef(body.riskReward);
      v ? (set.riskReward = v) : (unset.riskReward = "");
    }

    // --- Confluences (Array<string>) ---
    if ("confluences" in body) {
      const v = sanitizeStringArray(body.confluences);
      v ? (set.confluences = v) : (unset.confluences = "");
    }

    // --- Strategy (beide Felder synchron halten) ---
    if ("strategy" in body || "strategy_name" in body) {
      const s1 = trimOrUndef(body.strategy);
      const s2 = trimOrUndef(body.strategy_name);
      const norm = s1 ?? s2;
      if (norm && norm.length) {
        set.strategy = norm;
        set.strategy_name = norm;
      } else {
        unset.strategy = "";
        unset.strategy_name = "";
      }
    }

    // --- SL/TP ---
    if ("stopPrice" in body) {
      const v = toNum(body.stopPrice);
      v === undefined ? (unset.stopPrice = "") : (set.stopPrice = v);
    }
    if ("targetPrice" in body) {
      const v = toNum(body.targetPrice);
      v === undefined ? (unset.targetPrice = "") : (set.targetPrice = v);
    }

    // --- Mentales ---
    if ("emotionBefore" in body) {
      const v = trimOrUndef(body.emotionBefore);
      v ? (set.emotionBefore = v) : (unset.emotionBefore = "");
    }
    if ("mentalMistake" in body) {
      const v = trimOrUndef(body.mentalMistake);
      v ? (set.mentalMistake = v) : (unset.mentalMistake = "");
    }
    if ("performanceState" in body) {
      const v = gradeOk(body.performanceState);
      v ? (set.performanceState = v) : (unset.performanceState = "");
    }
    if ("followedSetup" in body) set.followedSetup = toBool(body.followedSetup);
    if ("respectedStopLoss" in body) set.respectedStopLoss = toBool(body.respectedStopLoss);
    if ("managedRisk" in body) set.managedRisk = toBool(body.managedRisk);
    if ("disciplineScore" in body) {
      const v = toNum(body.disciplineScore);
      v === undefined ? (unset.disciplineScore = "") : (set.disciplineScore = v);
    }

    // --- Partial Exits (NEU) ---
    if ("hasPartialExits" in body || "partialExits" in body) {
      const flag = toBool(body.hasPartialExits);
      const list = sanitizePartialExits(body.partialExits);
      if (flag && list && list.length) {
        set.hasPartialExits = true;
        set.partialExits = list;
      } else {
        unset.hasPartialExits = "";
        unset.partialExits = "";
      }
    }

    // --- Status / Draft ---
    if ("status" in body || "completed" in body) {
      if ("status" in body) {
        const st = trimOrUndef(body.status) as "draft" | "final" | undefined;
        if (st) {
          set.status = st;
          set.completed = st === "final";
        } else {
          unset.status = "";
          unset.completed = "";
        }
      }
      if ("completed" in body) {
        const c = toBool(body.completed);
        set.completed = c;
        set.status = c ? "final" : "draft";
      }
    }

    // $set/$unset säubern
    Object.keys(set).forEach((k) => {
      const v = (set as any)[k];
      if (v === undefined || (Array.isArray(v) && v.length === 0)) delete (set as any)[k];
    });
    Object.keys(unset).forEach((k) => {
      const v = (unset as any)[k];
      if (!shouldUnset(v)) delete (unset as any)[k];
    });

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return res.status(400).json({ error: "Keine gültigen Felder zum Aktualisieren übergeben." });
    }

    // ------- Account-Balance Delta ermitteln (vor updateOne) -------
    const prevFinal = prev && (prev.status === "final" || prev.completed === true);
    const oldApplied = prevFinal ? (Number(prev?.pnl) || 0) : 0;
    const oldAccountId = (prev?.accountId ? String(prev.accountId) : undefined) as string | undefined;

    const newPnl = ("pnl" in set) ? Number(set.pnl) : Number(prev?.pnl) || 0;

    let newStatus: "draft" | "final" | undefined =
      ("status" in set) ? set.status :
        (("completed" in set) ? (set.completed ? "final" : "draft") : (prev?.status as any));

    if (newStatus === undefined && (prev?.completed === true)) newStatus = "final";
    if (newStatus === undefined && (prev?.completed === false)) newStatus = "draft";

    const newApplied = newStatus === "final" ? newPnl : 0;

    const newAccountId = ("accountId" in set ? set.accountId : oldAccountId) as string | undefined;

    type BalanceOp = { accountId: string; amount: number; txType: "pnl_correction" | "pnl_move_out" | "pnl_move_in" };
    const balanceOps: BalanceOp[] = [];
    if (oldAccountId && newAccountId && oldAccountId !== newAccountId) {
      if (oldApplied !== 0) {
        balanceOps.push({ accountId: oldAccountId, amount: -oldApplied, txType: "pnl_move_out" });
      }
      if (newApplied !== 0) {
        balanceOps.push({ accountId: newAccountId, amount: newApplied, txType: "pnl_move_in" });
      }
    } else {
      const delta = newApplied - oldApplied;
      if (Number.isFinite(delta) && delta !== 0 && newAccountId) {
        balanceOps.push({ accountId: newAccountId, amount: delta, txType: "pnl_correction" });
      }
    }

    // ------- Update des Trades -------
    const update: any = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const result = await col.updateOne(match, update);
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Trade nicht gefunden (oder gehört nicht zu userId).",
        id: String(_id),
        userId: userId ?? null,
        coll: col.collectionName,
      });
    }

    // ------- Balance-Operationen anwenden -------
    try {
      if (balanceOps.length) {
        const now = new Date().toISOString();
        for (const op of balanceOps) {
          let accountFilter: any;
          try {
            accountFilter = { _id: new ObjectId(op.accountId), type: "account", ...(userId ? { userId } : {}), deleted: { $ne: true } };
          } catch {
            // Fallback, falls accountId bereits als String-_id gespeichert wurde
            accountFilter = { _id: op.accountId as any, type: "account", ...(userId ? { userId } : {}), deleted: { $ne: true } };
          }

          await col.updateOne(
            accountFilter,
            {
              $inc: { currentBalance: op.amount, realizedPnl: op.amount },
              $push: {
                transactions: {
                  _id: `${now}-${op.txType}-${String(_id)}`,
                  type: op.txType,
                  tradeId: String(_id),
                  amount: op.amount,
                  at: now,
                }
              },
              $set: { updatedAt: now }
            }
          );
        }
      }
    } catch (e) {
      console.warn("⚠️ Konnte Account-Balance nicht aktualisieren:", (e as any)?.message);
    }

    console.log("✅ Trade aktualisiert:", { id: String(_id), modified: result.modifiedCount });

    return res.status(200).json({
      ok: true,
      id: String(_id),
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/update:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
