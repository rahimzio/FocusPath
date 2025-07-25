import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
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
  });

   const [userId, setUserId] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetch(`/api/user/categories?userId=${session.user.id}`)
          .then((res) => res.json())
          .then((data) => setCategories(data.categories || []));
      }
    });
  }, []);

  const saveCategories = async (updated: string[]) => {
    if (!userId) return;
    await fetch(`/api/user/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, categories: updated }),
    });
  };

  const handleAddCategory = () => {
    const cat = newCategory.trim();
    if (!cat) return;
    const updated = [...categories, cat];
    setCategories(updated);
    setNewCategory("");
    saveCategories(updated);
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    saveCategories(updated);
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-6">⚙️ Einstellungen</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
          <TabsTrigger value="progress">Fortschritt</TabsTrigger>
          <TabsTrigger value="display">Darstellung</TabsTrigger>
          <TabsTrigger value="account">Konto</TabsTrigger>
        </TabsList>

        {/* Allgemein */}
        <TabsContent value="general">
          <div className="space-y-4">
            <Select onValueChange={(val) => handleChange("startPage", val)} defaultValue={settings.startPage}>
              <SelectTrigger><SelectValue placeholder="Startseite" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">ToDos</SelectItem>
                <SelectItem value="goals">Ziele</SelectItem>
                <SelectItem value="finance">Finanzen</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(val) => handleChange("language", val)} defaultValue={settings.language}>
              <SelectTrigger><SelectValue placeholder="Sprache" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(val) => handleChange("darkMode", val)} defaultValue={settings.darkMode}>
              <SelectTrigger><SelectValue placeholder="Dark Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="light">Hell</SelectItem>
                <SelectItem value="dark">Dunkel</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(val) => handleChange("weekStart", val)} defaultValue={settings.weekStart}>
              <SelectTrigger><SelectValue placeholder="Wochenstart" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Montag</SelectItem>
                <SelectItem value="sunday">Sonntag</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(val) => handleChange("timeFormat", val)} defaultValue={settings.timeFormat}>
              <SelectTrigger><SelectValue placeholder="Uhrzeitformat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24-Stunden</SelectItem>
                <SelectItem value="12h">12-Stunden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Aufgaben */}
        <TabsContent value="tasks">
          <div className="space-y-4">
            <Input
              type="time"
              step="60"
              value={settings.defaultDuration}
              onChange={(e) => handleChange("defaultDuration", e.target.value)}
            />

            <Input
              type="color"
              value={settings.defaultColor}
              onChange={(e) => handleChange("defaultColor", e.target.value)}
            />

            <div className="flex items-center justify-between">
              <span>Zielaufgaben separat anzeigen</span>
              <Switch checked={settings.showGoalTasksSeparately} onCheckedChange={(val) => handleChange("showGoalTasksSeparately", val)} />
            </div>

            <Select onValueChange={(val) => handleChange("dragSnap", val)} defaultValue={settings.dragSnap}>
              <SelectTrigger><SelectValue placeholder="Drag-Snapping" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 Minuten</SelectItem>
                <SelectItem value="30">30 Minuten</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <span>Erinnerungen erlauben</span>
              <Switch checked={settings.allowReminders} onCheckedChange={(val) => handleChange("allowReminders", val)} />
            </div>

                       <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Kategorien</h4>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Neue Kategorie"
                />
                <button type="button" onClick={handleAddCategory} className="px-3 py-1 bg-blue-600 text-white rounded">
                  Hinzufügen
                </button>
              </div>
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    <span>{cat}</span>
                    <button type="button" onClick={() => handleRemoveCategory(cat)} className="text-red-500 text-sm">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Fortschritt */}
        <TabsContent value="progress">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Tagesbewertung aktivieren</span>
              <Switch checked={settings.enableDayRating} onCheckedChange={(val) => handleChange("enableDayRating", val)} />
            </div>

            <Select onValueChange={(val) => handleChange("progressMode", val)} defaultValue={settings.progressMode}>
              <SelectTrigger><SelectValue placeholder="Fortschrittsberechnung" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="even">Gleichmäßig</SelectItem>
                <SelectItem value="weighted">Gewichtet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Darstellung */}
        <TabsContent value="display">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Kompaktmodus aktivieren</span>
              <Switch checked={settings.compactMode} onCheckedChange={(val) => handleChange("compactMode", val)} />
            </div>
          </div>
        </TabsContent>

        {/* Konto */}
        <TabsContent value="account">
          <div className="space-y-4">
            <Input placeholder="Name" />
            <Input placeholder="Profilbild URL" />

            <button className="w-full py-2 bg-blue-500 text-white rounded">Daten exportieren</button>
            <button className="w-full py-2 bg-yellow-500 text-white rounded">App zurücksetzen</button>
            <button className="w-full py-2 bg-red-600 text-white rounded">Konto löschen</button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
