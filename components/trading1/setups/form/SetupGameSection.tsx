/** SECTION 5 – Setup Game (A/B/C) */
export const SetupGameSection: React.FC<{
  userId: string;
}> = ({ userId }) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [gameGrade, setGameGrade] = React.useState<"S" | "A" | "B" | "C">("C");
  const [avgPoints, setAvgPoints] = React.useState<number>(0);

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Setup-Game Bewertung</h3>
        <Badge variant="outline">
          Game: {gameGrade} · Ø {avgPoints.toFixed(2)}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Wähle die Setup-Faktoren aus, die heute erfüllt waren.
        Daraus wird automatisch dein Setup-Game (A/B/C/S) berechnet.
      </p>

      <GamePicker
        userId={userId}
        scope="setup"
        value={selectedIds}
        onChange={({ selectedIds, grade, avgPoints }) => {
          setSelectedIds(selectedIds);
          setGameGrade(grade);
          setAvgPoints(avgPoints);
        }}
      />
    </div>
  );
};
