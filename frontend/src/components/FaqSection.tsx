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
    <section className="w-full bg-[#fff3ec] font-sans text-[#121212] py-16 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-[10px] font-bold uppercase tracking-widest mb-3">
            FAQ
          </span>

          <h2 className="text-3xl md:text-4xl font-black text-[#121212]">
            Frequently Asked{" "}
            <span className="text-[#fb8500]">Questions</span>
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <details
              key={item.question}
              className="group bg-white rounded-2xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] open:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all p-5"
            >
              <summary className="cursor-pointer list-none flex justify-between items-center gap-4 font-bold text-[#121212] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="text-[#fb8500] text-2xl leading-none group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>

              <p className="mt-3 text-sm text-[#555555] leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}