"use client";

import { useEffect, useState } from "react";

export default function PdfPreview({ url, scale = 0.9 }: {
  url: string;
  scale?: number;
}) {
  const [ViewerComp, setViewerComp] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { Worker, Viewer } = await import("@react-pdf-viewer/core");
      await import("@react-pdf-viewer/core/lib/styles/index.css");

      setViewerComp(() => ({ Worker, Viewer }));
    })();
  }, []);

  if (!ViewerComp || !url) return null;

  const { Worker, Viewer } = ViewerComp;

  return (
    <div className="bg-black w-[85%] h-[85%] rounded-lg">
      <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
        <Viewer fileUrl={url} defaultScale={scale} />
      </Worker>
    </div>
  );
}
