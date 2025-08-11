"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { ReflectionBlock } from "@/utils/interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  date: string;
}

type BlockState = { title: string; content: string };

export default function ReflectionBlocks({ userId, date }: Props) {
  const initial: Record<ReflectionBlock, BlockState> = {
    morning: { title: "", content: "" },
    afternoon: { title: "", content: "" },
    evening: { title: "", content: "" },
  };
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState<{ [K in ReflectionBlock]?: boolean }>({});

  function handleChange(block: ReflectionBlock, field: keyof BlockState, value: string) {
    setState(prev => ({ ...prev, [block]: { ...prev[block], [field]: value } }));
  }

  async function saveBlock(block: ReflectionBlock) {
    const payload = { userId, date, block, content: state[block].content, title: state[block].title || "" };
    setSaving(prev => ({ ...prev, [block]: true }));
    try {
      await fetch("/api/frequency/upsertReflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Notiz gespeichert");
    } catch {
      toast.error("Konnte Notiz nicht speichern");
    } finally {
      setSaving(prev => ({ ...prev, [block]: false }));
    }
  }

  const blocks: ReflectionBlock[] = ["morning", "afternoon", "evening"];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>💭 Reflexion</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="morning">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="morning">Morgen</TabsTrigger>
            <TabsTrigger value="afternoon">Nachmittag</TabsTrigger>
            <TabsTrigger value="evening">Abend</TabsTrigger>
          </TabsList>
          {blocks.map(block => (
            <TabsContent key={block} value={block} className="mt-4">
              <div className="space-y-3">
                <Input
                  placeholder="Titel (optional)"
                  value={state[block].title}
                  onChange={e => handleChange(block, "title", e.target.value)}
                />
                <Textarea
                  rows={4}
                  placeholder="Deine Reflexion"
                  value={state[block].content}
                  onChange={e => handleChange(block, "content", e.target.value)}
                />
                <Button
                  onClick={() => saveBlock(block)}
                  disabled={saving[block]}
                  className="self-end"
                >
                  {saving[block] ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
