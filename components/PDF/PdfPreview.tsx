"use client";

interface Props {
  url: string;
  scale?: number;
}

export default function PdfPreview({ url }: Props) {
  return (
    <div className="bg-black w-[85%] h-[85%] rounded-lg overflow-hidden">
      <embed
        src={url}
        type="application/pdf"
        className="w-full h-full"
      />
    </div>
  );
}
