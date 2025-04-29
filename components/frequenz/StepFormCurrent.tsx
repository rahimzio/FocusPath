// StepFormCurrent.tsx
import React, { useState } from "react";
import { frequencyQuestions, FrequencyQuestion }from "@/utils/frequenz/questionBank";

const StepFormCurrent = () => {
  const currentQuestions = frequencyQuestions.filter(q => q.currentVersion !== "–");
  const [answers, setAnswers] = useState<{ [id: string]: string | number | string[] }>({});
  const [step, setStep] = useState(0);

  const currentQuestion = currentQuestions[step];

  const handleNext = () => {
    if (step < currentQuestions.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleChange = (value: string | number | string[]) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

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
      <h2 className="text-2xl font-bold mb-4">Dein aktueller Zustand</h2>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          ({step + 1}/{currentQuestions.length}) {currentQuestion.currentVersion}
        </h3>
        {renderInput(currentQuestion)}
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
          disabled={step === currentQuestions.length - 1}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Weiter
        </button>
      </div>
    </div>
  );
};

export default StepFormCurrent;
