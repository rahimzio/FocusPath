import { Badge } from "lucide-react";
interface Post {
  id: string;
  title: string;
  content: string;
  type: "update" | "survey" | "userTopic";
  createdAt: string;
  category?: string;
}

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
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

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white">
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
    </div>
  );
};

export default PostCard;