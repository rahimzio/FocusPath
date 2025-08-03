"use client";
import React from "react";
import useSWR from "swr";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from "../ui/stat";
import { Spinner } from "../ui/spinner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
    userId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MentalStatsOverview({ userId }: Props) {
    const { data, error, isLoading } = useSWR<{
        performance: Record<string, number>;
        avgDiscipline: number;
        tiltCount: number;
        mistakes: { name: string; count: number }[];
    }>(
        userId ? `/api/trading/mentalStats?userId=${userId}` : null,
        fetcher
    );

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Spinner />
            </div>
        );
    }
    if (error) {
        return <div className="text-red-600 text-center py-4">Fehler beim Laden der Mental-Stats</div>;
    }

    // Solange data undefined ist, abbrechen (z.B. mit Spinner oder null)
    if (!data) {
        return (
            <div className="flex justify-center py-8">
                <Spinner />
            </div>
        );
    }

    const perfData = Object.entries(data.performance).map(([name, value]) => ({ name, value }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mental-Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Performance Bar Chart */}
                <AspectRatio ratio={4 / 1} className="w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perfData}>
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#6366F1" />
                        </BarChart>
                    </ResponsiveContainer>
                </AspectRatio>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <Stat>
                        <StatLabel>Ø Disziplin</StatLabel>
                        <StatNumber>{Math.round(data.avgDiscipline)}</StatNumber>
                    </Stat>
                    <Stat>
                        <StatLabel>Tilt Events</StatLabel>
                        <StatNumber>{data.tiltCount}</StatNumber>
                    </Stat>
                </div>

                {/* Mistakes List */}
                <div>
                    <div className="text-sm font-medium mb-2">Häufige Fehler</div>
                    <ul className="list-disc pl-5 space-y-1">
                        {data.mistakes.map(m => (
                            <li key={m.name} className="text-sm">
                                {m.name}: {m.count}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
