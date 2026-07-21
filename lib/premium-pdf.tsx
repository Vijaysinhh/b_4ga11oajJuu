"use client";

import { pdf } from "@react-pdf/renderer";
import { PremiumPdfReport } from "@/components/PremiumPdfReport";
import type { PremiumReportData } from "./simple-pdf";

export async function downloadPremiumPdf(
  data: PremiumReportData,
  fileName: string = `dukan-report-premium-${Date.now()}.pdf`,
) {
  try {
    console.info("downloadPremiumPdf: generating premium PDF", { fileName });
    const blob = await pdf(<PremiumPdfReport data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    console.info("downloadPremiumPdf: premium PDF download triggered", { fileName });
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (error) {
    console.error("Error downloading premium PDF:", error);
    // Fallback to simple PDF if premium fails
    throw error;
  }
}
