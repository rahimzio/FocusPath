"use client";
import DailyTaskList from "@/components/dailyTodos";
import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import SheetComponent from "@/components/todo/PopUpCreateTask";
export default function Home() {
  const [showTaskList, setShowTaskList] = useState(true);

  const toggleComponent = () => setShowTaskList((prev) => !prev);

  return (<div><DailyTaskList /></div>);
}
