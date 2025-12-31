"use client";

import * as React from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { TradeGroup } from "../interface";
import { cn } from "@/lib/utils";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch groups");
    return res.json();
  });

// --- Mutationen für Gruppen ---
// POST /api/trading/groups/create
async function createGroupApi(
  url: string,
  {
    arg,
  }: {
    arg: {
      userId: string;
      name: string;
      description?: string;
      color?: string;
    };
  }
): Promise<TradeGroup> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    throw new Error("Failed to create group");
  }

  const data = await res.json();
  return data.group as TradeGroup;
}

// PATCH /api/trading/groups/[id]
async function updateGroupApi(
  url: string,
  {
    arg,
  }: {
    arg: Partial<TradeGroup>;
  }
): Promise<TradeGroup> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    throw new Error("Failed to update group");
  }

  const data = await res.json();
  return data.group as TradeGroup;
}

interface TradeGroupManagerProps {
  userId: string;
  className?: string;
}

/**
 * TradeZella-Style Strategy / Group Manager
 * - Liste aller Gruppen (Strategien)
 * - Neue Gruppe anlegen
 * - Gruppe aktiv / inaktiv togglen
 */
export const TradeGroupManager: React.FC<TradeGroupManagerProps> = ({
  userId,
  className,
}) => {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/groups/list?userId=${userId}` : null,
    fetcher
  );

  const groups: TradeGroup[] = data?.groups ?? [];

  const { trigger: createGroup, isMutating: creating } = useSWRMutation(
    "/api/trading/groups/create",
    createGroupApi
  );

  const { trigger: patchGroup, isMutating: updating } = useSWRMutation(
    "/api/trading/groups/update",
    updateGroupApi
  );

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#5227ff");

  const isBusy = creating || updating;

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createGroup({
        userId,
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
      });
      setName("");
      setDescription("");
      await mutate();
    } catch (err) {
      console.error("Error creating group", err);
    }
  }

  async function toggleActive(group: TradeGroup) {
    if (!group._id) return;
    try {
      await patchGroup(`/api/trading/groups/${group._id}`, {
        isActive: !group.isActive,
      });
      await mutate();
    } catch (err) {
      console.error("Error updating group", err);
    }
  }

  const activeGroups = groups.filter((g) => g.isActive !== false);
  const inactiveGroups = groups.filter((g) => g.isActive === false);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header + kleine Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">
              Strategien gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{groups.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {activeGroups.length} aktiv / {inactiveGroups.length} inaktiv
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">
              Neue Strategie / Gruppe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateGroup}
              className="flex flex-col gap-3 md:flex-row md:items-end"
            >
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. NAS100 London Breakout"
                  required
                />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">Beschreibung</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurzbeschreibung der Strategie (optional)"
                  rows={1}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Farbe</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-16 p-1"
                  />
                  <Select
                    onValueChange={(value) => setColor(value)}
                    defaultValue={color}
                  >
                    <SelectTrigger className="w-[120px] h-9 text-xs">
                      <SelectValue placeholder="Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#5227ff">Violett</SelectItem>
                      <SelectItem value="#22c55e">Grün</SelectItem>
                      <SelectItem value="#ef4444">Rot</SelectItem>
                      <SelectItem value="#3b82f6">Blau</SelectItem>
                      <SelectItem value="#eab308">Gelb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                className="md:self-stretch md:w-[120px]"
                disabled={isBusy}
              >
                Strategie anlegen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Gruppen-Liste */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground">
          Deine Strategien
        </h3>

        {isLoading && (
          <p className="text-xs text-muted-foreground">Lade Gruppen...</p>
        )}
        {error && (
          <p className="text-xs text-destructive">
            Fehler beim Laden der Gruppen.
          </p>
        )}

        {!isLoading && !error && groups.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Noch keine Strategien angelegt. Lege oben deine erste Gruppe an
            (z.B. &quot;NAS100 London Breakout&quot;).
          </p>
        )}

        {!isLoading && !error && groups.length > 0 && (
          <div className="space-y-2">
            {groups.map((group) => (
              <Card
                key={group._id ?? group.name}
                className={cn(
                  "flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between",
                  group.isActive === false && "opacity-70"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: group.color ?? "#5227ff",
                      }}
                    />
                    <p className="text-sm font-medium">{group.name}</p>
                    <Badge
                      variant={group.isActive === false ? "outline" : "secondary"}
                      className="text-[10px]"
                    >
                      {group.isActive === false ? "Inaktiv" : "Aktiv"}
                    </Badge>
                  </div>
                  {group.description && (
                    <p className="text-[11px] text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(group)}
                    disabled={updating}
                  >
                    {group.isActive === false
                      ? "Reaktivieren"
                      : "Deaktivieren"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeGroupManager;
