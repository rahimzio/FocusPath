// StepFormIdeal.tsx
import React, { useState } from "react";
import { frequencyQuestions, FrequencyQuestion } from "@/utils/frequenz/questionBank";

const StepFormIdeal = () => {
  const idealQuestions = frequencyQuestions.filter(q => q.idealVersion !== "–");
  const totalSteps = idealQuestions.length + 1; // +1 für Forbidden Behaviors

  const [answers, setAnswers] = useState<{ [id: string]: string | number | string[] }>({});
  const [forbiddenBehaviors, setForbiddenBehaviors] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const currentQuestion = idealQuestions[step];

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleChange = (value: string | number | string[]) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  function addForbiddenBehavior() {
    setForbiddenBehaviors((prev) => [...prev, ""]);
  }

  function updateForbiddenBehavior(index: number, value: string) {
    setForbiddenBehaviors((prev) =>
      prev.map((item, i) => (i === index ? value : item))
    );
  }

  function removeForbiddenBehavior(index: number) {
    setForbiddenBehaviors((prev) => prev.filter((_, i) => i !== index));
  }

  const renderInput = (question: FrequencyQuestion) => {
    switch (question.type) {
      case "freitext":
        return (
          <textarea
            className="w-full border p-2 rounded"
            value={(answers[question.id] as string) || ""}
            onChange={e => handleChange(e.target.value)}
          />
        );
      case "skala":
        return (
          <input
            type="range"
            min={question.min}
            max={question.max}
            value={(answers[question.id] as number) || question.min}
            onChange={e => handleChange(parseInt(e.target.value))}
            className="w-full"
          />
        );
      case "multiple":
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(answers[question.id] as string[] | undefined)?.includes(option) || false}
                  onChange={(e) => {
                    const prev = (answers[question.id] as string[]) || [];
                    const newVal = e.target.checked
                      ? [...prev, option]
                      : prev.filter((item) => item !== option);
                    handleChange(newVal);
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow text-black">
      <h2 className="text-2xl font-bold mb-4">Deine ideale Frequenz</h2>

      <div className="mb-6">
        {step < idealQuestions.length ? (
          <>
            <h3 className="text-lg font-semibold mb-2">
              ({step + 1}/{totalSteps}) {currentQuestion.idealVersion}
            </h3>
            {renderInput(currentQuestion)}
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-2">
              ({step + 1}/{totalSteps}) Verhaltensweisen, die du vermeiden möchtest
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Welche Gewohnheiten oder Muster willst du loslassen, um dein höchstes Selbst zu leben?
            </p>

            {forbiddenBehaviors.map((behavior, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={behavior}
                  onChange={(e) => updateForbiddenBehavior(index, e.target.value)}
                  className="flex-1 border p-2 rounded"
                  placeholder="z.B. Alkohol trinken"
                />
                <button
                  type="button"
                  onClick={() => removeForbiddenBehavior(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Entfernen
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addForbiddenBehavior}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Weitere Verhaltensweise hinzufügen
            </button>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Zurück
        </button>
        <button
          onClick={handleNext}
          disabled={step === totalSteps - 1}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Weiter
        </button>
      </div>
    </div>
  );
};

export default StepFormIdeal;
