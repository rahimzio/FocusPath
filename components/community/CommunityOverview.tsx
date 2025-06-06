import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostList from "./PostList";
import CreatePostModal from "./CreatePostModal";
import CreateUserTopicModal from "./CreateUserTopicModal";
import { Post } from "@/utils/interface";
import { useSession } from "next-auth/react";

const CommunityOverviews = () => {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/community/getPosts");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Fehler beim Laden der Posts:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const isAdmin = session?.user?.email === "Rahimzio@gmail.com";

  return (
    <div className="bg-white text-black p-4 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Community</h1>
      <Tabs defaultValue="updates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="updates">Updates & Umfragen</TabsTrigger>
          <TabsTrigger value="usertopics">User-Themen</TabsTrigger>
        </TabsList>

        <TabsContent value="updates">
          <div className={`mb-4 flex ${isAdmin ? "justify-end" : "justify-center"}`}>
            <CreateUserTopicModal onPostCreated={fetchPosts} />
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
