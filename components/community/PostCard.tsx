import { Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommentSection from "./CommentSection";
import { useSession } from "next-auth/react";
interface Post {
  id: string;
  title: string;
  content: string;
  type: "update" | "survey" | "userTopic";
  createdAt: string;
  category?: string;
  createdBy: string;
  options?: { id: string; text: string; votes: string[] }[];
  likes?: string[]
}

interface PostCardProps {
  post: Post;
  onUpdated?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdated }) => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const isOwner = userEmail === post.createdBy;
  const adminEmails = ["rahimzio11@gmail.com"];
  const isAdmin = adminEmails.includes(userEmail?.toLowerCase() || "");
  const getBadgeColor = () => {
    switch (post.type) {
      case "update":
        return "bg-blue-500";
      case "survey":
        return "bg-green-500";
      case "userTopic":
        return "bg-purple-500";
      default:
        return "bg-gray-400";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Möchtest du diesen Beitrag wirklich löschen?")) return;
    await fetch("/api/community/deletePost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, userEmail }),
    });
    onUpdated?.();
  };

  const handleLike = async () => {
    await fetch("/api/community/toggleLike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, userEmail }),
    });
    onUpdated?.();
  };

  const handleVote = async (optionId: string) => {
    await fetch("/api/community/voteSurvey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, optionId, userEmail }),
    });
    onUpdated?.();
  };

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white space-y-2">
      <div className="flex justify-between items-center mb-2">
        <Badge className={getBadgeColor()}>
          {post.type === "update" && "Update"}
          {post.type === "survey" && "Umfrage"}
          {post.type === "userTopic" && (post.category || "User-Thema")}
        </Badge>
        <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
      <h2 className="text-lg font-semibold mb-1">{post.title}</h2>
      <p className="text-gray-700 text-sm whitespace-pre-line">{post.content}</p>

      <CommentSection postId={post.id} />
      {post.type === "survey" && (
        <div className="space-y-1">
          {post.options?.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleVote(opt.id)}>
                {opt.text} ({opt.votes.length})
              </Button>
            </div>
          ))}
        </div>
      )}

      {post.type === "userTopic" && (
        <div className="space-y-2">
          <Button size="sm" variant="ghost" onClick={handleLike}>
            Gefällt mir ({post.likes?.length || 0})
          </Button>
          
        </div>
      )}

      {(isOwner || isAdmin) && (
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          Löschen
        </Button>
      )}
    </div>
  );
};

export default PostCard;