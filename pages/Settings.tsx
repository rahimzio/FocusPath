// Settings.tsx
import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

type StartPage = "todos" | "goals" | "finance";
type Language = "de" | "en";
type DarkMode = "auto" | "light" | "dark";
type WeekStart = "monday" | "sunday";
type TimeFormat = "24h" | "12h";
type DragSnap = "15" | "30";
type ProgressMode = "even" | "weighted";

interface SettingsState {
  name: string | number | readonly string[] | undefined;
  trustReserveTank: string | number | readonly string[] | undefined;
  difficultyLevel: string | undefined;
  startPage: StartPage;
  language: Language;
  darkMode: DarkMode;
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  defaultDuration: string;
  defaultColor: string;
  showGoalTasksSeparately: boolean;
  dragSnap: DragSnap;
  allowReminders: boolean;
  enableDayRating: boolean;
  progressMode: ProgressMode;
  compactMode: boolean;
  defaultCategory?: string;
}

const defaultSettings: SettingsState = {
  startPage: "todos",
  language: "de",
  darkMode: "auto",
  weekStart: "monday",
  timeFormat: "24h",
  defaultDuration: "00:30",
  defaultColor: "#3B82F6",
  showGoalTasksSeparately: true,
  dragSnap: "15",
  allowReminders: true,
  enableDayRating: true,
  progressMode: "even",
  compactMode: false,
  name: undefined,
  trustReserveTank: undefined,
  difficultyLevel: undefined,
  defaultCategory: undefined,
};

const NONE_VALUE = "__none__";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [userId, setUserId] = useState<string>("");
  const [otherUsers, setOtherUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("settings") : null;
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch {}
    }

    getSession().then((session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);

        fetch(`/api/user/settings?userId=${session.user.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.settings) {
              setSettings((prev) => {
                const merged = { ...prev, ...data.settings } as SettingsState;
                if (merged.defaultCategory === "") merged.defaultCategory = undefined;
                return merged;
              });
            }
          });

        fetch(`/api/user/categories?userId=${session.user.id}`)
          .then((res) => res.json())
          .then((data) => setCategories(data?.categories || []));
      }
    });
  }, []);

  const saveSettings = async (updated: SettingsState) => {
    if (userId) {
      await fetch(`/api/user/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, settings: updated }),
      });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("settings", JSON.stringify(updated));
    }
  };

  const addUser = () => {
    const id = newUser.trim();
    if (!id) return;
    setOtherUsers((prev) => [...prev, id]);
    setNewUser("");
  };

  const removeUser = (id: string) => {
    setOtherUsers((prev) => prev.filter((u) => u !== id));
  };

  const handleChange = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    const updated = { ...settings, [key]: value } as SettingsState;
    setSettings(updated);
    saveSettings(updated);

    if (key === "language" && typeof value === "string") {
      const w = window as unknown as { i18n?: { changeLanguage: (lang: string) => void } };
      w.i18n?.changeLanguage(value);
    }
  };

  // ---------- Kategorien ----------
  const handleAddCategory = async () => {
    const raw = newCategory.trim();
    if (!raw) return;
    const name = raw.slice(0, 48);
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setNewCategory("");
      return;
    }
    if (categories.length >= 20) {
      toast.error("Maximal 20 Kategorien erlaubt");
      return;
    }
    try {
      const res = await fetch(`/api/user/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, categoryName: name }),
      });
      if (res.ok) {
        setCategories((prev) => [...prev, name]);
        toast.success("Kategorie hinzugefügt");
      } else {
        const data = await res.json();
        toast.error(data?.message || "Fehler beim Hinzufügen");
      }
    } catch {
      toast.error("Fehler beim Hinzufügen");
    } finally {
      setNewCategory("");
    }
  };

  const handleRemoveCategory = async (name: string) => {
    try {
      const res = await fetch(`/api/user/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, categoryName: name }),
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c !== name));
        if (settings.defaultCategory === name) handleChange("defaultCategory", undefined);
        toast.success("Kategorie gelöscht");
      } else {
        const data = await res.json();
        toast.error(data?.message || "Fehler beim Löschen");
      }
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleStartEdit = (name: string) => {
    setEditingCat(name);
    setEditValue(name);
  };

  const handleRenameCategory = async (name: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setEditingCat(null);
      setEditValue("");
      return;
    }
    try {
      const res = await fetch(`/api/user/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, oldName: name, newName: trimmed }),
      });
      if (res.ok) {
        setCategories((prev) => prev.map((c) => (c === name ? trimmed : c)));
        if (settings.defaultCategory === name) handleChange("defaultCategory", trimmed);
        toast.success("Kategorie umbenannt");
      } else {
        const data = await res.json();
        toast.error(data?.message || "Fehler beim Umbenennen");
      }
    } catch {
      toast.error("Fehler beim Umbenennen");
    } finally {
      setEditingCat(null);
      setEditValue("");
    }
  };

  // ---------- UI ----------
  return (
    <div className="w-full max-w-full text-gray-900 dark:text-white">
      <div className="bg-transparent sm:bg-gray-50 sm:dark:bg-[#1c1c1e] sm:rounded-xl sm:shadow-md">
        <header className="px-3 sm:px-6 py-2 sm:sticky sm:top-0 z-20 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-black/5 dark:border-white/10 sm:rounded-t-xl">
          <h1 className="text-lg sm:text-2xl font-bold">⚙️ Einstellungen</h1>
        </header>

        <div className="px-3 sm:px-6 py-4">
          <Tabs defaultValue="general" className="w-full">
            {/* FIX: keine CSS-Variable mehr, feste min-width */}
            <TabsList className="mb-3 sm:mb-4 bg-white dark:bg-[#2c2c2e] rounded shadow flex flex-nowrap overflow-x-auto gap-1 p-1 sm:p-2 -mx-3 sm:mx-0 px-3 sm:px-2 [&>button]:min-w-[120px]">
              <TabsTrigger value="general">Allgemein</TabsTrigger>
              <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
              <TabsTrigger value="progress">Fortschritt</TabsTrigger>
              <TabsTrigger value="categories">Kategorien</TabsTrigger>
              <TabsTrigger value="account">Konto</TabsTrigger>
            </TabsList>

            {/* Allgemein */}
            <TabsContent value="general">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Sprache</label>
                  <Select value={settings.language} onValueChange={(v) => handleChange("language", v as Language)}>
                    <SelectTrigger className="h-11 text-base w-full bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                      <SelectValue placeholder="Sprache" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Darstellung</label>
                  <Select value={settings.darkMode} onValueChange={(v) => handleChange("darkMode", v as DarkMode)}>
                    <SelectTrigger className="h-11 text-base w-full bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                      <SelectValue placeholder="Dark Mode" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="light">Hell</SelectItem>
                      <SelectItem value="dark">Dunkel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Wochenstart</label>
                  <Select value={settings.weekStart} onValueChange={(v) => handleChange("weekStart", v as WeekStart)}>
                    <SelectTrigger className="h-11 text-base w-full bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                      <SelectValue placeholder="Wochenstart" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="monday">Montag</SelectItem>
                      <SelectItem value="sunday">Sonntag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Zeitformat</label>
                  <Select value={settings.timeFormat} onValueChange={(v) => handleChange("timeFormat", v as TimeFormat)}>
                    <SelectTrigger className="h-11 text-base w-full bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                      <SelectValue placeholder="Zeitformat" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="24h">24 Stunden</SelectItem>
                      <SelectItem value="12h">12 Stunden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Aufgaben */}
            <TabsContent value="tasks">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Standarddauer</label>
                  <Input className="h-11 text-base w-full" type="time" step="60" value={settings.defaultDuration} onChange={(e) => handleChange("defaultDuration", e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Standardfarbe</label>
                  <Input className="h-11 text-base w-full" type="color" value={settings.defaultColor} onChange={(e) => handleChange("defaultColor", e.target.value)} />
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[#2c2c2e]">
                  <span className="text-sm">Erinnerungen erlauben</span>
                  <Switch checked={settings.allowReminders} onCheckedChange={(val) => handleChange("allowReminders", val)} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Schwierigkeitsgrad Tagesbewertung</label>
                  <Select value={settings.difficultyLevel} onValueChange={(v) => handleChange("difficultyLevel", v)}>
                    <SelectTrigger className="h-11 text-base w-full bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                      <SelectValue placeholder="Schwierigkeitsgrad" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="easy">Leicht</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="hard">Schwer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Trust Reserve Tank (0–10)</label>
                  <Input className="h-11 text-base w-full" type="number" min={0} max={10} value={settings.trustReserveTank ?? ""} onChange={(e) => handleChange("trustReserveTank", Number(e.target.value))} />
                </div>
              </div>
            </TabsContent>

            {/* Fortschritt */}
            <TabsContent value="progress">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm opacity-80">Fortschrittsberechnung</label>
                  <Select value={settings.progressMode} onValueChange={(v) => handleChange("progressMode", v as ProgressMode)}>
                    <SelectTrigger className="h-11 text-base w-full bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                      <SelectValue placeholder="Fortschrittsberechnung" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="even">Gleichmäßig</SelectItem>
                      <SelectItem value="weighted">Gewichtet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[#2c2c2e]">
                  <span className="text-sm">Kompaktmodus</span>
                  <Switch checked={settings.compactMode} onCheckedChange={(val) => handleChange("compactMode", val)} />
                </div>
              </div>
            </TabsContent>

            {/* Kategorien */}
            <TabsContent value="categories">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm opacity-80">Neue Kategorie</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      className="h-11 text-base w-full"
                      placeholder="z. B. Studium, Fitness, Deep Work…"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                    <Button className="h-11 text-base w-full sm:w-auto" onClick={handleAddCategory}>
                      Hinzufügen
                    </Button>
                  </div>
                  <p className="text-xs opacity-70">Duplikate werden automatisch verhindert.</p>
                </div>

                {categories.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm opacity-80">Deine Kategorien</label>
                    <ul className="space-y-2">
                      {categories.map((cat) => (
                        <li key={cat} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg px-3 py-2 bg-white dark:bg-[#2c2c2e] min-w-0">
                          {editingCat === cat ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                              <Input
                                className="h-11 text-base w-full"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleRenameCategory(cat);
                                  }
                                }}
                              />
                              <div className="flex gap-2 w-full sm:w-auto">
                                <Button className="h-11 text-base flex-1 sm:flex-none" onClick={() => handleRenameCategory(cat)}>
                                  Speichern
                                </Button>
                                <Button className="h-11 text-base flex-1 sm:flex-none" variant="secondary" onClick={() => setEditingCat(null)}>
                                  Abbrechen
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="truncate flex-1 min-w-0">{cat}</span>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto min-w-0">
                                <Select
                                  value={settings.defaultCategory ?? NONE_VALUE}
                                  onValueChange={(val) => handleChange("defaultCategory", val === NONE_VALUE ? undefined : (val as string))}
                                >
                                  <SelectTrigger className="h-11 text-base w-full sm:w-40 bg-white dark:bg-[#1f1f21] text-black dark:text-white">
                                    <SelectValue placeholder="Standardkategorie" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={6} className="max-h-[50vh] w-[var(--radix-select-trigger-width)]">
                                    <SelectItem value={NONE_VALUE}>Keine</SelectItem>
                                    {categories.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <div className="flex gap-2 w-full sm:w-auto">
                                  <Button className="h-11 text-base flex-1 sm:flex-none" variant="secondary" onClick={() => handleStartEdit(cat)}>
                                    Bearbeiten
                                  </Button>
                                  <Button className="h-11 text-base flex-1 sm:flex-none" variant="destructive" onClick={() => handleRemoveCategory(cat)}>
                                    Löschen
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm opacity-70">Noch keine Kategorien angelegt.</p>
                )}
              </div>
            </TabsContent>

            {/* Konto */}
            <TabsContent value="account">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Input className="h-11 text-base w-full" placeholder="Name" value={settings.name ?? ""} onChange={(e) => handleChange("name", e.target.value)} />
                  <Input className="h-11 text-base w-full" placeholder="User ID" value={userId} readOnly />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input className="h-11 text-base w-full" placeholder="Andere User ID" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
                  <Button className="h-11 text-base w-full sm:w-auto" onClick={addUser}>
                    Hinzufügen
                  </Button>
                </div>

                {otherUsers.length > 0 && (
                  <ul className="space-y-1">
                    {otherUsers.map((u) => (
                      <li key={u} className="flex items-center justify-between bg-white dark:bg-[#2c2c2e] rounded px-3 py-2">
                        <span className="truncate pr-3">{u}</span>
                        <Button className="h-11 text-base" variant="destructive" onClick={() => removeUser(u)}>
                          Entfernen
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <Button className="h-11 text-base w-full">Daten exportieren</Button>
                  <Button className="h-11 text-base w-full" variant="secondary">
                    App zurücksetzen
                  </Button>
                  <Button className="h-11 text-base w-full" variant="destructive">
                    Konto löschen
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
