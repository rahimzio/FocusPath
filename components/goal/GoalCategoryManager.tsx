import React, { useEffect, useState } from "react";
import { Goal } from "@/utils/interface";
import {
  format,
  isThisMonth,
  parseISO,
  getMonth,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from "date-fns";
import { isNextMonth } from "@/utils/goals/helper";
import GoalManager from "./GoalManager";
import GoalEditModal from "./GoalEditModal";

interface Category {
  _id: string;
  name: string;
}

function GoalCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const userId = session?.user?.id;
    if (!userId) return;

    const catRes = await fetch(`/api/categories/getCategories?userId=${userId}`);
    const catData = await catRes.json();
    setCategories(catData.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const userId = session?.user?.id;
    if (!userId) return;

    const result = await fetch("/api/categories/createCategory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory.trim(), userId }),
    });

    if (result.ok) {
      setNewCategory("");
      fetchCategories();
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">🎯 Ziel-Kategorien verwalten</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Neue Kategorie..."
          className="border px-2 py-1 rounded w-full"
        />
        <button
          onClick={handleAddCategory}
          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
        >
          ➕ Hinzufügen
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500 italic">Lade Kategorien...</p>
      ) : (
        <ul className="list-disc list-inside text-gray-700">
          {categories.map((cat) => (
            <li key={cat._id}>{cat.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GoalCategoryManager;
