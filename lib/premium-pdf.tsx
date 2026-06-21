"use client";

import { pdf } from "@react-pdf/renderer";
import { PremiumPdfReport } from "@/components/PremiumPdfReport";
import type { PremiumReportData } from "./simple-pdf";

export async function downloadPremiumPdf(data: PremiumReportData, fileName: string = `dukan-report-${Date.now()}.pdf`) {
  try {
    const blob = await pdf(<PremiumPdfReport data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading premium PDF:", error);
    // Fallback to simple PDF if premium fails
    throw error;
  }
}
