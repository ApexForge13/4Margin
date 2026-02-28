"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Is this really free?",
    answer:
      "Yes. No credit card, no hidden fees. We make money when homeowners choose to get connected with better coverage options. If you just want the free report, that's completely fine.",
  },
  {
    question: "Who sees my policy?",
    answer:
      "Nobody. Our AI analyzes your document automatically. No human reads your policy. Your data is encrypted and never sold to third parties.",
  },
  {
    question: "What if I don't have the PDF?",
    answer:
      "Take a photo of your declarations page (the summary page your insurer sends at renewal). That's usually enough to identify the most critical gaps.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="faq-list">
      {FAQS.map((faq, i) => (
        <div
          key={i}
          className={`faq-item${open === i ? " faq-open" : ""}`}
          onClick={() => setOpen(open === i ? null : i)}
        >
          <div className="faq-question">
            <span>{faq.question}</span>
            <ChevronDown
              size={20}
              style={{
                transition: "transform 0.3s ease",
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                flexShrink: 0,
              }}
            />
          </div>
          <div
            className="faq-answer"
            style={{
              maxHeight: open === i ? 200 : 0,
              opacity: open === i ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease, opacity 0.3s ease",
            }}
          >
            <p>{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
