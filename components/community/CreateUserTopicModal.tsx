import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from  "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "next-auth/react";

interface CreateUserTopicModalProps {
  onPostCreated?: () => void;
}

const CreateUserTopicModal: React.FC<CreateUserTopicModalProps> = ({ onPostCreated }) => {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"Bug Report" | "Feature Wunsch" | "Allgemein">("Allgemein");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    try {
      const response = await fetch("/api/community/createPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          type: "userTopic",
          createdBy: session.user.email,
          category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Fehler beim Erstellen:", errorData);
      } else {
        const data = await response.json();
        console.log("User-Thema erfolgreich erstellt:", data);
        onPostCreated?.();
      }
    } catch (error) {
      console.error("Netzwerkfehler:", error);
    } finally {
      setLoading(false);
      setOpen(false);
      setTitle("");
      setContent("");
      setCategory("Allgemein");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Neues User-Thema erstellen</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Thema erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
          />

          <Textarea
            placeholder="Inhalt (max. 300 Zeichen)"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 300))}
          />
          <div className="text-right text-xs text-gray-500">{content.length}/300 Zeichen</div>

          <Select value={category} onValueChange={(value) => setCategory(value as "Bug Report" | "Feature Wunsch" | "Allgemein")}> 
            <SelectTrigger>
              <SelectValue placeholder="Kategorie auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bug Report">Bug Report</SelectItem>
              <SelectItem value="Feature Wunsch">Feature Wunsch</SelectItem>
              <SelectItem value="Allgemein">Allgemein</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSubmit} disabled={!title || !content || loading}>
            {loading ? "Erstelle..." : "Thema erstellen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserTopicModal;