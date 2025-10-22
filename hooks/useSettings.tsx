"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSession } from "next-auth/react";
import { UserSettings } from "@/utils/interfaces/shared";

export const defaultUserSettings: UserSettings = {
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
};

interface SettingsContextValue {
  settings: UserSettings;
  userId: string | null;
  updateSetting: (key: keyof UserSettings, value: any) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultUserSettings,
  userId: null,
  updateSetting: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("settings");
    if (stored) {
      try {
        setSettings({ ...defaultUserSettings, ...JSON.parse(stored) });
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

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const applySettings = (s: UserSettings) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (s.darkMode === "dark") {
      root.classList.add("dark");
    } else if (s.darkMode === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
    }
    if ((window as any).i18n?.language !== s.language) {
      (window as any).i18n?.changeLanguage?.(s.language);
    }
  };

  const persistSettings = (s: UserSettings) => {
    if (userId) {
      fetch(`/api/user/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, settings: s }),
      });
    } else {
      localStorage.setItem("settings", JSON.stringify(s));
    }
  };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const updated = { ...settings, [key]: value } as UserSettings;
    setSettings(updated);
    persistSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, userId, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}