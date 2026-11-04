import FaqSection from "@/components/FaqSection";

const resizeFaqs = [
  {
    question: "Is the image resizer free to use?",
    answer:
      "Yes. You can resize images for free without creating an account.",
  },
  {
    question: "Does resizing an image reduce its quality?",
    answer:
      "You control the output quality yourself. At higher quality settings the difference is hard to notice.",
  },
  {
    question: "Can I convert images to WebP or AVIF?",
    answer:
      "Yes. You can resize and convert your images to modern formats like WebP and AVIF while controlling compression quality.",
  },
  {
    question: "Do I need an account to use the tool?",
    answer:
      "No. Guest mode lets you resize and download instantly. A free account lets you reuse your uploaded files and keep your history.",
  },
  {
    question: "How long are my files stored?",
    answer:
      "Files saved to your account are automatically deleted after 24 hours. In guest mode, files are discarded right after processing.",
  },
];

export default function ResizeFaq() {
  return <FaqSection items={resizeFaqs} />;
}