"use client";

import { useEffect, useState } from "react";

interface PdfPreviewProps {
  url: string;
  scale?: number;
}

export default function PdfPreview({ url, scale = 0.9 }: PdfPreviewProps) {
    const [viewerLib, setViewerLib] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const lib = await import("@react-pdf-viewer/core");
            await import("@react-pdf-viewer/core/lib/styles/index.css");
            setViewerLib(lib);
        })();
    }, []);

    if (!viewerLib) return null;

    const { Worker, Viewer } = viewerLib;

    return (
        <div className="bg-black w-[85%] h-[85%] rounded-lg overflow-hidden">
            <div className="p-2 w-full h-full bg-black">
                <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                    <Viewer fileUrl={url} defaultScale={scale} theme={{ theme: "dark" }}/>
                </Worker>
            </div>
        </div>
    );
}
