const steps = [
  {
    title: "Upload your image",
    text: "Drop a JPG, PNG or WebP file into the tool. No signup is needed to get started.",
  },
  {
    title: "Choose size and format",
    text: "Enter the width and height you need, pick an output format such as WebP or AVIF, and optionally set a target file size in KB.",
  },
  {
    title: "Download the result",
    text: "Adjust the quality, click Resize & Compress Image, then download your resized image.",
  },
];

export default function ResizeGuide() {
  return (
    <section className="w-full bg-[#fff3ec] font-sans text-[#121212] pt-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          Free Online Image Resizer
        </h2>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-8">
          MeetTools lets you resize, compress and convert images online
          without installing anything. Reduce image dimensions for websites,
          social media and email, shrink file size, and export modern formats
          like WebP and AVIF.
        </p>

        <h3 className="text-xl font-black mb-4">How to resize an image</h3>

        <ol className="space-y-3">
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
      </div>
    </section>
  );
}