"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Game = "A" | "B" | "C";
type Scope = "trade" | "setup" | "reflection";

type LibraryItem = {
  _id: string;
  userId: string;
  label: string;
  game: Game;
  points: number;
  active: boolean;

  // ✅ legacy single scope (kept)
  scope?: Scope;

  // ✅ NEW: multi scope
  scopes?: Scope[];

  tags?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function dispatchLibraryUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("game-library-updated"));
  }
}

function normalizeScopes(item: Partial<LibraryItem> | undefined | null): Scope[] {
  if (!item) return ["trade"];
  const arr = Array.isArray(item.scopes)
    ? item.scopes.filter((x): x is Scope => x === "trade" || x === "setup" || x === "reflection")
    : [];
  if (arr.length) return Array.from(new Set(arr));
  if (item.scope === "trade" || item.scope === "setup" || item.scope === "reflection") return [item.scope];
  return ["trade"];
}

function scopeLabel(s: Scope) {
  return s.toUpperCase();
}

function useLibrary(
  userId: string | undefined,
  opts: {
    game?: Game | "ALL";
    scope?: Scope;
    q?: string;
    activeOnly?: boolean;
    limit?: number;
  }
) {
  const [cursor, setCursor] = React.useState<string | null>(null);

  const key = React.useMemo(() => {
    if (!userId) return null;
    const params = new URLSearchParams();
    params.set("userId", userId);

    // ⚠️ Wir lassen scope param drin (falls Backend das kann).
    // Wenn Backend nur legacy scope kennt, ist okay.
    if (opts.scope) params.set("scope", opts.scope);

    if (opts.game && opts.game !== "ALL") params.set("game", opts.game);
    if (opts.q) params.set("q", opts.q);
    if (opts.activeOnly) params.set("active", "true");
    if (opts.limit) params.set("limit", String(opts.limit));
    if (cursor) params.set("cursor", cursor);

    return `/api/trading/gameLibrary?${params.toString()}`;
  }, [userId, opts.scope, opts.game, opts.q, opts.activeOnly, opts.limit, cursor]);

  const swr = useSWR<{ items: LibraryItem[]; nextCursor: string | null }>(key, fetcher, {
    keepPreviousData: true,
  });

  const loadMore = () => {
    if (swr.data?.nextCursor) setCursor(swr.data.nextCursor);
  };

  // ✅ pages zusammenbauen (append statt ersetzen)
  const [accItems, setAccItems] = React.useState<LibraryItem[]>([]);
  const [accNextCursor, setAccNextCursor] = React.useState<string | null>(null);

  React.useEffect(() => {
    const page = swr.data?.items ?? [];
    const next = swr.data?.nextCursor ?? null;

    setAccNextCursor(next);

    setAccItems((prev) => {
      if (!cursor) return page;

      const seen = new Set(prev.map((x) => x._id));
      const merged = [...prev];
      for (const it of page) {
        if (!seen.has(it._id)) merged.push(it);
      }
      return merged;
    });
  }, [swr.data?.items, swr.data?.nextCursor, cursor]);

  React.useEffect(() => {
    setCursor(null);
    setAccItems([]);
    setAccNextCursor(null);
  }, [opts.scope, opts.game, opts.q, opts.activeOnly, opts.limit]);

  return { ...swr, loadMore, accItems, accNextCursor };
}

/* ---------- Create/Edit Dialog ---------- */

function ItemDialog({
  userId,
  defaultScope,
  initial,
  onDone,
  trigger,
}: {
  userId: string;
  defaultScope?: Scope;
  initial?: Partial<LibraryItem>;
  onDone: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  // ✅ multi scope state
  const [scopes, setScopes] = React.useState<Scope[]>(
    initial ? normalizeScopes(initial) : [defaultScope ?? "trade"]
  );

  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [game, setGame] = React.useState<Game>(initial?.game ?? "A");
  const [points, setPoints] = React.useState<number>(
    initial?.points ?? (game === "A" ? 3 : game === "B" ? 2 : 1)
  );
  const [tags, setTags] = React.useState<string>((initial?.tags ?? []).join(", "));
  const [active, setActive] = React.useState<boolean>(initial?.active ?? true);
  const [saving, setSaving] = React.useState(false);

  // ✅ Reset state sauber beim Öffnen / Item-Wechsel
  React.useEffect(() => {
    if (!open) return;

    const initialScopes = initial ? normalizeScopes(initial) : [defaultScope ?? "trade"];
    setScopes(initialScopes);

    const g = (initial?.game as Game) ?? "A";
    setLabel(initial?.label ?? "");
    setGame(g);
    setPoints(initial?.points ?? (g === "A" ? 3 : g === "B" ? 2 : 1));
    setTags((initial?.tags ?? []).join(", "));
    setActive(initial?.active ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?._id]);

  // NEW-Item: Punkte bei Game-Wechsel automatisch setzen
  React.useEffect(() => {
    if (!initial?._id) setPoints(game === "A" ? 3 : game === "B" ? 2 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  function toggleScope(sc: Scope, on: boolean) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (on) next.add(sc);
      else next.delete(sc);

      // ✅ mindestens ein scope muss bleiben
      const arr = Array.from(next.values());
      return arr.length ? arr : [defaultScope ?? "trade"];
    });
  }

  const onSubmit = async () => {
    if (!label.trim()) return;

    const cleanScopes = Array.from(new Set(scopes)).filter(
      (x): x is Scope => x === "trade" || x === "setup" || x === "reflection"
    );
    if (!cleanScopes.length) {
      alert("Bitte mindestens einen Scope auswählen.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        userId,

        // ✅ NEW: multi scopes
        scopes: cleanScopes,

        // ✅ legacy fallback (für bestehendes Backend)
        scope: cleanScopes[0],

        label: label.trim(),
        game,
        points,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        active,
      };

      if (initial?._id) {
        const resp = await fetch(`/api/trading/gameLibrary?id=${initial._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error("Update failed");
      } else {
        const resp = await fetch(`/api/trading/gameLibrary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error("Create failed");
      }

      dispatchLibraryUpdated();
      onDone();
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?._id ? "Eintrag bearbeiten" : "Neuen Game-Item anlegen"}</DialogTitle>
          <DialogDescription>
            Definiere Checklisten-Punkte für A/B/C — und ordne sie den richtigen Scopes zu (trade/setup/reflection).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* ✅ NEW: Multi Scope */}
          <div className="grid gap-2">
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-3">
              {(["trade", "setup", "reflection"] as const).map((sc) => {
                const checked = scopes.includes(sc);
                return (
                  <div key={sc} className="flex items-center gap-2">
                    <Checkbox
                      id={`scope-${sc}-${initial?._id ?? "new"}`}
                      checked={checked}
                      onCheckedChange={(v) => toggleScope(sc, v === true)}
                    />
                    <Label htmlFor={`scope-${sc}-${initial?._id ?? "new"}`} className="text-sm">
                      {sc}
                    </Label>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Du kannst ein Item in mehreren Bereichen nutzen (z.B. trade + setup).
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z. B. ICC-Faktoren aligned"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Kategorie</Label>
              <Select value={game} onValueChange={(v) => setGame(v as Game)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="A/B/C" />
                </SelectTrigger>
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
                className="w-full"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Tags (kommagetrennt)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="z. B. icc, discipline, hesitation"
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
            <Label htmlFor="active">Aktiv</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
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

  const itemScopes = React.useMemo(() => normalizeScopes(item), [item]);

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
      alert("Update fehlgeschlagen.");
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
      alert("Archivieren fehlgeschlagen.");
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
      alert("Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border p-3 min-w-0 w-full max-w-full",
        item.active ? "opacity-100" : "opacity-60"
      )}
    >
      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <Badge variant={item.game === "A" ? "default" : item.game === "B" ? "secondary" : "outline"}>
          {item.game}
        </Badge>

        {/* ✅ Multi scope badges */}
        {itemScopes.map((sc) => (
          <Badge key={sc} variant="outline" className="text-[10px] uppercase">
            {scopeLabel(sc)}
          </Badge>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.label}</div>
        <div className="text-xs text-muted-foreground truncate">
          {item.tags?.length ? item.tags.join(", ") : "—"}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:justify-end shrink-0">
        <Badge variant="outline">Pts {item.points}</Badge>

        <div className="flex items-center gap-2 pl-2">
          <Checkbox
            id={`active-${item._id}`}
            checked={item.active}
            onCheckedChange={(v) => patch({ active: v === true })}
            disabled={busy}
          />
          <Label htmlFor={`active-${item._id}`} className="text-sm">
            aktiv
          </Label>
        </div>

        <ItemDialog
          userId={userId}
          initial={item}
          onDone={onChanged}
          trigger={
            <Button variant="outline" size="sm" disabled={busy} className="whitespace-nowrap">
              Bearbeiten
            </Button>
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={busy} title="Mehr" aria-label="Mehr">
              ⋯
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={archive}>Archivieren</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={remove}>
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ---------- Haupt-Komponente ---------- */

export default function GameLibrary({ userId }: { userId: string }) {
  const [q, setQ] = React.useState("");
  const [scope, setScope] = React.useState<Scope | "ALL">("trade");
  const [game, setGame] = React.useState<"ALL" | Game>("ALL");
  const [activeOnly, setActiveOnly] = React.useState(true);
  const [limit, setLimit] = React.useState(50);

  const { error, isLoading, mutate, loadMore, accItems, accNextCursor } = useLibrary(userId, {
    q: q.trim() || undefined,
    scope: scope === "ALL" ? undefined : scope,
    game,
    activeOnly,
    limit,
  });

  // ✅ auto refresh when changed elsewhere
  React.useEffect(() => {
    const handler = () => mutate();
    window.addEventListener("game-library-updated", handler as any);
    return () => window.removeEventListener("game-library-updated", handler as any);
  }, [mutate]);

  // ✅ Client-side filter fallback (wichtig für multi-scope)
  const itemsRaw = accItems ?? [];
  const items = React.useMemo(() => {
    let out = itemsRaw;

    if (scope !== "ALL") {
      out = out.filter((it) => {
        const scs = normalizeScopes(it);
        return scs.includes(scope);
      });
    }

    if (game !== "ALL") {
      out = out.filter((it) => it.game === game);
    }

    if (activeOnly) {
      out = out.filter((it) => it.active !== false);
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((it) => {
        const hay = `${it.label ?? ""} ${(it.tags ?? []).join(" ")}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    return out;
  }, [itemsRaw, scope, game, activeOnly, q]);

  const nextCursor = accNextCursor ?? null;

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="gap-2 w-full max-w-full min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
          <div className="min-w-0">
            <CardTitle className="truncate">Game-Katalog (A/B/C)</CardTitle>
            <CardDescription className="truncate">
              Checklisten-Punkte pflegen – für Trade/Setup/Reflection (auch mehrfach möglich).
            </CardDescription>
          </div>

          <ItemDialog
            userId={userId}
            defaultScope={scope === "ALL" ? "trade" : scope}
            onDone={() => mutate()}
            trigger={<Button className="whitespace-nowrap">Neu</Button>}
          />
        </div>

        {/* Filterzeile */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full max-w-full min-w-0">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Suchen (Label, Tags)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full min-w-0"
            />
          </div>

          <Select value={scope} onValueChange={(v) => setScope(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle</SelectItem>
              <SelectItem value="trade">Trade</SelectItem>
              <SelectItem value="setup">Setup</SelectItem>
              <SelectItem value="reflection">Reflection</SelectItem>
            </SelectContent>
          </Select>

          <Select value={game} onValueChange={(v) => setGame(v as any)}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md border shrink-0">
            <Checkbox id="activeOnly" checked={activeOnly} onCheckedChange={(v) => setActiveOnly(v === true)} />
            <Label htmlFor="activeOnly" className="text-sm">
              nur aktive
            </Label>
          </div>

          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-full sm:w-[110px]">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / Seite
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 w-full max-w-full min-w-0 overflow-x-hidden">
        {error && <div className="text-red-600">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70">Lade…</div>}

        {!isLoading && items.length === 0 && <div className="opacity-70">Keine Einträge gefunden.</div>}

        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-3 w-full max-w-full min-w-0">
            {items.map((it) => (
              <ItemRow key={it._id} item={it} userId={userId} onChanged={() => mutate()} />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between w-full max-w-full min-w-0">
        <div className="text-sm text-muted-foreground">{items.length} Einträge</div>

        {nextCursor ? (
          <Button variant="outline" onClick={loadMore}>
            Mehr laden
          </Button>
        ) : (
          <div className="text-sm opacity-70">Ende</div>
        )}
      </CardFooter>
    </Card>
  );
}
