import React, { useState } from "react";
import ModuleOverview from "./ModuleOverview";
import ModuleDetail from "./ModuleDetail";
import AddModuleForm from "./AddModuleForm";
import { OnlineModule } from "@/utils/interface";

const ModuleManager: React.FC = () => {
  const [selected, setSelected] = useState<OnlineModule | null>(null);
  const [triggerReload, setTriggerReload] = useState(false);

  const handleCreated = () => setTriggerReload(!triggerReload);

  return (
    <div className="space-y-6">
      {selected ? (
        <ModuleDetail
          module={selected}
          onBack={() => setSelected(null)}
          onUpdated={setSelected}
        />
      ) : (
        <>
         <AddModuleForm
           onCreated={handleCreated}
           module={null}
           onBack={() => setSelected(null)}
         />
          <ModuleOverview key={String(triggerReload)} onSelect={setSelected} />
        </>
      )}
    </div>
  );
};

export default ModuleManager;