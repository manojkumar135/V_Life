"use client";

import { useEffect, useState } from "react";

export default function PdfPreview({ url }: { url: string }) {
  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    if (!url) return;

    const load = async () => {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      const pdf = await pdfjsLib.getDocument(url).promise;

      const imgs: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); // Good quality

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx!, viewport }).promise;

        imgs.push(canvas.toDataURL("image/png"));
      }

      setPages(imgs);
    };

    load();
  }, [url]);

  if (!url) return null;

  return (
    <div className="flex flex-col gap-4 overflow-auto max-h-[90vh] p-4 bg-black">
      {pages.map((src, idx) => (
        <img
          key={idx}
          src={src}
          className="w-full rounded-md shadow-lg"
          alt={`Page ${idx + 1}`}
        />
      ))}
    </div>
  );
}
