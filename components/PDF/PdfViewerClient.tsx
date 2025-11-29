"use client";

import { useEffect, useState } from "react";

export default function PdfViewerClient({ url, scale = 0.9 }: { url: string; scale?: number }) {
    const [lib, setLib] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const mod = await import("@react-pdf-viewer/core");
            await import("@react-pdf-viewer/core/lib/styles/index.css");
            setLib(mod);
        })();
    }, []);

    if (!lib) return null;

    const { Worker, Viewer } = lib;

    return (
        <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
            <Viewer fileUrl={url} defaultScale={scale} theme={{ theme: "dark" }} />
        </Worker>
    );
}
