
import FaqSection from "@/components/FaqSection";

const resizeFaqs = [
  {
    question: "Is the image resizer free to use?",
    answer:
      "Yes. MeetTools lets you resize images online for free without creating an account. Upload an image, choose your required dimensions, and download the resized result.",
  },
  {
    question: "How can I resize an image without losing quality?",
    answer:
      "Choose suitable image dimensions and adjust the output quality settings. Higher quality settings generally preserve more visual detail, while stronger compression can reduce file size but may affect image quality.",
  },
  {
    question: "Can I resize and convert images to WebP or AVIF?",
    answer:
      "Yes. You can resize images and convert them to supported output formats such as WebP and AVIF. Choose your preferred format and quality settings before downloading.",
  },
  {
    question: "Do I need an account to resize images?",
    answer:
      "No. You can use guest mode to resize and download images without signing up. A free account also provides access to saved files and image history.",
  },
  {
    question: "How long are uploaded images stored?",
    answer:
      "Files saved to your account are automatically deleted after 24 hours. In guest mode, files are discarded after processing.",
  },
];

export default function ResizeFaq() {
  return <FaqSection items={resizeFaqs} />;
}
