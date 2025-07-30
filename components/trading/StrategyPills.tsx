"use client";
import useSWR from "swr";

interface Props {
  userId: string;
  onSelect?: (id: string) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StrategyPills({ userId, onSelect }: Props) {
  const { data } = useSWR(userId ? `/api/strategies` : null, fetcher);
  if (!data) return <div>Lade Strategien...</div>;

  return (
    <div className="flex gap-2 flex-wrap">
      {data.strategies.map((s: any) => (
        <button
          key={s._id}
          onClick={() => onSelect && onSelect(s._id)}
          className="px-3 py-1 rounded-full text-sm"
          style={{ backgroundColor: s.tag_color || "#e5e7eb" }}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}