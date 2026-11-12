import FaqSection from "@/components/FaqSection";

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

export default function EnhanceFaq() {
  return <FaqSection items={enhanceFaqs} />;
}
