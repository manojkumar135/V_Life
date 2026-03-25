// app/api/invoices/download/route.tsx

import { NextResponse } from "next/server";
import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/downloadTemplate";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ordersParam = searchParams.get("orders");

    if (!ordersParam) {
      return NextResponse.json(
        { error: "No order ids provided" },
        { status: 400 }
      );
    }

    const orderIds = ordersParam.split(",");

    // ✅ Fetch office ONCE — not inside the loop
    const officeRes = await axios.get(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/office-operations`
    );
    const office = officeRes?.data?.data;

    const invoicesData: any[] = [];

    for (const order_id of orderIds) {
      try {
        const orderRes = await axios.get(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/order-operations?id=${order_id}`
        );

        const order = orderRes?.data?.data?.[0];
        if (!order) continue;

        invoicesData.push({ order, office });

      } catch (err) {
        console.error("Skipping order:", order_id);
      }
    }

    // ✅ ONE merged PDF with all invoices — each invoice on its own page
    const blob = await pdf(
      <InvoiceTemplate data={invoicesData} isBulk />
    ).toBlob();

    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=all_invoices.pdf`,
      },
    });

  } catch (error) {
    console.error("Merged PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate merged PDF" },
      { status: 500 }
    );
  }
}