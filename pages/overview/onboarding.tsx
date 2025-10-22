"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "react-toastify";
import { AvoidItem, UserMe } from "@/utils/interfaces/frequency";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<AvoidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const uid = session.user.id;
    setUserId(uid);
    fetch(`/api/user/me?userId=${uid}`)
      .then(res => res.json())
      .then((data: UserMe) => {
        if (data.onboardingCompleted) {
          router.replace("/");
          return;
        }
        setItems(data.avoidItems || []);
      })
      .catch(() => toast.error("Konnte Benutzerdaten nicht laden"))
      .finally(() => setLoading(false));
  }, [session, status]);

  function toggle(id: string, active: boolean) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, active } : it)));
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);
    try {
      await fetch("/api/frequency/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, avoidItems: items, timezone }),
      });
      toast.success("Onboarding abgeschlossen");
      router.replace("/");
    } catch {
      toast.error("Fehler beim Abschließen");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-4">
        <Spinner />
      </div>
    );
  }

  if (!userId) {
    return <div className="p-4">Bitte einloggen…</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between">
              <span>{item.label}</span>
              <Switch checked={item.active} onCheckedChange={v => toggle(item.id, v)} />
            </div>
          ))}
          <p className="text-sm text-gray-500">Zeitzone: {timezone}</p>
        </CardContent>
      </Card>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button className="w-full" onClick={finish} disabled={saving}>
          {saving ? "Speichern..." : "Fertig"}
        </Button>
      </div>
    </div>
  );
}
