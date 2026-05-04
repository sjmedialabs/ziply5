"use client";

import { useEffect, useState } from "react";

export default function FAQPage() {
  const [cmsData, setCmsData] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch("/api/v1/cms/pages?slug=faq");
        const json = await res.json();

        const content =
          json?.data?.sections?.find(
            (s: any) => s.sectionType === "faq"
          )?.contentJson;

        if (content) {
          // Normalize data to support both the new object structure and the old array structure
          const isLegacyArray = Array.isArray(content);
          const normalizedContent = isLegacyArray ? { items: content } : content;
          setCmsData(normalizedContent);

          const items = normalizedContent.items || [];
          if (items.length > 0) {
            setFaqs(items.filter((faq: any) => faq.isVisible !== false));
          } else {
            setFaqs([]);
          }
        } else {
          setFaqs([]);
        }
      } catch (err) {
        console.error("Failed to load FAQs", err);

        //  fallback on error
        setFaqs([]);
      }
    };

    fetchFaqs();
  }, []);

  return (
    <div className="w-full">

      {/* HERO SECTION */}

      <section
        className="w-full h-[40vh]  flex flex-col items-center justify-center text-center bg-cover bg-center"
        style={{
          backgroundImage: `url('${cmsData?.bgImage || '/contactUsBg.png'}')`,
        }}
      >
        {cmsData?.title && (
          <h1 className="font-melon text-primary text-xl lg:text-4xl font-medium">
            {cmsData.title}
          </h1>
        )}

        {/* {cmsData?.description && (
          <p className="text-sm text-gray-600 mt-2">
            {cmsData.description}
          </p>
        )} */}

        {/* <div className="mt-4 px-4 py-2 bg-white rounded-full text-sm shadow">
          <span className="text-primary">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">FAQ</span>
        </div> */}
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