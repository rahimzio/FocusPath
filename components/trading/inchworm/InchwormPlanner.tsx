"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type PlanHorizon = "1m" | "2m" | "3m";

type FocusPoint = {
  id: string;
  grade: "A" | "B" | "C";
  text: string;
  done?: boolean;
};

type InchwormPlan = {
  _id?: string;
  recordType: "inchwormPlan";
  userId: string;
  title: string;
  horizon: PlanHorizon;
  startDateISO: string;
  notes?: string;
  focus: FocusPoint[];
  createdAt: string;
  updatedAt: string;
};

const fetcher = (url: string) => fetch(url).then(r => (r.ok ? r.json() : { items: [] }));

export default function InchwormPlanner({ userId }: { userId: string }) {
  const [title, setTitle] = React.useState("Inchworm Plan");
  const [horizon, setHorizon] = React.useState<PlanHorizon>("1m");
  const [notes, setNotes] = React.useState("");
  const [focus, setFocus] = React.useState<FocusPoint[]>([]);
  const [pending, setPending] = React.useState(false);

  const { data, mutate } = useSWR<{ items?: InchwormPlan[] }>(
    userId ? `/api/trading/inchworm-plan?userId=${userId}&limit=1` : null,
    fetcher
  );

  // API → State (einmal pro Planwechsel)
  React.useEffect(() => {
    const plan = data?.items?.[0];
    if (plan) {
      setTitle(plan.title || "Inchworm Plan");
      setHorizon(plan.horizon || "1m");
      setNotes(plan.notes || "");
      setFocus(Array.isArray(plan.focus) ? plan.focus : []);
      return;
    }
    // Fallback aus localStorage, falls kein Plan vom Server
    try {
      const raw = localStorage.getItem(`inchworm-plan:${userId}`);
      if (raw) {
        const p: InchwormPlan = JSON.parse(raw);
        if (p?.userId === userId) {
          setTitle(p.title || "Inchworm Plan");
          setHorizon(p.horizon || "1m");
          setNotes(p.notes || "");
          setFocus(Array.isArray(p.focus) ? p.focus : []);
        }
      }
    } catch {}
  }, [userId, data?.items?.[0]?._id]);

  const addFocus = (grade: "A" | "B" | "C") => {
    setFocus(prev => [...prev, { id: crypto.randomUUID(), grade, text: "" }]);
  };

  const updateFocus = (id: string, patch: Partial<FocusPoint>) => {
    setFocus(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFocus = (id: string) => {
    setFocus(prev => prev.filter(f => f.id !== id));
  };

  const save = async () => {
    setPending(true);
    try {
      const now = new Date().toISOString();
      const payload: InchwormPlan = {
        recordType: "inchwormPlan",
        userId,
        title,
        horizon,
        startDateISO: new Date().toISOString().slice(0, 10),
        notes: notes?.trim() || undefined,
        focus,
        createdAt: now,
        updatedAt: now,
      };

      // localStorage (robust, bricht nie das UI)
      try {
        localStorage.setItem(`inchworm-plan:${userId}`, JSON.stringify(payload));
      } catch {}

      // Optionaler Server-Save
      try {
        const resp = await fetch("/api/trading/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (resp.ok) mutate();
      } catch {}
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <CardTitle className="truncate">Inchworm Planner</CardTitle>
        <CardDescription className="truncate">
          Plane 1–3 Monate fokussierte Verbesserungen (Tendler: „Inchworm“ – hinten straffen, vorne ausbauen).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden">
        <div className="grid gap-3 md:grid-cols-3 items-start w-full max-w-full min-w-0">
          <div className="md:col-span-2 min-w-0">
            <label className="text-sm">Titel</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z. B. Q4 Inchworm Fokus"
              className="w-full"
            />
          </div>

          <div className="min-w-0">
            <label className="text-sm">Zeitraum</label>
            <Tabs value={horizon} onValueChange={(v) => setHorizon(v as PlanHorizon)} className="w-full">
              <TabsList className="w-full overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="1m" className="flex-1 sm:flex-none min-w-[90px]">1 Monat</TabsTrigger>
                <TabsTrigger value="2m" className="flex-1 sm:flex-none min-w-[90px]">2 Monate</TabsTrigger>
                <TabsTrigger value="3m" className="flex-1 sm:flex-none min-w-[90px]">3 Monate</TabsTrigger>
              </TabsList>
              {/* Dummy content to satisfy Tabs API; Inhalt ist oben */}
              <TabsContent value="1m" />
              <TabsContent value="2m" />
              <TabsContent value="3m" />
            </Tabs>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0">
          <label className="text-sm">Notizen</label>
          <Textarea
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Was genau wird verbessert, wie misst du Fortschritt?"
            className="w-full"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-medium">Fokus-Punkte</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => addFocus("A")} className="whitespace-nowrap">+ A-Fokus</Button>
            <Button variant="secondary" onClick={() => addFocus("B")} className="whitespace-nowrap">+ B-Fokus</Button>
            <Button variant="secondary" onClick={() => addFocus("C")} className="whitespace-nowrap">+ C-Fokus</Button>
          </div>
        </div>

        <div className="grid gap-3 w-full max-w-full min-w-0">
          {focus.length === 0 && (
            <div className="text-sm text-muted-foreground">Noch keine Fokus-Punkte. Lege 1–3 pro Kategorie an.</div>
          )}

          {focus.map((f) => (
            <div key={f.id} className="rounded-md border p-3 w-full max-w-full min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={f.grade === "A" ? "default" : f.grade === "B" ? "secondary" : "outline"}>
                  {f.grade}-Game
                </Badge>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={!!f.done} onCheckedChange={(v) => updateFocus(f.id, { done: v === true })} />
                    <span className="text-xs">Done</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFocus(f.id)} className="whitespace-nowrap">
                    Entfernen
                  </Button>
                </div>
              </div>

              <Input
                className="mt-3 w-full"
                placeholder="Konkreter Fokus (z. B. ‚Kein SL verschieben‘ / ‚Entry erst nach M1-Confirmation‘)"
                value={f.text}
                onChange={(e) => updateFocus(f.id, { text: e.target.value })}
              />
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 flex-wrap w-full max-w-full min-w-0">
        <Button onClick={save} disabled={pending} className="whitespace-nowrap">
          {pending ? "Speichere…" : "Plan speichern"}
        </Button>
      </CardFooter>
    </Card>
  );
}
