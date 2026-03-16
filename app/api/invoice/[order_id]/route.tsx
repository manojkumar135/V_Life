import { NextResponse } from "next/server";
import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/downloadTemplate";

export async function GET(
  req: Request,
  context: { params: Promise<{ order_id: string }> }
) {
  try {

    const { order_id } = await context.params; // ✅ FIX

    const orderRes = await axios.get(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/order-operations?id=${order_id}`
    );

    const order = orderRes?.data?.data?.[0];

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const officeRes = await axios.get(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/office-operations`
    );

    const office = officeRes?.data?.data;

    const pdfData = { order, office };

    const blob = await pdf(<InvoiceTemplate data={pdfData} />).toBlob();

    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Invoice_${order.order_id}.pdf`,
      },
    });

  } catch (err) {
    console.error("Invoice generation error:", err);

    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}