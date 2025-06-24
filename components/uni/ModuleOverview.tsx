import React, { useEffect, useState } from "react";
import { OnlineModule } from "@/utils/interface";
import { getSession } from "next-auth/react";
import ProgressBar from "./ProgressBar";

interface Props {
  onSelect: (module: OnlineModule) => void;
}

const ModuleOverview: React.FC<Props> = ({ onSelect }) => {
  const [modules, setModules] = useState<OnlineModule[]>([]);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const res = await fetch(`/api/modules/list?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      {modules.map((m) => (
        <div key={m._id} className="border p-4 rounded bg-white shadow">
          <h3 className="font-semibold mb-2">{m.title}</h3>
          <ProgressBar progress={m.totalUnits ? (m.completedUnits / m.totalUnits) * 100 : 0} />
          <button
            className="mt-2 text-blue-600 text-sm"
            onClick={() => onSelect(m)}
          >
            Öffnen
          </button>
        </div>
      ))}
    </div>
  );
};

export default ModuleOverview;