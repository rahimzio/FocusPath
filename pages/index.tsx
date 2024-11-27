'use client';
import { global } from "styled-jsx/css";
import TaskList from "@/components/structured/to-do";
import CreateTask from "@/components/structured/createTask";
import { useState } from "react";
import SheetComponent from "@/components/structured/popUpCreateTask";
import { Skeleton } from "@/components/ui/skeleton";
import TodayView from "@/components/structured/todayView";
export default function Home() {
  const [showTaskList, setShowTaskList] = useState(true);

  const toggleComponent = () => setShowTaskList((prev) => !prev);

  return (
    <div className="relative min-h-screen p-6">
      <button
        className="transition ease-in-out delay-150 bg-blue-500 text-white px-4 py-2 rounded-lg hover:-translate-y-1 hover:scale-110 hover:bg-red-500 duration-300"
        onClick={toggleComponent}
      >
        {showTaskList ? 'Switch to Create Task' : 'Switch to Task List'}
      </button>

      {showTaskList ? (
        <div>
          <h1 className="text-xl font-semibold my-4">Task List</h1>
          <TaskList />
        </div>
      ) : (
        <div>
          <h1 className="text-xl font-semibold my-4">Create Task</h1>
          <TodayView />
        </div>
      )}

      {/* Sheet Component */}
      <SheetComponent />
      <Skeleton className="w-[100px] h-[20px] rounded-full" />
    </div>
  );
}


