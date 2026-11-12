import Link from "next/link";
import FaqSection from "@/components/FaqSection";

const improvements = [
  {
    title: "Better image quality",
    text: "Improve the overall look of everyday photos, profile pictures and product images.",
  },
  {
    title: "Upscaling",
    text: "Make small or low-resolution images larger and clearer.",
  },
  {
    title: "Custom backgrounds",
    text: "Adjust the background of your image in the tool settings before you download it.",
  },
];

const steps = [
  {
    title: "Upload your image",
    text: "Choose a JPG, PNG or WebP photo from your device.",
  },
  {
    title: "Adjust the settings",
    text: "Choose your enhancement settings and customize the background if you need to.",
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

function EnhanceGuide() {
  return (
    <section className="w-full bg-[#fff3ec] font-sans text-[#121212] pt-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          Free Online Image Enhancer
        </h2>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-10">
          Low-quality or small photos are easy to improve. The MeetTools Image
          Enhancer helps you upscale and enhance your pictures online, adjust
          the settings and customize the background, without installing any
          software. Use it for profile photos, product images, social media
          posts and everyday snapshots.
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

const enhanceFaqs = [
  {
    question: "Is the image enhancer free to use?",
    answer:
      "Yes. The MeetTools Image Enhancer is free to use. A free account also lets you keep your files for later.",
  },
  {
    question: "Which image formats can I enhance?",
    answer:
      "Common formats such as JPG, PNG and WebP work best. Upload the highest quality version you have for the best result.",
  },
  {
    question: "Will enhancing change my original image?",
    answer:
      "No. Your original file stays untouched. You download the enhanced version as a new file.",
  },
  {
    question: "Can I change the background of my image?",
    answer:
      "Yes. The tool includes background options that you can adjust before downloading the enhanced image.",
  },
  {
    question: "Can it fix a very blurry photo?",
    answer:
      "Enhancement can improve clarity and color, but it cannot recreate detail that was never captured. Very blurry photos will improve only a little.",
  },
  {
    question: "Can I resize or compress the image after enhancing it?",
    answer:
      "Yes. Use the MeetTools Image Resizer to change the dimensions, set a target file size or convert to WebP or AVIF.",
  },
  {
    question: "How long are my files stored?",
    answer:
      "Files are processed on our servers and automatically deleted after 24 hours.",
  },
];

function EnhanceFaq() {
  return <FaqSection items={enhanceFaqs} />;
}

export default function EnhanceContent() {
  return (
    <>
      <EnhanceGuide />
      <EnhanceFaq />
    </>
  );
}
