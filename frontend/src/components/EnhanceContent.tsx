
import Link from "next/link";
import FaqSection from "@/components/FaqSection";

const improvements = [
  {
    title: "Improve image quality",
    text: "Enhance the appearance of everyday photos, profile pictures and product images.",
  },
  {
    title: "Upscale images",
    text: "Make smaller or low-resolution images larger while improving their appearance.",
  },
  {
    title: "Customize backgrounds",
    text: "Adjust the available background settings before downloading your enhanced image.",
  },
];

const steps = [
  {
    title: "Upload your image",
    text: "Select a JPG, PNG or WebP image from your device.",
  },
  {
    title: "Adjust enhancement settings",
    text: "Choose the available enhancement options and customize the background if needed.",
  },
  {
    title: "Preview and download",
    text: "Review the enhanced result and download your improved image.",
  },
];

const tips = [
  "Start with the highest-quality original image available. Very small or heavily compressed images may have limited improvement.",
  "Use moderate enhancement settings for more natural-looking results.",
  "Image enhancement can improve the appearance of existing details, but it cannot always recover details missing from the original photo.",
  "Enhance your image first, then resize or compress it to meet your website or upload requirements.",
];

function EnhanceGuide() {
  return (
    <section className="w-full bg-[#fff3ec] font-sans text-[#121212] pt-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          How to Enhance Image Quality Online
        </h2>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-10">
          Improve image quality online with the free MeetTools Image Enhancer.
          Upload a photo, adjust the available enhancement settings and
          customize its background before downloading the result. You can use
          the tool for profile pictures, product photos, social media images
          and everyday photographs without installing desktop software.
        </p>

        <h3 className="text-xl font-black mb-4">
          What Can an Image Enhancer Improve?
        </h3>

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

        <h3 className="text-xl font-black mb-4">
          How to Enhance an Image Online
        </h3>

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

        <h3 className="text-xl font-black mb-4">
          Tips for Better Image Enhancement Results
        </h3>

        <ul className="space-y-2 mb-6 list-disc pl-5 text-sm text-[#555555] leading-relaxed">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        <p className="text-sm text-[#555555] leading-relaxed">
          Need to change your image dimensions or file size after enhancement?
          Try our{" "}
          <Link
            href="/tools/resize"
            className="font-bold text-[#c2410c] underline underline-offset-2"
          >
            free online image resizer
          </Link>{" "}
          to resize and prepare your image for websites, forms and social media.
        </p>
      </div>
    </section>
  );
}

const enhanceFaqs = [
  {
    question: "Is the MeetTools Image Enhancer free to use?",
    answer:
      "Yes. You can use the MeetTools Image Enhancer online without installing desktop software. Check the tool for any account or usage requirements.",
  },
  {
    question: "Which image formats can I enhance?",
    answer:
      "You can upload common image formats such as JPG, PNG and WebP. Use the highest-quality original image available for better results.",
  },
  {
    question: "Will enhancing an image change my original file?",
    answer:
      "The enhanced result is provided as a separate output file, so your original image remains unchanged.",
  },
  {
    question: "Can I customize the background of an image?",
    answer:
      "Yes. The tool provides background settings that you can adjust before downloading the enhanced result.",
  },
  {
    question: "Can an image enhancer fix a very blurry photo?",
    answer:
      "Image enhancement may improve the appearance of a blurry photo, but it cannot always recover details that were not captured in the original image.",
  },
  {
    question: "Can I resize or compress an image after enhancing it?",
    answer:
      "Yes. You can use the MeetTools Image Resizer to change image dimensions, adjust quality and prepare your image for uploading.",
  },
  {
    question: "How long are uploaded images stored?",
    answer:
      "Uploaded files are automatically deleted after 24 hours.",
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
