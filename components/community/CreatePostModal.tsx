import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from  "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "next-auth/react";

interface CreatePostModalProps {
  onPostCreated?: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ onPostCreated }) => {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"update" | "survey">("update");
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
          type,
          createdBy: session.user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Fehler beim Erstellen:", errorData);
      } else {
        const data = await response.json();
        console.log("Post erfolgreich erstellt:", data);
        onPostCreated?.();
      }
    } catch (error) {
      console.error("Netzwerkfehler:", error);
    } finally {
      setLoading(false);
      setOpen(false);
      setTitle("");
      setContent("");
      setType("update");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Neues Update / Umfrage erstellen</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Beitrag erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder="Inhalt"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <Select value={type} onValueChange={(value) => setType(value as "update" | "survey")}> 
            <SelectTrigger>
              <SelectValue placeholder="Typ auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="survey">Umfrage</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSubmit} disabled={!title || !content || loading}>
            {loading ? "Erstelle..." : "Erstellen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;