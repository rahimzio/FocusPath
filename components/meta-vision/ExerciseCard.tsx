//components/meta-vision/ExerciseCard.tsx

import { Exercise } from "@/pages/api/sport/ExerciseDetail";
import Link from "next/link";

type Props = {
    exercise: Exercise;
};

export default function ExerciseCard({ exercise }: Props) {
    return (
        <div className="border p-4 rounded-lg shadow">
            <h3 className="text-lg font-bold">{exercise.name}</h3>
            <p className="text-sm mb-2">{exercise.tags.join(", ")}</p>
            <Link
                href={`/meta-vision/level/${exercise.level}/exercise/${exercise.slug}`}
                className="text-primary underline"
            >
                Starten
            </Link>    </div>
    );
}
