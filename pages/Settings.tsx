import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SettingsState {
  name: string | number | readonly string[] | undefined;
  trustReserveTank: string | number | readonly string[] | undefined;
  difficultyLevel: string | undefined;
  startPage: "todos" | "goals" | "finance";
  language: "de" | "en";
  darkMode: "auto" | "light" | "dark";
  weekStart: "monday" | "sunday";
  timeFormat: "24h" | "12h";
  defaultDuration: string;
  defaultColor: string;
  showGoalTasksSeparately: boolean;
  dragSnap: "15" | "30";
  allowReminders: boolean;
  enableDayRating: boolean;
  progressMode: "even" | "weighted";
  compactMode: boolean;
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
  difficultyLevel: undefined
};
export default function SettingsPage() {
   const [settings, setSettings] = useState<SettingsState>(defaultSettings);


  const [userId, setUserId] = useState<string>("");
  const [otherUsers, setOtherUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState("");

  useEffect(() => {
        const stored = localStorage.getItem("settings");
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
            if (data.settings) {
              setSettings((prev) => ({ ...prev, ...data.settings }));
            }
          });
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
    } else {
      localStorage.setItem("settings", JSON.stringify(updated));
    }
  };
  const addUser = () => {
    const id = newUser.trim();
    if (id) {
      setOtherUsers((prev) => [...prev, id]);
      setNewUser("");
    }
  };

  const removeUser = (id: string) => {
    setOtherUsers((prev) => prev.filter((u) => u !== id));
  };

  const handleChange = (key: keyof SettingsState, value: any) => {
    const updated = { ...settings, [key]: value } as SettingsState;
    setSettings(updated);
    saveSettings(updated);
    if (key === "language" && (window as any)?.i18n?.changeLanguage) {
      (window as any).i18n.changeLanguage(value);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 dark:bg-[#1c1c1e] text-gray-900 dark:text-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">⚙️ Einstellungen</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 bg-white dark:bg-[#2c2c2e] rounded shadow">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
          <TabsTrigger value="progress">Fortschritt</TabsTrigger>
          <TabsTrigger value="account">Konto</TabsTrigger>
        </TabsList>

        {/* Allgemein */}
        <TabsContent value="general">
          <div className="space-y-4">
            <div>
              {(["startPage", "language", "darkMode", "weekStart", "timeFormat"] as (keyof SettingsState)[]).map((key) => (
                <Select
                  key={key}
                  onValueChange={(val) => handleChange(key, val)}
                  defaultValue={String(settings[key as keyof typeof settings])}
                />
              ))}
            </div>
            <Select
              onValueChange={(val) => handleChange("language", val)}
              defaultValue={settings.language}
            >
              <SelectTrigger className="bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                <SelectValue placeholder="Sprache" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(val) => handleChange("darkMode", val)}
              defaultValue={settings.darkMode}
            >
              <SelectTrigger className="bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                <SelectValue placeholder="Dark Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="light">Hell</SelectItem>
                <SelectItem value="dark">Dunkel</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(val) => handleChange("weekStart", val)}
              defaultValue={settings.weekStart}
            >
              <SelectTrigger className="bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                <SelectValue placeholder="Wochenstart" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Montag</SelectItem>
                <SelectItem value="sunday">Sonntag</SelectItem>
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
              <span>Erinnerungen erlauben</span>
              <Switch
                checked={settings.allowReminders}
                onCheckedChange={(val) => handleChange("allowReminders", val)}
              />
            </div>

            <Select
              onValueChange={(val) => handleChange("difficultyLevel", val)}
              defaultValue={settings.difficultyLevel}
            >
              <SelectTrigger className="bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                <SelectValue placeholder="Schwierigkeitsgrad Tagesbewertung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Leicht</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="hard">Schwer</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              min={0}
              max={10}
              value={settings.trustReserveTank}
              onChange={(e) => handleChange("trustReserveTank", Number(e.target.value))}
            />
          </div>
        </TabsContent>

        {/* Fortschritt */}
        <TabsContent value="progress">
          <div className="space-y-4">
            <Select
              onValueChange={(val) => handleChange("progressMode", val)}
              defaultValue={settings.progressMode}
            >
              <SelectTrigger className="bg-white dark:bg-[#2c2c2e] text-black dark:text-white">
                <SelectValue placeholder="Fortschrittsberechnung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="even">Gleichmäßig</SelectItem>
                <SelectItem value="weighted">Gewichtet</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <span>Kompaktmodus</span>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(val) => handleChange("compactMode", val)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Konto */}
        <TabsContent value="account">
          <div className="space-y-4">
            <Input
              placeholder="Name"
              value={settings.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />

            <Input
              placeholder="User ID"
              value={userId}
              readOnly
            />

            <div className="flex gap-2">
              <Input
                placeholder="Andere User ID"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
              />
              <button
                onClick={addUser}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Hinzufügen
              </button>
            </div>

            {otherUsers.length > 0 && (
              <ul className="space-y-1">
                {otherUsers.map((u) => (
                  <li key={u} className="flex justify-between items-center">
                    <span>{u}</span>
                    <button
                      onClick={() => removeUser(u)}
                      className="text-red-500"
                    >
                      Entfernen
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Daten exportieren
            </button>
            <button className="w-full py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              App zurücksetzen
            </button>
            <button className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Konto löschen
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
