import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";

interface Comment {
  _id: string;
  userId: string;
  userEmail: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  upvotes: string[];
  downvotes: string[];
}

interface CommentSectionProps {
  postId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch("/api/community/getPosts");
      const data = await res.json();
      const post = data.posts.find((p: any) => p._id === postId);
      if (post?.comments) {
        setComments(post.comments);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Kommentare:", err);
    }
  };

  const handleAddComment = async () => {
    if (!session?.user?.email || !newComment.trim()) return;
    const response = await fetch("/api/community/addComment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        userId: session.user.email, // Als ID-Ersatz
        userEmail: session.user.email,
        comment: newComment.trim(),
      }),
    });
    if (response.ok) {
      fetchComments();
      setNewComment("");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const response = await fetch("/api/community/deleteComment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, commentId, userId: session?.user?.email }),
    });
    if (response.ok) fetchComments();
  };

  const handleEditComment = (id: string) => {
    setEditingCommentId(id);
    const toEdit = comments.find((c) => c._id === id);
    setEditingContent(toEdit?.comment || "");
  };

  const handleSaveEdit = async (commentId: string) => {
    const response = await fetch("/api/community/editComment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, commentId, userId: session?.user?.email, newContent: editingContent }),
    });
    if (response.ok) {
      setEditingCommentId(null);
      setEditingContent("");
      fetchComments();
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-semibold">Kommentare</h3>
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Schreibe einen Kommentar (max. 300 Zeichen)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value.slice(0, 300))}
        />
        <div className="text-right text-xs text-gray-500">{newComment.length}/300 Zeichen</div>
        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
          Kommentar hinzufügen
        </Button>
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment._id} className="p-3 border rounded-md bg-gray-50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{comment.userEmail}</span>
              <span className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            {editingCommentId === comment._id ? (
              <div className="space-y-2">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value.slice(0, 300))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(comment._id)}>
                    Speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-line">{comment.comment}</p>
            )}

            {comment.userId === session?.user?.email && (
              <div className="flex gap-2 mt-2">
                <Button size="sm"  onClick={() => handleEditComment(comment._id)}>
                  Bearbeiten
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(comment._id)}>
                  Löschen
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSection;