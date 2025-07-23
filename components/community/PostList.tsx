import PostCard from "./PostCard";

interface Post {
  id: string;
  title: string;
  content: string;
  type: "update" | "survey" | "userTopic";
  createdAt: string;
  category?: string;
  createdBy: string;
  options?: any[];
  likes?: string[];
}

interface PostListProps {
  posts: Post[];
  onPostsUpdated?: () => void;
}

const PostList: React.FC<PostListProps> = ({ posts, onPostsUpdated }) => {  if (posts.length === 0) {
    return <p className="text-gray-500">Keine Posts gefunden.</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
<PostCard key={post.id} post={post} onUpdated={onPostsUpdated} />      ))}
    </div>
  );
};

export default PostList;