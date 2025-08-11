"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AvoidDailyItem, AvoidItem } from "@/utils/interface";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AvatarProps } from "@radix-ui/react-avatar";

interface Props {
  userId: string;
  date: string;
}

export default function AvoidChecklist({ userId, date }: Props) {
  const [items, setItems] = useState<AvoidDailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/frequency/list?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const actives = (d.items || []).filter((x: AvoidItem) => x.active);
        setItems(actives.map((x: AvoidItem) => ({ id: x.id, label: x.label, didAvoid: false })));
      })
      .catch(() => toast.error("Konnte Avoid-Liste nicht laden"))
      .finally(() => setLoading(false));
  }, [userId]);

  function toggle(id: string, value: boolean) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, didAvoid: value } : item));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/avoid/submitDaily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date, items }),
      });
      toast.success("Avoid-Check gespeichert");
      setDirty(false);
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-4">
        <CardContent className="flex justify-center"><Spinner /></CardContent>
      </Card>
    );
  }

  if (!items.length) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>🚫 Dinge vermeiden (heute)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <span>{item.label}</span>
            <Switch checked={item.didAvoid} onCheckedChange={v => toggle(item.id, v)} />
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={save} disabled={!dirty || saving}>
          {saving ? "Speichern..." : "Speichern"}
        </Button>
      </CardFooter>
    </Card>
  );
}
