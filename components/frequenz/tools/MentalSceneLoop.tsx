import React, { useState } from "react";
import { MentalScene } from "@/utils/interface";
interface Props {
  onComplete?: () => void;
}

const emptyScene: MentalScene = {
  description: "",
  person: "",
  comment: "",
  associatedEmotion: "",
  createdAt: new Date(),
};

const MentalSceneLoop: React.FC<Props> = ({ onComplete }) => {
  const [scene, setScene] = useState<MentalScene>(emptyScene);
  const [repeat, setRepeat] = useState(3);

  const handlePlay = () => {
    // simple looped alert to simulate visualization
    for (let i = 0; i < repeat; i++) {
      setTimeout(() => {
        alert(`${scene.comment} (${i + 1}/${repeat})`);
        if (i === repeat - 1 && onComplete) onComplete();
      }, i * 600);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-2xl font-semibold">Mental Scene Loop</h2>
      <input
        type="text"
        className="w-full border p-2 rounded"
        placeholder="Beschreibung der Szene"
        value={scene.description}
        onChange={(e) => setScene({ ...scene, description: e.target.value })}
      />
      <input
        type="text"
        className="w-full border p-2 rounded"
        placeholder="Person"
        value={scene.person}
        onChange={(e) => setScene({ ...scene, person: e.target.value })}
      />
      <input
        type="text"
        className="w-full border p-2 rounded"
        placeholder="Kommentar"
        value={scene.comment}
        onChange={(e) => setScene({ ...scene, comment: e.target.value })}
      />
      <input
        type="text"
        className="w-full border p-2 rounded"
        placeholder="Gefühl"
        value={scene.associatedEmotion}
        onChange={(e) => setScene({ ...scene, associatedEmotion: e.target.value })}
      />
      <div className="flex items-center gap-2">
        <label>Wiederholungen:</label>
        <input
          type="number"
          min={1}
          value={repeat}
          onChange={(e) => setRepeat(parseInt(e.target.value))}
          className="w-16 border p-1 rounded"
        />
      </div>
      <button onClick={handlePlay} className="bg-green-600 text-white px-4 py-2 rounded">
        Start
      </button>
    </div>
  );
};

export default MentalSceneLoop;