"use client";
import React from "react";
import { TradeEntry } from "@/utils/interface";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm, FormProvider } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  trade: TradeEntry;
  onSaved: () => void;
}

interface FormValues {
  notes: string;
  emotionBefore: string;
  triggerEvent: string;
  mentalMistake: string;
  performanceState: "A" | "B" | "C";
  tiltDetected: boolean;
}

export default function ReflectionPanel({ trade, onSaved }: Props) {
  const methods = useForm<FormValues>({
    defaultValues: {
      notes: trade.reflectionNotes || "",
      emotionBefore: trade.emotionBefore || "",
      triggerEvent: trade.triggerEvent || "",
      mentalMistake: trade.mentalMistake || "",
      performanceState: trade.performanceState || "A",
      tiltDetected: trade.tiltDetected || false,
    },
  });

  const { handleSubmit, control, watch } = methods;
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const disciplineScore = Math.round(
      ((Number(trade.followedSetup) +
        Number(trade.respectedStopLoss) +
        Number(trade.managedRisk)) /
        3) *
        100
    );

    await fetch(`/api/trades/update?id=${trade._id}&userId=${trade.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reflectionNotes: data.notes,
        emotionBefore: data.emotionBefore,
        triggerEvent: data.triggerEvent,
        mentalMistake: data.mentalMistake,
        performanceState: data.performanceState,
        followedSetup: trade.followedSetup,
        respectedStopLoss: trade.respectedStopLoss,
        managedRisk: trade.managedRisk,
        disciplineScore,
        tiltDetected: data.tiltDetected,
      }),
    });
    setLoading(false);
    onSaved();
  };

  const disciplineScore = Math.round(
    ((Number(trade.followedSetup) +
      Number(trade.respectedStopLoss) +
      Number(trade.managedRisk)) /
      3) *
      100
  );

  const pieData = [
    { name: "Disziplin", value: disciplineScore },
    { name: "Fehler", value: 100 - disciplineScore },
  ];
  const COLORS = ["#10b981", "#e5e7eb"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reflexion für {trade.symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-4">
                <FormField
                  control={control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Notizen</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="emotionBefore"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Emotion vor dem Trade</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          <SelectTrigger>
                            <SelectValue placeholder="Emotion wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Angst">Angst</SelectItem>
                            <SelectItem value="Gier">Gier</SelectItem>
                            <SelectItem value="Stress">Stress</SelectItem>
                            <SelectItem value="Ruhe">Ruhe</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="triggerEvent"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Trigger Event</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="mentalMistake"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Mentaler Fehler</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          <SelectTrigger>
                            <SelectValue placeholder="Fehler wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SL verschoben">SL verschoben</SelectItem>
                            <SelectItem value="Overtrading">Overtrading</SelectItem>
                            <SelectItem value="FOMO">FOMO</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="performanceState"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Performance Rating</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          <SelectTrigger>
                            <SelectValue placeholder="Rating wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="tiltDetected"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        >
                          Tilt erkannt
                        </Checkbox>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="w-32">
                <AspectRatio ratio={1} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={20}
                        outerRadius={50}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </AspectRatio>
                <div className="text-center mt-2 text-sm">
                  Disziplin: {disciplineScore}%
                </div>
              </div>
            </div>
          </form>
        </FormProvider>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="default" onClick={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? "Speichern..." : "Speichern"}
        </Button>
      </CardFooter>
    </Card>
  );
}
