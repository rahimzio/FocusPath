import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onDeleteInstance: () => void;
  onDeleteSeries: () => void;
  userId:string;
};

export default function DeleteRecurringTaskDialog({
  open,
  onClose,
  onDeleteInstance,
  onDeleteSeries,
  userId
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wiederkehrende Aufgabe löschen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Diese Aufgabe ist wiederkehrend. Was möchtest du tun?</p>
          <div className="flex flex-col gap-2">
            <Button onClick={onDeleteInstance} className="bg-yellow-500 hover:bg-yellow-600 text-white">
              Nur diese Instanz löschen
            </Button>
            <Button onClick={onDeleteSeries} className="bg-red-600 hover:bg-red-700 text-white">
              Gesamte Serie löschen
            </Button>
            <Button onClick={onClose} variant="outline">
              Abbrechen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
