interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqSection({ items }: { items: FaqItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="max-w-3xl mx-auto px-6 py-12 w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <h2 className="text-2xl md:text-3xl font-black text-[#121212] mb-6">
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group bg-white rounded-2xl border border-[#fb8500]/20 p-5"
          >
            <summary className="cursor-pointer font-bold text-[#121212] list-none flex justify-between items-center gap-4">
              {item.question}
              <span className="text-[#fb8500] text-xl group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-[#555555] leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}