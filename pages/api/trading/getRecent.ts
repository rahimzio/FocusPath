// pages/api/trading/getRecent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, getTradingCollection } from "../db/mongo";

const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function pad(n: number) { return String(n).padStart(2, "0"); }
function nextDayISO(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function isDateOnly(s?: string) {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// YYYY-MM-DD in bestimmter TZ aus einem ISO/Zeit-String ableiten
function isoToDateOnlyInTZ(iso: string, tz = "Europe/Berlin"): string | undefined {
  const d = new Date(iso);
  if (!Number.isFinite(+d)) return undefined;
  // en-CA = YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

// aus YYYY-MM-DD (lokal gemeint) Date-Objekte für UTC-Grenzen bauen
function ymdToUtcRange(ymd: string): { from: Date; to: Date } {
  const [y, m, d] = ymd.split("-").map(Number);
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endLocal   = new Date(y, m - 1, d, 23, 59, 59, 999);
  const from = new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000);
  const to   = new Date(endLocal.getTime()   - endLocal.getTimezoneOffset()   * 60000);
  return { from, to };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Eingang loggen
  console.log("[API getRecent] query =", req.query);

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // Indizes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ type: 1, userId: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, date: -1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, accountId: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, strategy: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, strategy_name: 1, _id: -1 }),
        col.createIndex({ type: 1, userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch {}

    const {
      userId, accountId, strategy, from, to,
      cursor, limit: limitRaw, status, includeArchived, tz,
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const limit = clamp(Number(limitRaw ?? 100) || 100, 1, 500);
    const timeZone = tz || "Europe/Berlin";

    // 🧱 Basis-Match (ohne $or-Gemische)
    const match: any = { userId, deleted: { $ne: true } };
    const andConds: any[] = [
      { $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] }, // toleranter type-Guard
    ];

    // Archiv-Policy
    const allowArchived = includeArchived === "true";
    if (!allowArchived) andConds.push({ archived: { $ne: true } });

    // optionale Filter
    if (accountId) andConds.push({ accountId });
    if (strategy) andConds.push({ $or: [{ strategy }, { strategy_name: strategy }] });

    // Status korrekt kombinieren (statt $or zu überschreiben)
    if (status === "draft") {
      andConds.push({ $or: [{ status: "draft" }, { completed: { $ne: true } }] });
    } else if (status === "final") {
      andConds.push({ $or: [{ status: "final" }, { completed: true }] });
    }

    // → herausfinden, ob 'date' als String oder Date gespeichert ist
    const sampleDoc = await col.findOne(
      { userId, $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] },
      { projection: { date: 1, createdAt: 1 } }
    );
    const dateLooksString = typeof sampleDoc?.date === "string";

    // 🔎 Datumsfilter robust:
    if (from || to) {
      if (dateLooksString) {
        // FALL A: DB speichert date als "YYYY-MM-DD" (String) → mit YYYY-MM-DD-Grenzen in gewünschter TZ filtern
        const fromDay = from
          ? (isDateOnly(from) ? from : isoToDateOnlyInTZ(from, timeZone))
          : undefined;
        const toDayExclusive = to
          ? (isDateOnly(to) ? nextDayISO(to) : (() => {
              const dOnly = isoToDateOnlyInTZ(to, timeZone);
              return dOnly ? nextDayISO(dOnly) : undefined;
            })())
          : undefined;

        const cond: any = {};
        if (fromDay) cond.$gte = fromDay;          // inkl. Starttag
        if (toDayExclusive) cond.$lt = toDayExclusive; // exklusiv Folgetag
        andConds.push({ date: cond });
      } else {
        // FALL B: DB speichert date als Date → echte Date-Objekte verwenden
        let fromDate: Date | undefined;
        let toDate: Date | undefined;

        if (from) {
          if (isDateOnly(from)) {
            const r = ymdToUtcRange(from);
            fromDate = r.from;
          } else {
            const d = new Date(from);
            if (Number.isFinite(+d)) fromDate = d;
          }
        }
        if (to) {
          if (isDateOnly(to)) {
            // exklusiv: nächster Tag 00:00 UTC
            const [y, m, d] = to.split("-").map(Number);
            const nd = new Date(Date.UTC(y, m - 1, d));
            nd.setUTCDate(nd.getUTCDate() + 1);
            toDate = nd;
          } else {
            const d = new Date(to);
            if (Number.isFinite(+d)) toDate = d;
          }
        }

        const cond: any = {};
        if (fromDate) cond.$gte = fromDate;
        if (toDate)   cond.$lt  = toDate; // exklusiv
        andConds.push({ date: cond });
      }
    }

    // Cursor
    if (cursor) {
      try { match._id = { ...(match._id || {}), $lt: new ObjectId(String(cursor)) }; } catch {}
    }

    if (andConds.length) match.$and = andConds;

    // Vor dem Query ausgeben
    console.log("[API getRecent] match =", JSON.stringify(match));
    console.log("[API getRecent] limit =", limit, "cursor =", cursor ?? null);

    const docs = await col.find(match).sort({ _id: -1 }).limit(limit + 1).toArray();

    console.log("[API getRecent] raw docs len =", docs.length);

    let nextCursor: string | null = null;
    let pageDocs = docs;
    if (docs.length > limit) {
      pageDocs = docs.slice(0, limit);
      nextCursor = String(pageDocs[pageDocs.length - 1]._id);
    }

    const trades = pageDocs.map((d: any) => {
      // Bewahre original 'date' bei; wenn string, ist es YYYY-MM-DD
      const dateRaw = d.date;

      // Versuche, eine dateTime herzuleiten (nur für Anzeige):
      let dateTime: string | undefined;
      if (typeof d.date === "string") {
        // wenn es ein separates 'time' Feld gibt (HH:mm oder HH:mm:ss), kombiniere
        const t = (d.time || d.startTime || "").toString().trim();
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) {
          const tFull = t.length === 5 ? `${t}:00` : t; // HH:MM → HH:MM:SS
          dateTime = `${d.date}T${tFull}Z`;
        } else {
          dateTime = `${d.date}T00:00:00Z`;
        }
      } else if (d.date instanceof Date) {
        dateTime = (d.date as Date).toISOString();
      } else {
        dateTime = undefined;
      }

      const dateOnly = typeof dateRaw === "string"
        ? dateRaw.slice(0, 10)
        : (dateTime ? dateTime.slice(0, 10) : "");

      return {
        _id: String(d._id),
        userId: d.userId,
        date: dateOnly,              // YYYY-MM-DD (für Gruppen/Filter)
        dateTime,                    // volle Zeit (so gut wie möglich)
        symbol: d.symbol ?? "",
        accountId: d.accountId ?? undefined,
        entry: Number.isFinite(Number(d.entry)) ? Number(d.entry) : undefined,
        pnl: Number.isFinite(Number(d.pnl)) ? Number(d.pnl) : undefined,
        lotSize: Number.isFinite(Number(d.lotSize)) ? Number(d.lotSize) : undefined,
        potentialLoss: Number.isFinite(Number(d.potentialLoss)) ? Number(d.potentialLoss) : undefined,
        rating: Number.isFinite(Number(d.rating)) ? Number(d.rating) : undefined,
        // ❗ Kein Default mehr – Drafts behalten undefined/null:
        result: typeof d.result === "string" ? d.result : undefined,
        tradeType: d.tradeType === "sell" ? "sell" : "buy",
        strategy: d.strategy ?? d.strategy_name ?? undefined,
        strategy_name: d.strategy_name ?? d.strategy ?? undefined,
        notes: d.notes ?? "",
        startTime: d.startTime ?? undefined,
        endTime: d.endTime ?? undefined,
        durationMin: Number.isFinite(Number(d.durationMin)) ? Number(d.durationMin) : undefined,
        riskReward: typeof d.riskReward === "string" && d.riskReward.trim() ? d.riskReward.trim() : undefined,
        session: d.session ?? undefined,
        confluences: Array.isArray(d.confluences) ? d.confluences.map(String) : [],
        outcomeFlags: {
          breakEven: !!(d.outcomeFlags?.breakEven),
          stopHit: !!(d.outcomeFlags?.stopHit),
        },
        biasExecution: d.biasExecution ?? undefined,
        tradingMistakes: Array.isArray(d.tradingMistakes) ? d.tradingMistakes : [],
        rangeDefined: !!d.rangeDefined,
        rangeNote: d.rangeNote ?? "",
        viewTimeframes: Array.isArray(d.viewTimeframes) ? d.viewTimeframes : [],
        entryTimeframe: d.entryTimeframe ?? "",
        concepts: Array.isArray(d.concepts) ? d.concepts : [],
        location: d.location ?? "",
        gameComputed: d.gameComputed ?? undefined,
        gameSelf: d.gameSelf ?? undefined,
        gameItems: Array.isArray(d.gameItems) ? d.gameItems.map(String) : [],
        gameCatalogScore: toNum(d.gameCatalogScore, 0) ?? 0,
        gameCatalogGrade: d.gameCatalogGrade ?? undefined,
        stopPrice: Number.isFinite(Number(d.stopPrice)) ? Number(d.stopPrice) : undefined,
        targetPrice: Number.isFinite(Number(d.targetPrice)) ? Number(d.targetPrice) : undefined,
        status: d.status ?? (d.completed ? "final" : "draft"),
        completed: !!d.completed,
        missing: Array.isArray(d.missing) ? d.missing : [],
        createdAt: d.createdAt ?? undefined,
        updatedAt: d.updatedAt ?? undefined,
      };
    });

    console.log("[API getRecent] trades n =", trades.length, "nextCursor =", nextCursor);
    if (trades.length) {
      console.log("[API getRecent] sample trade =", {
        _id: trades[0]._id,
        date: trades[0].date,
        time: trades[0].dateTime?.slice(11, 16) ?? "",
        grade: trades[0].gameCatalogGrade ?? trades[0].gameComputed ?? "-",
        score: trades[0].gameCatalogScore,
      });
    }

    return res.status(200).json({ trades, nextCursor });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/getRecent:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
