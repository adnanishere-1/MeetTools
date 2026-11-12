import Link from "next/link";

const improvements = [
  {
    title: "Sharpness and clarity",
    text: "Make soft or slightly blurry photos look crisper and easier to read.",
  },
  {
    title: "Brightness and contrast",
    text: "Lighten dark photos and add depth to flat, washed-out pictures.",
  },
  {
    title: "Color",
    text: "Bring back natural, lively colors in dull or faded images.",
  },
];

const steps = [
  {
    title: "Upload your image",
    text: "Choose a JPG, PNG or WebP photo from your device.",
  },
  {
    title: "Enhance it",
    text: "Start the enhancement and wait a few seconds while your image is processed.",
  },
  {
    title: "Compare and download",
    text: "Check the result and download the enhanced image to use anywhere.",
  },
];

const tips = [
  "Start with the highest quality original you have. Enhancing a good photo gives better results than enhancing a tiny, heavily compressed one.",
  "Small improvements usually look more natural than extreme changes.",
  "Enhancement improves what is already in the photo. It cannot add detail that was never captured.",
  "Enhance first, then resize or compress so the final file is the right size for your website or form.",
];

export default function EnhanceGuide() {
  return (
    <section className="w-full bg-[#fff3ec] font-sans text-[#121212] pt-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          Free Online Image Enhancer
        </h2>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-10">
          Dark, dull or slightly blurry photos are easy to improve. The
          MeetTools Image Enhancer helps you boost the quality of your pictures
          online, without installing any software. Use it for profile photos,
          product images, social media posts and everyday snapshots.
        </p>

        <h3 className="text-xl font-black mb-4">What you can improve</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          {improvements.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl border-2 border-[#fb8500]/20 p-5"
            >
              <p className="font-bold mb-1">{item.title}</p>
              <p className="text-sm text-[#555555] leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-black mb-4">How to enhance an image</h3>

        <ol className="space-y-3 mb-12">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="bg-white rounded-2xl border-2 border-[#fb8500]/20 p-5"
            >
              <p className="font-bold">
                <span className="text-[#c2410c]">{index + 1}.</span>{" "}
                {step.title}
              </p>
              <p className="text-sm text-[#555555] mt-1 leading-relaxed">
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        <h3 className="text-xl font-black mb-4">Tips for better results</h3>

        <ul className="space-y-2 mb-6 list-disc pl-5 text-sm text-[#555555] leading-relaxed">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        <p className="text-sm text-[#555555] leading-relaxed">
          Need a smaller file after enhancing? Use our{" "}
          <Link
            href="/tools/resize"
            className="font-bold text-[#c2410c] underline underline-offset-2"
          >
            free image resizer and compressor
          </Link>{" "}
          to change the size or convert to WebP.
        </p>
      </div>
    </section>
  );
}
