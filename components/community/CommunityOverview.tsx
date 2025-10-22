import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostList from "./PostList";
import CreatePostModal from "./CreatePostModal";
import CreateUserTopicModal from "./CreateUserTopicModal";
import { useSession } from "next-auth/react";
import { Post } from "@/utils/interfaces/shared";

const CommunityOverviews = () => {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/community/getPosts");
      const data = await res.json();
      const formatted = (data.posts || []).map((p: any) => ({
        id: p._id as string,
        title: p.title,
        content: p.content,
        type: p.type,
        createdAt: p.createdAt,
        category: p.category,
        createdBy: p.createdBy,
        options: p.options,
        likes: p.likes,
      }));
      setPosts(formatted);
    } catch (error) {
      console.error("Fehler beim Laden der Posts:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);


  const adminEmails = ["rahimzio11@gmail.com", "Rahimzio11@gmail.com"];
  const isAdmin = adminEmails.includes(session?.user?.email?.toLowerCase() || "");
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Community</h1>
      <Tabs defaultValue="updates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="updates">Updates & Umfragen</TabsTrigger>
          <TabsTrigger value="usertopics">User-Themen</TabsTrigger>
        </TabsList>

        <TabsContent value="updates">
          <div className="flex justify-end mb-4">
            {isAdmin && <CreatePostModal onPostCreated={fetchPosts} />}
          </div>
            <PostList posts={posts.filter(post => post.type === "update" || post.type === "survey")} />
          </TabsContent>

        <TabsContent value="usertopics">
          <div className="flex justify-end mb-4">
            <CreateUserTopicModal onPostCreated={fetchPosts} />
          </div>
            <PostList posts={posts.filter(post => post.type === "userTopic")} />
          </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunityOverviews;
