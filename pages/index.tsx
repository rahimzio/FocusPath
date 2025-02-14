"use client";
import DailyTaskList from "@/components/dailyTodos";
import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import SheetComponent from "@/components/todo/popUpCreateTask";
export default function Home() {
  const [showTaskList, setShowTaskList] = useState(true);

  const toggleComponent = () => setShowTaskList((prev) => !prev);

  return (
    <div>
      {     <button
        className="transition ease-in-out delay-150 bg-blue-500 hover:-translate-y-1 hover:scale-110 hover:bg-red-500 duration-300"
        onClick={toggleComponent}
      >
        {showTaskList ? "Switch to Create Task" : "Switch to Task List"}
      </button> }

      {showTaskList ? (
        <div>
          <DailyTaskList />
        </div>
        
      ) : (
        <div>
          <h1>Create Task</h1>
          
        </div>
      )}
    </div>
  );
}
