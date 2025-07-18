import { FrequencyProfile, FrequencySnapshot } from "@/utils/frequenz/frequencyModels";

type FrequencyRecommendation = {
  title: string;
  description: string;
  category: "Mindset" | "Körper" | "Emotion" | "Verhalten";
  gapReason: string;
  basedOn: string;
};

export function generateFrequencyTasks(
  snapshot: FrequencySnapshot,
  profile: FrequencyProfile
): FrequencyRecommendation[] {
  const recommendations: FrequencyRecommendation[] = [];

  for (const [questionId, answer] of Object.entries(snapshot.answers)) {
    const { gapScore, currentAnswer, idealAnswer } = answer as any;

    if (gapScore < 0.3) continue;

    switch (questionId) {
      case "defaultReactionInStress":
        recommendations.push({
          title: "Stressreaktion verbessern",
          description:
            "Heute kamst du bei Stress aus dem Gleichgewicht. Nimm dir 10 Minuten für bewusste Atmung oder eine Gehmeditation.",
          category: "Körper",
          gapReason: `Deine aktuelle Reaktion war: ${currentAnswer}. Dein Ziel ist: ${idealAnswer}.`,
          basedOn: "defaultReactionInStress",
        });
        break;

      case "selfBeliefLevel":
        recommendations.push({
          title: "Selbstvertrauen aufbauen",
          description:
            "Schreib 3 Dinge auf, auf die du stolz bist – und lies sie dir laut vor.",
          category: "Mindset",
          gapReason: `Dein Glaube an dich liegt bei ${currentAnswer} von 5, Ziel ist ${idealAnswer}.`,
          basedOn: "selfBeliefLevel",
        });
        break;

      case "convictionStyle":
        recommendations.push({
          title: "Handle mit Überzeugung",
          description:
            "Triff heute eine Entscheidung bewusst und ohne lange zu zögern. Handle so, wie dein Traum-Ich es tun würde.",
          category: "Verhalten",
          gapReason: "Du hast dich nicht im Einklang mit deiner Idealhandlung gesehen.",
          basedOn: "convictionStyle",
        });
        break;

      case "coreEmotions":
        if (Array.isArray(currentAnswer) && Array.isArray(idealAnswer)) {
          const missing = (idealAnswer as string[]).filter(
            (val) => !(currentAnswer as string[]).includes(val)
          );
          if (missing.length > 0) {
            recommendations.push({
              title: "Emotionen aktivieren",
              description: `Fördere gezielt Emotion(en) wie ${missing.join(
                ", "
              )}. Z. B. durch Musik, Journal oder Dankbarkeitsübung.`,
              category: "Emotion",
              gapReason: `Diese Emotionen fehlen dir aktuell: ${missing.join(
                ", "
              )}`,
              basedOn: "coreEmotions",
            });
          }
        }
        break;
    }
  }

  return recommendations;
}
