// app/api/invoice/[order_id]/route.tsx

import { NextResponse } from "next/server";
import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/downloadTemplate";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ order_id: string }> }  // ✅ Next.js 15: params is a Promise
) {
  try {
    const { order_id } = await params;  // ✅ must await before accessing

    if (!order_id) {
      return NextResponse.json(
        { error: "No order id provided" },
        { status: 400 }
      );
    }

    const [orderRes, officeRes] = await Promise.all([
      axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/order-operations?id=${order_id}`
      ),
      axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/office-operations`
      ),
    ]);

    const order = orderRes?.data?.data?.[0];
    const office = officeRes?.data?.data;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const blob = await pdf(
      <InvoiceTemplate data={{ order, office }} />
    ).toBlob();

    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Invoice_${order_id}.pdf`,
      },
    });

  } catch (error) {
    console.error("PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}