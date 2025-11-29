"use client";

import { useEffect, useState } from "react";

export default function PdfPreview({ url, scale = 0.9 }: { url: string; scale?: number }) {
    const [ViewerLib, setViewerLib] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const core = await import("@react-pdf-viewer/core");
            await import("@react-pdf-viewer/core/lib/styles/index.css");
            setViewerLib(core);
        })();
    }, []);

    if (!ViewerLib) return null;
    const { Worker, Viewer } = ViewerLib;

    return (
        <div className="bg-black w-[85%] h-[85%] max-md:w-[90%] max-md:h-[90%] rounded-lg overflow-hidden">
            <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                <Viewer fileUrl={url} defaultScale={scale} theme={{ theme: "dark" }} />
            </Worker>
        </div>
    );
}
