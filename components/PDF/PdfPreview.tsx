"use client";

import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

export default function PdfPreview({
  url,
  scale = 0.9,
}: {
  url: string;
  scale?: number;
}) {
  if (!url) return null;

  return (
    <div className="bg-black w-[85%] h-[85%] max-md:w-[90%] max-md:h-[90%] rounded-lg overflow-hidden">
            <div className="p-2 max-lg:p-0 w-full h-full bg-black rounded-lg">
    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
      <Viewer
        fileUrl={url}
        defaultScale={scale}
        theme={{ theme: "dark" }}
      />
    </Worker>
    </div>
    </div>
  );
}
