"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Game = "A" | "B" | "C";
type LibraryItem = {
  _id: string;
  userId: string;
  label: string;
  game: Game;
  points: number;
  active: boolean;
  tags?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

function dispatchLibraryUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("game-library-updated"));
  }
}

function useLibrary(userId: string | undefined, opts: {
  game?: Game | "ALL",
  q?: string,
  activeOnly?: boolean,
  limit?: number,
}) {
  const [cursor, setCursor] = React.useState<string | null>(null);

  const key = React.useMemo(() => {
    if (!userId) return null;
    const params = new URLSearchParams();
    params.set("userId", userId);
    if (opts.game && opts.game !== "ALL") params.set("game", opts.game);
    if (opts.q) params.set("q", opts.q);
    if (opts.activeOnly) params.set("active", "true");
    if (opts.limit) params.set("limit", String(opts.limit));
    if (cursor) params.set("cursor", cursor);
    return `/api/trading/gameLibrary?${params.toString()}`;
  }, [userId, opts.game, opts.q, opts.activeOnly, opts.limit, cursor]);

  const swr = useSWR<{ items: LibraryItem[]; nextCursor: string | null }>(key, fetcher, {
    keepPreviousData: true,
  });

  const loadMore = () => {
    if (swr.data?.nextCursor) setCursor(swr.data.nextCursor);
  };

  const resetCursor = () => setCursor(null);

  React.useEffect(() => {
    // bei Filteränderung zurück auf Seite 1
    setCursor(null);
  }, [opts.game, opts.q, opts.activeOnly, opts.limit]);

  return { ...swr, loadMore, resetCursor, cursor };
}

/* ---------- Create/Edit Dialog ---------- */

function ItemDialog({
  userId,
  initial,
  onDone,
  trigger,
}: {
  userId: string;
  initial?: Partial<LibraryItem>;
  onDone: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [game, setGame] = React.useState<Game>(initial?.game ?? "A");
  const [points, setPoints] = React.useState<number>(initial?.points ?? (game === "A" ? 3 : game === "B" ? 2 : 1));
  const [tags, setTags] = React.useState<string>((initial?.tags ?? []).join(", "));
  const [active, setActive] = React.useState<boolean>(initial?.active ?? true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // Points-Default an Game koppeln, wenn noch nicht manuell gesetzt
    if (!initial?._id) {
      setPoints(game === "A" ? 3 : game === "B" ? 2 : 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const onSubmit = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      if (initial?._id) {
        // Update
        const resp = await fetch(`/api/trading/gameLibrary?id=${initial._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            label,
            game,
            points,
            tags: tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            active,
          }),
        });
        if (!resp.ok) throw new Error("Update failed");
      } else {
        // Create
        const resp = await fetch(`/api/trading/gameLibrary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            label,
            game,
            points,
            tags: tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            active,
          }),
        });
        if (!resp.ok) throw new Error("Create failed");
      }
      dispatchLibraryUpdated();
      onDone();
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?._id ? "Eintrag bearbeiten" : "Neuen Game-Item anlegen"}</DialogTitle>
          <DialogDescription>Definiere Checklisten-Punkte für A/B/C-Game.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Plan befolgt" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Kategorie</Label>
              <Select value={game} onValueChange={(v) => setGame(v as Game)}>
                <SelectTrigger><SelectValue placeholder="A/B/C" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A (3 Punkte)</SelectItem>
                  <SelectItem value="B">B (2 Punkte)</SelectItem>
                  <SelectItem value="C">C (1 Punkt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Punkte</Label>
              <Input
                type="number"
                step="1"
                value={String(points)}
                onChange={(e) => setPoints(Number(e.target.value || 0))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Tags (kommagetrennt)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="z. B. disziplin, risk" />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
            <Label htmlFor="active">Aktiv</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={onSubmit} disabled={saving || !label.trim()}>
            {initial?._id ? "Speichern" : "Anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Item Row ---------- */

function ItemRow({
  item,
  onChanged,
  userId,
}: {
  item: LibraryItem;
  userId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  const patch = async (payload: Partial<LibraryItem>) => {
    setBusy(true);
    try {
      const resp = await fetch(`/api/trading/gameLibrary?id=${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });
      if (!resp.ok) throw new Error("Patch failed");
      dispatchLibraryUpdated();
      onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      const resp = await fetch(`/api/trading/gameLibrary?id=${item._id}&mode=archive`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Archive failed");
      dispatchLibraryUpdated();
      onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/trading/gameLibrary?id=${item._id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Delete failed");
      dispatchLibraryUpdated();
      onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-md border p-3",
      item.active ? "opacity-100" : "opacity-60"
    )}>
      <Badge variant={item.game === "A" ? "default" : item.game === "B" ? "secondary" : "outline"}>
        {item.game}
      </Badge>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.label}</div>
        <div className="text-xs text-muted-foreground truncate">
          {item.tags?.length ? item.tags.join(", ") : "—"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline">Pts {item.points}</Badge>
        <div className="flex items-center gap-2 pl-2">
          <Checkbox
            id={`active-${item._id}`}
            checked={item.active}
            onCheckedChange={(v) => patch({ active: v === true })}
            disabled={busy}
          />
          <Label htmlFor={`active-${item._id}`} className="text-sm">aktiv</Label>
        </div>

        <ItemDialog
          userId={userId}
          initial={item}
          onDone={onChanged}
          trigger={
            <Button variant="outline" size="sm" disabled={busy}>Bearbeiten</Button>
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={busy} title="Mehr">
              ⋯
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={archive}>Archivieren</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={remove}>Löschen</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ---------- Haupt-Komponente ---------- */

export default function GameLibrary({ userId }: { userId: string }) {
  const [q, setQ] = React.useState("");
  const [game, setGame] = React.useState<"ALL" | Game>("ALL");
  const [activeOnly, setActiveOnly] = React.useState(true);
  const [limit, setLimit] = React.useState(50);

  const { data, error, isLoading, mutate, loadMore } = useLibrary(userId, {
    q: q.trim() || undefined,
    game,
    activeOnly,
    limit,
  });

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Game-Katalog (A/B/C)</CardTitle>
            <CardDescription>Checklisten-Punkte pflegen – erscheint später in der Trade-Eingabe.</CardDescription>
          </div>

          <ItemDialog
            userId={userId}
            onDone={() => mutate()}
            trigger={<Button>Neu</Button>}
          />
        </div>

        {/* Filterzeile */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Suchen (Label, Tags)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Select value={game} onValueChange={(v) => setGame(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md border">
            <Checkbox id="activeOnly" checked={activeOnly} onCheckedChange={(v) => setActiveOnly(v === true)} />
            <Label htmlFor="activeOnly" className="text-sm">nur aktive</Label>
          </div>

          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map(n => (
                <SelectItem key={n} value={String(n)}>{n} / Seite</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && <div className="text-red-600">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70">Lade…</div>}

        {!isLoading && items.length === 0 && (
          <div className="opacity-70">Keine Einträge gefunden.</div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {items.map((it) => (
              <ItemRow key={it._id} item={it} userId={userId} onChanged={() => mutate()} />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {items.length} Einträge
        </div>
        {nextCursor ? (
          <Button variant="outline" onClick={loadMore}>Mehr laden</Button>
        ) : (
          <div className="text-sm opacity-70">Ende</div>
        )}
      </CardFooter>
    </Card>
  );
}
