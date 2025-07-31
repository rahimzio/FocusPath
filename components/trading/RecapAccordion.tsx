"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function RecapAccordion() {
  const days = Array.from({ length: 28 });
  const weeks = Array.from({ length: 12 });
  const months = Array.from({ length: 12 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recap</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="Tage" className="space-y-4">
          <TabsList>
            <TabsTrigger value="Tage">Tage</TabsTrigger>
            <TabsTrigger value="Wochen">Wochen</TabsTrigger>
            <TabsTrigger value="Monate">Monate</TabsTrigger>
          </TabsList>

          <TabsContent value="Tage">
            <div className="grid grid-cols-7 gap-1">
              {days.map((_, i) => (
                <div
                  key={i}
                  className="w-full aspect-square bg-muted rounded"
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="Wochen">
            <div className="grid grid-cols-4 gap-1">
              {weeks.map((_, i) => (
                <div
                  key={i}
                  className="w-full aspect-video bg-muted rounded"
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="Monate">
            <div className="grid grid-cols-4 gap-1">
              {months.map((_, i) => (
                <div
                  key={i}
                  className="w-full aspect-video bg-muted rounded"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
