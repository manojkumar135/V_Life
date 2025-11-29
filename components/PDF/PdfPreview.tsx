"use client";

import PdfViewerClient from "@/components/PDF/PdfViewerClient";

export default function PdfPreview({ url, scale }: { url: string; scale?: number }) {
    return (
        <div className="bg-black w-[85%] h-[85%] rounded-lg overflow-hidden">
            <div className="p-2 w-full h-full bg-black">
                <PdfViewerClient url={url} scale={scale} />
            </div>
        </div>
    );
}
