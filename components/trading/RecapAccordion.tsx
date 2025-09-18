"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function RecapAccordion() {
  const days = Array.from({ length: 28 });
  const weeks = Array.from({ length: 12 });
  const months = Array.from({ length: 12 });

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <CardTitle className="truncate">Recap</CardTitle>
      </CardHeader>

      <CardContent className="w-full max-w-full min-w-0">
        <Tabs defaultValue="Tage" className="space-y-4 w-full max-w-full min-w-0">
          <TabsList className="w-full overflow-x-auto whitespace-nowrap flex gap-1 p-1">
            <TabsTrigger value="Tage" className="flex-1 sm:flex-none min-w-[110px]">
              Tage
            </TabsTrigger>
            <TabsTrigger value="Wochen" className="flex-1 sm:flex-none min-w-[110px]">
              Wochen
            </TabsTrigger>
            <TabsTrigger value="Monate" className="flex-1 sm:flex-none min-w-[110px]">
              Monate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Tage" className="w-full max-w-full min-w-0">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 w-full">
              {days.map((_, i) => (
                <div key={i} className="w-full aspect-square bg-muted rounded" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="Wochen" className="w-full max-w-full min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 w-full">
              {weeks.map((_, i) => (
                <div key={i} className="w-full aspect-video bg-muted rounded" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="Monate" className="w-full max-w-full min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 w-full">
              {months.map((_, i) => (
                <div key={i} className="w-full aspect-video bg-muted rounded" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
