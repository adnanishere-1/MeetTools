export interface PresetFaq {
  question: string;
  answer: string;
}

export interface ResizePreset {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  width?: number;
  height?: number;
  targetKb?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
  intro: string;
  steps: string[];
  faqs: PresetFaq[];
}

export const resizePresets: ResizePreset[] = [
  {
    slug: "50kb",
    metaTitle: "Resize Image to 50KB Online Free",
    metaDescription:
      "Compress and resize any photo to 50 KB online for free. Ideal for form photos and signatures. No signup needed.",
    h1: "Resize Image to 50KB Online",
    subtitle:
      "Upload your photo and compress it to a 50 KB target. Free, no signup.",
    targetKb: 50,
    format: "jpeg",
    intro:
      "Many online forms, job portals and exam applications limit photo and signature uploads to 50 KB. This tool compresses your image towards a 50 KB target while keeping it as sharp as possible.",
    steps: [
      "Upload your JPG, PNG or WebP image.",
      "The target file size is already set to 50 KB. Change it if your form needs a different limit.",
      "Click Resize & Compress Image and download the result.",
    ],
    faqs: [
      {
        question: "How do I reduce an image to 50 KB?",
        answer:
          "Upload your image, keep the target file size at 50 and click Resize & Compress Image. Download the file when processing finishes.",
      },
      {
        question: "Will the image quality drop?",
        answer:
          "Reaching a small file size needs compression, so some detail is lost. Large photos compress more cleanly if you also reduce the width and height.",
      },
      {
        question: "Can I use a different limit like 20 KB or 100 KB?",
        answer:
          "Yes. Change the Target File Size (KB) field to any value your form requires.",
      },
      {
        question: "Do I need an account?",
        answer:
          "No. You can resize and download as a guest. A free account lets you reuse your uploaded files.",
      },
      {
        question: "Are my files stored?",
        answer:
          "Files are processed on our servers and automatically deleted after 24 hours.",
      },
    ],
  },
  {
    slug: "passport-size",
    metaTitle: "Passport Size Photo Resizer Online Free",
    metaDescription:
      "Resize your photo to passport size (35x45 mm, 413x531 px at 300 DPI) online for free. No signup needed.",
    h1: "Passport Size Photo Resizer",
    subtitle:
      "Resize your photo to 413 x 531 px (35 x 45 mm at 300 DPI). Free, no signup.",
    width: 413,
    height: 531,
    format: "jpeg",
    intro:
      "A common passport photo size is 35 x 45 mm, which equals 413 x 531 pixels at 300 DPI. This tool sets that size for you. Requirements differ by country and application, so always check the official rules before submitting.",
    steps: [
      "Upload a clear, front-facing photo.",
      "The size is already set to 413 x 531 px. Change width and height if your country uses another size.",
      "Click Resize & Compress Image and download the result.",
    ],
    faqs: [
      {
        question: "What is passport size in pixels?",
        answer:
          "35 x 45 mm at 300 DPI is 413 x 531 pixels. This is a common size, but check the rules of your country or application.",
      },
      {
        question: "Do all countries use this size?",
        answer:
          "No. For example, some countries use 2 x 2 inches (600 x 600 px). You can type any width and height in the tool.",
      },
      {
        question: "Will my photo be stretched?",
        answer:
          "The exact size you enter is applied. For best results, upload a photo with a similar shape (about 7:9) or crop it first.",
      },
      {
        question: "Is it free?",
        answer:
          "Yes. You can resize photos for free without creating an account.",
      },
    ],
  },
  {
    slug: "whatsapp-dp",
    metaTitle: "WhatsApp DP Size Resizer Online Free",
    metaDescription:
      "Resize any photo to a square WhatsApp profile picture (500 x 500 px) online for free. No signup needed.",
    h1: "WhatsApp DP Size Resizer",
    subtitle:
      "Resize any photo to a square 500 x 500 px profile picture. Free, no signup.",
    width: 500,
    height: 500,
    format: "jpeg",
    intro:
      "WhatsApp shows profile pictures as a circle cut from a square image. A 500 x 500 px square photo is a safe size that stays sharp and is not cut off awkwardly.",
    steps: [
      "Upload the photo you want as your profile picture.",
      "The size is already set to a 500 x 500 px square.",
      "Click Resize & Compress Image, download it and set it as your WhatsApp DP.",
    ],
    faqs: [
      {
        question: "What is a good WhatsApp DP size?",
        answer:
          "A square image of 500 x 500 px works well and stays sharp on most phones.",
      },
      {
        question: "Why does my DP look cropped?",
        answer:
          "WhatsApp displays profile pictures as a circle, so the corners are hidden. Keep faces and important details near the centre.",
      },
      {
        question: "Will my photo be stretched?",
        answer:
          "The exact 500 x 500 size is applied. Use a photo that is already close to square, or crop it first, for the best result.",
      },
      {
        question: "Is it free?",
        answer:
          "Yes. You can resize photos for free without creating an account.",
      },
    ],
  },
];

export function getPreset(slug: string): ResizePreset {
  const preset = resizePresets.find((item) => item.slug === slug);

  if (!preset) {
    throw new Error(`Unknown resize preset: ${slug}`);
  }

  return preset;
}
