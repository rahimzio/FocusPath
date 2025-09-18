// utils/time/periods.ts
export type Period = { start: string; end: string };
export type YM = `${number}-${string}`;
export type YQ = `${number}-Q${1|2|3|4}`;

export function getMonthPeriod(ym: string): Period {
  const [y,m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m-1, 1));
  const end   = new Date(Date.UTC(y, m, 1)); // exklusiv
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getMonthFourSegments(ym: string) {
  const [y,m] = ym.split("-").map(Number);
  const iso = (d: Date) => d.toISOString();
  const nextMonth = new Date(Date.UTC(y, m, 1));

  return [
    { label: `${ym} W1`, start: iso(new Date(Date.UTC(y, m-1, 1))),  end: iso(new Date(Date.UTC(y, m-1, 8)))  }, // [1..7]
    { label: `${ym} W2`, start: iso(new Date(Date.UTC(y, m-1, 8))),  end: iso(new Date(Date.UTC(y, m-1, 15))) }, // [8..14]
    { label: `${ym} W3`, start: iso(new Date(Date.UTC(y, m-1, 15))), end: iso(new Date(Date.UTC(y, m-1, 22))) }, // [15..21]
    { label: `${ym} W4`, start: iso(new Date(Date.UTC(y, m-1, 22))), end: iso(nextMonth) },                     // [22..end)
  ];
}

export function getQuarterMonths(yq: string): string[] {
  const [y, qStr] = yq.split("-Q");
  const yNum = Number(y), q = Number(qStr);
  const start = (q-1)*3 + 1; // 1,4,7,10
  const pad = (n:number)=>String(n).padStart(2,"0");
  return [`${yNum}-${pad(start)}`, `${yNum}-${pad(start+1)}`, `${yNum}-${pad(start+2)}`];
}

export function quarterPeriod(yq: string): Period {
  const months = getQuarterMonths(yq);
  const first = getMonthPeriod(months[0]).start;
  const last  = getMonthPeriod(months[2]).end;
  return { start: first, end: last };
}
export function monthFromDate(d: Date): YM {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}