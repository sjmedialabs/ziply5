"use client";

import { useEffect, useState } from "react";

const fallbackFaqs = [
  {
    question: "Do you offer dairy-free or vegan options?",
    answer:
      "Yes, we offer a variety of dairy-free and vegan-friendly options made with plant-based ingredients.",
  },
  {
    question: "What ingredients do you use in your ice cream?",
    answer:
      "We use high-quality natural ingredients including fresh milk, fruits, and premium flavorings.",
  },
  {
    question: "Do you have gluten-free ice cream?",
    answer:
      "Yes, many of our flavors are gluten-free. Please check product labels or contact us for details.",
  },
  {
    question: "Can I order ice cream online?",
    answer:
      "Absolutely! You can place your order directly through our website for home delivery.",
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<any[]>(fallbackFaqs);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch("/api/v1/cms/pages?slug=faq");
        const json = await res.json();

        const faqSection =
          json?.data?.sections?.find(
            (s: any) => s.sectionType === "faq"
          )?.contentJson || [];

        //  Use CMS if available, else fallback
        if (faqSection.length > 0) {
          // Filter out explicitly hidden FAQs
          setFaqs(faqSection.filter((faq: any) => faq.isVisible !== false));
        } else {
          setFaqs(fallbackFaqs);
        }
      } catch (err) {
        console.error("Failed to load FAQs", err);

        //  fallback on error
        setFaqs(fallbackFaqs);
      }
    };

    fetchFaqs();
  }, []);

  return (
    <div className="w-full">

      {/* HERO SECTION */}

      <section
        className="w-full h-[280px] md:h-[320px] flex flex-col items-center justify-center text-center bg-cover bg-center"
        style={{
          backgroundImage: "url('/contactUsBg.png')",
        }}
      >
        <h1 className="font-melon text-primary text-3xl md:text-4xl font-medium">
          Frequently Asked Questions
        </h1>

        <p className="text-sm text-gray-600 mt-2">
          Some of the queries you want to know about us.
        </p>

        <div className="mt-4 px-4 py-2 bg-white rounded-full text-sm shadow">
          <span className="text-primary">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">FAQ</span>
        </div>
      </section>

      {/* FAQ SECTION */}

      <section className="max-w-4xl mx-auto px-4 py-12">

        <div className="space-y-4">

          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border rounded-xl p-4 bg-white shadow-sm cursor-pointer transition"
              onClick={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            >
              {/* QUESTION */}
              <div className="flex items-center justify-between">

                <h3 className="text-sm md:text-base font-medium text-gray-800">
                  {faq.question}
                </h3>

                <div className="w-8 h-8 flex items-center justify-center border border-orange-400 rounded-full text-orange-500">
                  {openIndex === index ? "-" : ">"}
                </div>

              </div>

              {/* ANSWER */}
              {openIndex === index && (
                <p className="text-sm text-gray-500 mt-3">
                  {faq.answer}
                </p>
              )}

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}