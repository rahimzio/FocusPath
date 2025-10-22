// pages/api/trading/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, getTradingCollection } from "../db/mongo";

/* ---------------- helpers ---------------- */
function adherenceOk(a: any): "yes" | "partial" | "no" | undefined {
  const s = String(a ?? "").toLowerCase();
  if (s === "yes" || s === "partial" || s === "no") return s as any;
  return undefined;
}
const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};
const toNumOpt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const toBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";
const toStr = (v: any) => (v === undefined || v === null ? undefined : String(v));
const trimOrUndef = (v: any) => {
  const s = toStr(v)?.trim();
  return s ? s : undefined;
};
const date10 = (d: any) => {
  const s = String(d || "");
  return s ? s.slice(0, 10) : undefined;
};
const minutesBetween = (start?: string, end?: string) => {
  if (!start || !end) return undefined;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
};
const clampResult = (r: any): "win" | "loss" | "BE" => {
  const s = String(r || "").toLowerCase();
  if (s === "win") return "win";
  if (s === "loss") return "loss";
  return "BE";
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
  return (["S", "A", "B", "C"] as const).includes(v as any) ? (v as any) : undefined;
};
const luckOk = (v: any): "positive" | "neutral" | "negative" | undefined => {
  const s = String(v ?? "").toLowerCase();
  return s === "positive" || s === "neutral" || s === "negative" ? (s as any) : undefined;
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
  const vals = raw.map((x) => trimOrUndef(x)).filter((x): x is string => !!x);
  return vals.length ? vals : undefined;
}
function sanitizeIdArray(raw: any): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const set = new Set<string>();
  for (const x of raw) {
    const s = trimOrUndef(x);
    if (s) set.add(s);
  }
  return set.size ? Array.from(set) : undefined;
}

/* Partial Exits */
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

    if (!label && price === undefined && percent === undefined && !at && !note) continue;
    out.push({ label, price, percent, at, note });
  }
  return out.length ? out : undefined;
}

/* --------------- handler --------------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    const body = req.body ?? {};
    console.log("📥 /api/trading/create", {
      userId: body?.userId,
      date: body?.date,
      symbol: body?.symbol,
      accountId: body?.accountId,
      strategy: body?.strategy || body?.strategy_name,
    });

    const userId = trimOrUndef(body.userId);
    const date = date10(body.date) || date10(new Date().toISOString());
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!date) return res.status(400).json({ error: "date ist ungültig" });

    // --- Kernfelder ---
    const doc: any = {
      type: "tradeEntry",
      userId,
      date,
      symbol: trimOrUndef(body.symbol),
      accountId: trimOrUndef(body.accountId),

      tradeType: ((): "buy" | "sell" => (String(body.tradeType || "buy").toLowerCase() === "sell" ? "sell" : "buy"))(),

      entry: toNumOpt(body.entry),
      exit: toNumOpt(body.exit),
      pnl: toNum(body.pnl, 0),

      lotSize: toNumOpt(body.lotSize),
      potentialLoss: toNumOpt(body.potentialLoss),
      rating: toNumOpt(body.rating),

      // Ergebnis NUR setzen, wenn win/loss/BE übergeben wurde (kein „ongoing“)
      ...(body.result !== undefined && String(body.result).trim() !== ""
        ? { result: clampResult(body.result) }
        : {}),

      notes: trimOrUndef(body.notes),

      setup: trimOrUndef(body.setup),
      riskReward: trimOrUndef(body.riskReward),
      confluences: sanitizeStringArray(body.confluences) ?? [],

      // Zeiten/Session
      startTime: trimOrUndef(body.startTime),
      endTime: trimOrUndef(body.endTime),
      durationMin: toNumOpt(body.durationMin),
      session: sessionOk(body.session),

      // Outcome
      outcomeFlags: {
        breakEven: toBool(body?.outcomeFlags?.breakEven) || toBool(body.breakEven),
        stopHit: toBool(body?.outcomeFlags?.stopHit) || toBool(body.stopHit),
      },
      biasExecution: biasExecOk(body.biasExecution),

      // Arrays/Konzepte
      tradingMistakes: sanitizeStringArray(body.tradingMistakes),
      viewTimeframes: sanitizeStringArray(body.viewTimeframes),
      entryTimeframe: trimOrUndef(body.entryTimeframe),
      concepts: sanitizeConcepts(body.concepts),

      // Range & Ort
      rangeDefined: toBool(body.rangeDefined),
      rangeNote: trimOrUndef(body.rangeNote),
      location: trimOrUndef(body.location),

      // Game
      gameComputed: gradeOk(body.gameComputed),
      gameSelf: gradeOk(body.gameSelf),
      gameItems: sanitizeIdArray(body.gameItems),
      gameCatalogScore: toNumOpt(body.gameCatalogScore),
      gameCatalogGrade: gradeOk(body.gameCatalogGrade),

      // Strategy (vereinheitlicht)
      strategyAdherence: adherenceOk(body.strategyAdherence),
      strategy: trimOrUndef(body.strategy) || trimOrUndef(body.strategy_name),
      strategy_name: trimOrUndef(body.strategy_name) || trimOrUndef(body.strategy),

      // SL/TP
      stopPrice: toNumOpt(body.stopPrice),
      targetPrice: toNumOpt(body.targetPrice),

      // Mentales
      emotionBefore: trimOrUndef(body.emotionBefore),
      mentalMistake: trimOrUndef(body.mentalMistake),
      performanceState: gradeOk(body.performanceState),

      followedSetup: toBool(body.followedSetup),
      respectedStopLoss: toBool(body.respectedStopLoss),
      managedRisk: toBool(body.managedRisk),
      disciplineScore: toNumOpt(body.disciplineScore),

      // --- Process / Journal (NEU) ---
      processIntent: trimOrUndef(body.processIntent),
      processFocus: sanitizeStringArray(body.processFocus), // ⇦ jetzt string[]
      ifThenPlan: trimOrUndef(body.ifThenPlan),
      processNotes: trimOrUndef(body.processNotes),
      luckFactor: luckOk(body.luckFactor),                  // ⇦ Union

      processAdherence: toNumOpt(body.processAdherence),
      tiltNoticed: toBool(body.tiltNoticed) || undefined,
      cooldownDone: toBool(body.cooldownDone) || undefined,
      processDebrief: trimOrUndef(body.processDebrief),
      hidePnLUntilDebrief: toBool(body.hidePnLUntilDebrief) || undefined,

      // --- Reflection (optional) ---
      reflectionNotes: trimOrUndef(body.reflectionNotes),
      triggerEvent: trimOrUndef(body.triggerEvent),
      tiltDetected: toBool(body.tiltDetected) || undefined,

      // Partial Exits (NEU)
      ...(toBool(body.hasPartialExits) && sanitizePartialExits(body.partialExits)
        ? {
            hasPartialExits: true,
            partialExits: sanitizePartialExits(body.partialExits),
          }
        : {}),

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Fallback: durationMin aus start/end
    if (doc.durationMin === undefined) {
      const dur = minutesBetween(doc.startTime, doc.endTime);
      if (dur !== undefined) doc.durationMin = dur;
    }

    // Status ableiten (wenn kein expliziter Status/Completed)
    const statusFromBody = trimOrUndef(body.status) as "draft" | "final" | undefined;
    const completedFromBody = body.completed;
    const essentialOk =
      !!doc.symbol &&
      (Number.isFinite(doc.entry) || Number.isFinite(doc.exit)) &&
      !!doc.result; // result nur vorhanden, wenn win/loss/BE übergeben wurde

    if (statusFromBody) {
      doc.status = statusFromBody === "final" ? "final" : "draft";
      doc.completed = doc.status === "final";
    } else if (completedFromBody !== undefined) {
      doc.completed = toBool(completedFromBody);
      doc.status = doc.completed ? "final" : "draft";
    } else {
      doc.status = essentialOk ? "final" : "draft";
      doc.completed = doc.status === "final";
    }

    // Missing-Felder (optional)
    const missing: string[] = [];
    if (!doc.symbol) missing.push("symbol");
    if (!Number.isFinite(doc.entry) && !Number.isFinite(doc.exit)) missing.push("entry/exit");
    if (!doc.accountId) missing.push("accountId");
    if (!doc.strategy && !doc.strategy_name) missing.push("strategy");
    if (!doc.session) missing.push("session");
    if (!doc.result) missing.push("result"); // wenn nicht übergeben ⇒ Draft
    doc.missing = missing.length ? missing : undefined;

    // Null/undefined/Leere Arrays aufräumen
    Object.keys(doc).forEach((k) => {
      const v = (doc as any)[k];
      if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) {
        delete (doc as any)[k];
      }
    });

    const result = await col.insertOne(doc);
    console.log("✅ Trade erstellt:", { _id: result.insertedId });

    // Konto-Fortschreibung bei FINAL + PnL + accountId
    try {
      if (doc.accountId && typeof doc.pnl === "number" && doc.status === "final") {
        const now = new Date().toISOString();

        // accountId sicher in ObjectId gießen (Fallback: string match)
        let accId: ObjectId | string = doc.accountId;
        try { accId = new ObjectId(String(doc.accountId)); } catch {}

        await col.updateOne(
          { _id: accId as any, type: "account", userId: doc.userId, deleted: { $ne: true } },
          {
            $inc: { currentBalance: doc.pnl, realizedPnl: doc.pnl },
            $push: {
              transactions: {
                _id: `${now}-pnl-${String(result.insertedId)}`,
                type: "pnl",
                tradeId: String(result.insertedId),
                amount: doc.pnl,
                at: now,
              }
            },
            $set: { updatedAt: now }
          }
        );
      }
    } catch (e) {
      console.warn("⚠️ Konnte Account-Balance nicht fortschreiben:", (e as any)?.message);
    }

    return res.status(200).json({
      ok: true,
      id: String(result.insertedId),
      status: doc.status,
      completed: doc.completed,
    });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/create:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
