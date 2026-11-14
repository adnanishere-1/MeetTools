
const steps = [
  {
    title: "Upload an image",
    text: "Upload a JPG, JPEG, PNG, or WebP image from your device. You can start resizing without creating an account or installing software.",
  },
  {
    title: "Set image dimensions",
    text: "Enter your preferred width and height in pixels. Choose an output format such as JPG, PNG, WebP, or AVIF if supported by the tool, and adjust image quality or target file size when needed.",
  },
  {
    title: "Resize and compress",
    text: "Click Resize & Compress Image to process your image. The tool adjusts the dimensions and applies your selected output settings.",
  },
  {
    title: "Download your resized image",
    text: "Preview the result and download your resized image. You can use it for websites, social media profiles, online forms, email, and other digital platforms.",
  },
];

export default function ResizeGuide() {
  return (
    <section
      className="w-full bg-[#fff3ec] font-sans text-[#121212] pt-16 px-6"
      aria-labelledby="resize-guide-heading"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="resize-guide-heading"
          className="text-3xl md:text-4xl font-black mb-4"
        >
          How to Resize an Image Online for Free
        </h2>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-8">
          MeetTools is an online image resizer that helps you change image
          dimensions, reduce file size, and prepare pictures for different
          platforms. Resize images in pixels for websites, social media,
          email, and online applications without installing desktop software.
        </p>

        <h3 className="text-xl font-black mb-4">
          How to Resize an Image in 4 Steps
        </h3>

        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="bg-white rounded-2xl border-2 border-[#fb8500]/20 p-5"
            >
              <p className="font-bold">
                <span className="text-[#c2410c]">
                  {index + 1}.
                </span>{" "}
                {step.title}
              </p>

              <p className="text-sm text-[#555555] mt-1 leading-relaxed">
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        <h3 className="text-xl font-black mt-8 mb-3">
          Why Resize Images?
        </h3>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed">
          Resizing an image changes its width and height to match your
          requirements. Smaller dimensions can help prepare images for
          websites, profile pictures, email attachments, and online forms.
          Reducing image dimensions and adjusting quality can also help
          lower file size, although the final size depends on the image
          and output format.
        </p>
      </div>
    </section>
  );
}
