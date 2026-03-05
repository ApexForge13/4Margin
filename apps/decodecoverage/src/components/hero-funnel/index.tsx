"use client";

import { useState } from "react";
import { FunnelEntry } from "@/components/funnel-entry";
import { QuizFlow } from "@/components/quiz-flow";

export function HeroFunnel() {
  const [quizEmail, setQuizEmail] = useState<string | null>(null);

  if (quizEmail) {
    return <QuizFlow email={quizEmail} />;
  }

  return <FunnelEntry onSelectQuiz={(email) => setQuizEmail(email)} />;
}
