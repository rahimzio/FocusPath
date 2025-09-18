'use client';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

interface FrequencyReflectionProps {
  userId: string;
  date: string; // YYYY-MM-DD
  timeOfDay: 'morning' | 'evening';
  onSave?: () => void;
}

const MIN_LEN = 4;

const FrequencyReflection: React.FC<FrequencyReflectionProps> = ({
  userId,
  date,
  timeOfDay,
  onSave,
}) => {
  const [reflection, setReflection] = useState('');
  const [influence, setInfluence] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () =>
      !saving &&
      reflection.trim().length >= MIN_LEN &&
      influence.trim().length >= MIN_LEN,
    [saving, reflection, influence]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);

    const payload = {
      userId,
      date,
      timeOfDay,
      reflection: reflection.trim(),
      influence: influence.trim(),
      type: 'frequency_reflection',
    };

    try {
      const response = await fetch('/api/frequencyReflection/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const ct = response.headers.get('content-type') || '';
      const isJson = ct.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok || (isJson && data?.ok === false)) {
        const msg = (isJson ? data?.error : data) || `HTTP ${response.status}`;
        throw new Error(String(msg));
      }

      onSave?.();
      setReflection('');
      setInfluence('');

      try {
        toast.success('Reflexion gespeichert! 🙏');
      } catch {
        alert('Reflexion gespeichert! 🙏');
      }
    } catch (error) {
      console.error(error);
      try {
        toast.error('Speichern fehlgeschlagen');
      } catch {
        alert('Speichern fehlgeschlagen');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-2xl font-semibold mb-3">
        Tagesreflexion
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Wie fühlst du dich heute in einem Satz?
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="z. B. ruhig und fokussiert – habe meine DOs gut geschafft."
            aria-label="Heutiges Gefühl in einem Satz"
          />
          <div className="mt-1 text-[11px] text-gray-500">
            mindestens {MIN_LEN} Zeichen
          </div>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Was hat deine Frequenz heute am stärksten beeinflusst?
          </label>
          <textarea
            value={influence}
            onChange={(e) => setInfluence(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="z. B. Handy weggelegt + 2× Deep-Work-Blöcke → klarer Kopf"
            aria-label="Einflussfaktoren"
          />
          <div className="mt-1 text-[11px] text-gray-500">
            mindestens {MIN_LEN} Zeichen
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            {new Date(date).toLocaleDateString('de-DE')} ·{' '}
            {timeOfDay === 'morning' ? 'Morgens' : 'Abends'}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            disabled={!canSave}
          >
            {saving ? 'Speichern…' : 'Reflexion speichern'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default FrequencyReflection;
