'use client';

import * as React from 'react';

export function AddCustomMood({
  userId,
  onAdded,
}: {
  userId: string;
  onAdded?: (p: { label: string; preference: 'gern' | 'egal' | 'nicht' }) => void;
}) {
  const [label, setLabel] = React.useState('');
  const [preference, setPreference] =
    React.useState<'gern' | 'egal' | 'nicht'>('egal');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const trimmed = label.trim();
  const canSave = trimmed.length > 0 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = { userId, label: trimmed, preference };
      const r = await fetch('/api/frequency/setMoodPreference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!j?.ok) throw new Error(j?.error || 'Fehler beim Speichern');
      onAdded?.({ label: trimmed, preference });
      setLabel('');
      setPreference('egal');
      setMsg('Gespeichert!');
    } catch (e: any) {
      setMsg(e?.message || 'Unbekannter Fehler');
    } finally {
      setBusy(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };

  return (
    <section className="rounded-xl border p-4 space-y-3 bg-white">
      <h4 className="font-medium">Eigenen Base-Mood hinzufügen</h4>

      {/* mobil gestapelt */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="z. B. geerdet"
          className="w-full sm:flex-1 border rounded px-3 py-2"
          aria-label="Bezeichnung des Moods"
        />
        <select
          value={preference}
          onChange={(e) => setPreference(e.target.value as any)}
          className="w-full sm:w-auto border rounded px-3 py-2"
          aria-label="Präferenz wählen"
        >
          <option value="gern">gern</option>
          <option value="egal">egal</option>
          <option value="nicht">nicht gern</option>
        </select>
        <button
          disabled={!canSave}
          onClick={save}
          className="w-full sm:w-auto px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? 'Speichere…' : 'Speichern'}
        </button>
      </div>

      {msg && <div className="text-xs text-gray-600">{msg}</div>}
    </section>
  );
}
