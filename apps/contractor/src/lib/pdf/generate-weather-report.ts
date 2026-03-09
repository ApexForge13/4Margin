/**
 * Premium Weather Verification Report PDF Generator
 *
 * Generates a carrier-ready PDF documenting historical weather conditions
 * at the property address on the date of loss. Includes:
 *  - Verdict banner (SEVERE / MODERATE / NO SIGNIFICANT)
 *  - Daily conditions summary with max wind, hail, precip
 *  - Storm events table
 *  - Hourly breakdown of the storm window
 *  - Data source attribution
 *
 * Uses the same jsPDF patterns, brand colors, and layout conventions
 * as generate-supplement.ts.
 */

import { jsPDF } from "jspdf";
import type { WeatherData, HourlyWeather, WeatherEvent } from "@/lib/weather/fetch-weather";
import type { StormReportData } from "@/lib/weather/fetch-storm-reports";

/* ─────── Types ─────── */

export interface WeatherReportPdfData {
  propertyAddress: string;
  dateOfLoss: string; // formatted, e.g. "January 15, 2024"
  claimNumber: string;
  companyName: string;
  weather: WeatherData;
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateWeatherReportPdf(
  data: WeatherReportPdfData
): ArrayBuffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const w = data.weather;

  // ── Helpers ──
  const checkPage = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const formatTime = (t: string) => {
    // "14:00:00" → "2:00 PM"
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  // ══════════════════════════════════════════════
  // PAGE 1: HEADER
  // ══════════════════════════════════════════════
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("WEATHER VERIFICATION REPORT", margin, y);
  y += 8;

  // Cyan accent line
  doc.setDrawColor(0, 191, 255);
  doc.setLineWidth(3);
  doc.line(margin, y, margin + 260, y);
  y += 20;

  // Company name
  if (data.companyName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.companyName, margin, y);
    y += 16;
  }

  // ── Claim info table ──
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PROPERTY & CLAIM INFORMATION", margin, y);
  y += 15;

  const infoFields = [
    ["Property Address", data.propertyAddress],
    ["Date of Loss", data.dateOfLoss],
    ["Claim #", data.claimNumber],
    [
      "Coordinates",
      w.latitude && w.longitude
        ? `${w.latitude.toFixed(4)}, ${w.longitude.toFixed(4)}`
        : "",
    ],
    ["Resolved Location", w.resolvedAddress],
    ["Data Source", "Visual Crossing Historical Weather API"],
  ].filter(([, v]) => v);

  doc.setFontSize(9);
  infoFields.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(label as string, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const valStr = value as string;
    if (valStr.length > 55) {
      const lines = doc.splitTextToSize(valStr, contentWidth * 0.55);
      doc.text(lines, margin + contentWidth * 0.38, y);
      y += lines.length * 11;
    } else {
      doc.text(valStr, margin + contentWidth * 0.38, y);
      y += 14;
    }
  });
  y += 10;

  // ══════════════════════════════════════════════
  // VERDICT BANNER
  // ══════════════════════════════════════════════
  const bannerHeight = 52;
  checkPage(bannerHeight + 20);

  if (w.verdict === "severe_confirmed") {
    doc.setFillColor(220, 38, 38); // red-600
    doc.setTextColor(255, 255, 255);
  } else if (w.verdict === "moderate_weather") {
    doc.setFillColor(245, 158, 11); // amber-500
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setFillColor(229, 231, 235); // gray-200
    doc.setTextColor(55, 65, 81);
  }

  doc.roundedRect(margin, y, contentWidth, bannerHeight, 4, 4, "F");

  // Verdict label
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const verdictLabel =
    w.verdict === "severe_confirmed"
      ? "SEVERE WEATHER CONFIRMED"
      : w.verdict === "moderate_weather"
        ? "MODERATE WEATHER DETECTED"
        : "NO SIGNIFICANT SEVERE WEATHER";
  doc.text(verdictLabel, margin + 16, y + 20);

  // Verdict detail
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const verdictLines = doc.splitTextToSize(w.verdictText, contentWidth - 32);
  doc.text(verdictLines.slice(0, 2), margin + 16, y + 34);

  doc.setTextColor(0, 0, 0);
  y += bannerHeight + 16;

  // NOAA/SPC verification tag below verdict banner
  if (w.verdict === "severe_confirmed" && w.verdictText.includes("NOAA/SPC")) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("(Verified by NOAA/SPC Local Storm Reports)", margin + 16, y - 6);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // ══════════════════════════════════════════════
  // NOAA/SPC CONFIRMED STORM REPORTS
  // ══════════════════════════════════════════════
  y = renderSpcSection(doc, w.stormReports, data.dateOfLoss, margin, contentWidth, pageWidth, y, checkPage);

  // ══════════════════════════════════════════════
  // DAILY CONDITIONS SUMMARY
  // ══════════════════════════════════════════════
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DAILY CONDITIONS SUMMARY", margin, y);
  y += 18;

  // Two-column grid of stats
  const stats = [
    ["Conditions", w.conditions],
    ["Description", w.description],
    ["High / Low Temp", `${Math.round(w.tempmax)}°F / ${Math.round(w.tempmin)}°F`],
    ["Avg Wind Speed", `${Math.round(w.windspeed)} mph`],
    ["Max Wind Gust", `${Math.round(w.maxWindGust)} mph`],
    ["Total Precipitation", `${w.precip.toFixed(2)} in`],
    [
      "Precipitation Type",
      w.preciptype?.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ") || "None",
    ],
    [
      "Hail",
      w.hailDetected
        ? w.hailSizeMax
          ? `DETECTED — up to ${w.hailSizeMax}" diameter`
          : "DETECTED"
        : "Not reported",
    ],
    ["Snowfall", `${w.snow.toFixed(1)} in`],
    ["Severe Risk Index", `${Math.round(w.severerisk)} / 100`],
    ["Humidity", `${Math.round(w.humidity)}%`],
    ["Barometric Pressure", `${w.pressure.toFixed(1)} mb`],
    ["Cloud Cover", `${Math.round(w.cloudcover)}%`],
    ["Visibility", `${w.visibility.toFixed(1)} mi`],
  ];

  doc.setFontSize(9);
  const halfWidth = contentWidth / 2;

  stats.forEach(([label, value], i) => {
    const col = i % 2;
    const xBase = margin + col * halfWidth;

    // Check for new page every 2 items
    if (col === 0) checkPage(18);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(label as string, xBase, y);

    doc.setFont("helvetica", "bold");
    // Highlight severe values
    const valStr = value as string;
    if (
      (label === "Hail" && w.hailDetected) ||
      (label === "Max Wind Gust" && w.maxWindGust >= 58)
    ) {
      doc.setTextColor(220, 38, 38); // red
    } else {
      doc.setTextColor(0, 0, 0);
    }

    const valX = xBase + halfWidth * 0.45;
    if (valStr.length > 28) {
      const lines = doc.splitTextToSize(valStr, halfWidth * 0.52);
      doc.text(lines, valX, y);
      if (col === 1) y += Math.max(14, lines.length * 10);
    } else {
      doc.text(valStr, valX, y);
      if (col === 1) y += 14;
    }
  });

  // If odd number of stats, bump y for the last unpaired one
  if (stats.length % 2 !== 0) y += 14;
  y += 10;

  // ══════════════════════════════════════════════
  // STORM EVENTS
  // ══════════════════════════════════════════════
  if (w.events.length > 0) {
    checkPage(60);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("STORM EVENTS", margin, y);
    y += 18;

    renderEventsTable(doc, w.events, margin, contentWidth, y, checkPage);
    // Estimate y advancement
    y += w.events.length * 28 + 20;
  }

  // ══════════════════════════════════════════════
  // PAGE 2+: HOURLY BREAKDOWN
  // ══════════════════════════════════════════════
  doc.addPage();
  y = margin;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);

  const hasStormWindow = w.stormWindow.length > 0;
  doc.text(
    hasStormWindow
      ? "HOURLY WEATHER DATA — STORM WINDOW"
      : "HOURLY WEATHER DATA — FULL DAY",
    margin,
    y
  );
  y += 8;
  doc.setDrawColor(0, 191, 255);
  doc.setLineWidth(3);
  doc.line(margin, y, margin + 280, y);
  y += 16;

  if (hasStormWindow) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Showing ${w.stormWindow.length} hour(s) with severe risk > 30, wind gusts > 40 mph, or hail activity.`,
      margin,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 16;
  }

  const hoursToShow = hasStormWindow ? w.stormWindow : w.hours;
  y = renderHourlyTable(doc, hoursToShow, margin, contentWidth, y, checkPage, w.maxWindGust);

  // ── Source disclaimer ──
  y += 20;
  checkPage(60);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  const disclaimer =
    "Weather station data from Visual Crossing. Storm reports from NOAA Storm Prediction Center " +
    "via Iowa Environmental Mesonet (mesonet.agron.iastate.edu). " +
    "Data reflects conditions recorded at the nearest weather station to the property address. " +
    "For official NOAA/NWS storm reports in this area, visit https://www.spc.noaa.gov/climo/reports/";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 9 + 8;

  doc.setFont("helvetica", "normal");
  doc.text(
    `Weather data fetched: ${w.fetchedAt ? new Date(w.fetchedAt).toLocaleString("en-US") : "N/A"}`,
    margin,
    y
  );

  // ══════════════════════════════════════════════
  // FOOTER on every page
  // ══════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${data.companyName}  |  ${data.generatedDate}`,
      margin,
      pageHeight - 25
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin - 50,
      pageHeight - 25
    );
  }

  return doc.output("arraybuffer");
}

/* ─────── Storm Events Table ─────── */

function renderEventsTable(
  doc: jsPDF,
  events: WeatherEvent[],
  margin: number,
  contentWidth: number,
  startY: number,
  checkPage: (n: number) => void
) {
  let y = startY;

  // Header
  const cols = [
    { label: "Time", x: margin, w: 70 },
    { label: "Event Type", x: margin + 75, w: 80 },
    { label: "Description", x: margin + 160, w: 220 },
    { label: "Size / Speed", x: margin + 390, w: 90 },
  ];

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 10, contentWidth, 16, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  cols.forEach((col) => doc.text(col.label, col.x + 2, y));
  y += 14;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  events.forEach((event) => {
    checkPage(30);

    doc.setTextColor(0, 0, 0);
    doc.text(event.datetime || "—", cols[0].x + 2, y);

    // Event type — red for hail/tornado
    const isHail = event.type.toLowerCase().includes("hail");
    const isTornado = event.type.toLowerCase().includes("tornado");
    if (isHail || isTornado) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
    }
    doc.text(
      event.type.charAt(0).toUpperCase() + event.type.slice(1),
      cols[1].x + 2,
      y
    );
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    // Description — wrap if long
    const desc =
      event.description.length > 50
        ? event.description.substring(0, 48) + "..."
        : event.description;
    doc.text(desc, cols[2].x + 2, y);

    // Size / speed
    const sizeStr = event.size
      ? `${event.size}" hail`
      : event.speed
        ? `${event.speed} mph`
        : "—";
    doc.text(sizeStr, cols[3].x + 2, y);

    y += 16;

    // Divider
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 6, margin + contentWidth, y - 6);
  });
}

/* ─────── NOAA/SPC Storm Reports Section ─────── */

function renderSpcSection(
  doc: jsPDF,
  stormReports: StormReportData | null,
  dateOfLoss: string,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  startY: number,
  checkPage: (n: number) => void
): number {
  let y = startY;

  // Section header bar — dark blue
  const headerBarHeight = 22;
  checkPage(headerBarHeight + 80);

  doc.setFillColor(12, 45, 72); // #0C2D48
  doc.rect(margin, y, contentWidth, headerBarHeight, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("NOAA/SPC CONFIRMED STORM REPORTS", margin + 10, y + 14);
  doc.setTextColor(0, 0, 0);
  y += headerBarHeight + 4;

  // Source attribution
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Source: NOAA Storm Prediction Center via Iowa Environmental Mesonet",
    margin,
    y + 8
  );
  doc.setTextColor(0, 0, 0);
  y += 16;

  const hasReports =
    stormReports && stormReports.reports && stormReports.reports.length > 0;

  if (!hasReports) {
    // ── No reports: muted box ──
    checkPage(50);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const noDataText =
      "No NOAA/SPC storm reports found within 50 miles of the property for this date. " +
      "This does not rule out localized storm activity — field inspection and contractor " +
      "documentation may provide additional evidence.";
    const noDataLines = doc.splitTextToSize(noDataText, contentWidth - 20);
    doc.text(noDataLines, margin + 10, y + 12);
    doc.setTextColor(0, 0, 0);
    y += 46;
    return y;
  }

  // ── Reports exist ──
  const reports = stormReports!.reports;
  const hailReports = stormReports!.hailReports;
  const windReports = stormReports!.windReports;
  const tornadoReports = stormReports!.tornadoReports;

  // Summary line
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(
    `${reports.length} confirmed storm report${reports.length !== 1 ? "s" : ""} within ${stormReports!.searchRadiusMiles} miles of the property on ${dateOfLoss}`,
    margin,
    y
  );
  y += 14;

  // Sub-summary: key findings
  doc.setFontSize(8.5);

  // Largest hail
  if (hailReports.length > 0) {
    const nearest = stormReports!.nearestHailReport;
    const maxHail = stormReports!.maxHailSize;
    if (maxHail !== null && nearest) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // red
      const hailText = `Largest confirmed hail: ${maxHail.toFixed(2)}" within ${nearest.distanceMiles} mi (${nearest.city}, ${nearest.county} ${nearest.state})`;
      doc.text(hailText, margin + 8, y);
      y += 12;
    }
  }

  // Maximum wind
  if (windReports.length > 0) {
    const nearest = stormReports!.nearestWindReport;
    const maxWind = stormReports!.maxWindSpeed;
    if (maxWind !== null && nearest) {
      doc.setFont("helvetica", "bold");
      if (maxWind >= 58) {
        doc.setTextColor(220, 38, 38); // red for severe
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.text(
        `Maximum confirmed wind: ${maxWind} mph within ${nearest.distanceMiles} mi`,
        margin + 8,
        y
      );
      y += 12;
    }
  }

  // Tornado
  if (tornadoReports.length > 0) {
    const nearest = tornadoReports[0]; // sorted by distance
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(
      `TORNADO CONFIRMED within ${nearest.distanceMiles} mi`,
      margin + 8,
      y
    );
    y += 12;
  }

  doc.setTextColor(0, 0, 0);
  y += 6;

  // ── Storm reports table ──
  const displayReports = reports.slice(0, 15); // max 15 rows

  const cols = [
    { label: "Type", x: margin, w: 62 },
    { label: "Size/Speed", x: margin + 62, w: 62 },
    { label: "Distance", x: margin + 124, w: 50 },
    { label: "Location", x: margin + 174, w: 135 },
    { label: "Time", x: margin + 309, w: 48 },
    { label: "Source", x: margin + 357, w: contentWidth - 357 + margin },
  ];

  // Table header
  checkPage(30);
  doc.setFillColor(12, 45, 72); // match section header
  doc.rect(margin, y - 10, contentWidth, 16, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  cols.forEach((col) => doc.text(col.label, col.x + 3, y));
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Table rows
  doc.setFontSize(7.5);

  displayReports.forEach((report, idx) => {
    checkPage(18);

    // Alternate row background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 9, contentWidth, 14, "F");
    }

    const isHail = report.type === "HAIL";
    const isWind = report.type === "TSTM_WND";
    const isTornado = report.type === "TORNADO";

    // Determine if this row should be red
    const isSevere =
      isTornado ||
      (isHail && report.magnitude !== null && report.magnitude >= 1.0) ||
      (isWind && report.magnitude !== null && report.magnitude >= 58);

    // Type column — use the readable IEM label (e.g. "NON-TSTM WND GST")
    const typeLabel = report.typeText || report.type;

    if (isSevere) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    }
    doc.text(typeLabel, cols[0].x + 3, y);

    // Size/Speed column — show magnitude when available for any report type
    let sizeStr = "—";
    if (report.magnitude !== null && report.magnitude !== undefined) {
      sizeStr = `${isHail ? report.magnitude.toFixed(2) : report.magnitude} ${report.unit || ""}`.trim();
    }

    if (isSevere) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    }
    doc.text(sizeStr, cols[1].x + 3, y);

    // Distance column
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${report.distanceMiles.toFixed(1)} mi`, cols[2].x + 3, y);

    // Location column
    const locationParts: string[] = [];
    if (report.city) locationParts.push(report.city);
    if (report.county) locationParts.push(report.county);
    if (report.state) locationParts.push(report.state);
    let location = locationParts.join(", ");
    if (location.length > 28) location = location.substring(0, 26) + "...";
    doc.text(location, cols[3].x + 3, y);

    // Time column — format ISO to HH:MM
    let timeStr = "—";
    if (report.timestamp) {
      try {
        const d = new Date(report.timestamp);
        const hh = d.getUTCHours().toString().padStart(2, "0");
        const mm = d.getUTCMinutes().toString().padStart(2, "0");
        timeStr = `${hh}:${mm}`;
      } catch {
        timeStr = "—";
      }
    }
    doc.text(timeStr, cols[4].x + 3, y);

    // Source column
    let sourceStr = report.source || "—";
    if (sourceStr.length > 18) sourceStr = sourceStr.substring(0, 16) + "...";
    doc.setFontSize(7);
    doc.text(sourceStr, cols[5].x + 3, y);
    doc.setFontSize(7.5);

    // Reset
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    y += 14;

    // Row divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 4, margin + contentWidth, y - 4);
  });

  // If more than 15, note the truncation
  if (reports.length > 15) {
    y += 4;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Showing 15 of ${reports.length} reports (sorted by proximity to property).`,
      margin,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  y += 10;
  return y;
}

/* ─────── Hourly Table ─────── */

function renderHourlyTable(
  doc: jsPDF,
  hours: HourlyWeather[],
  margin: number,
  contentWidth: number,
  startY: number,
  checkPage: (n: number) => void,
  maxGust: number
): number {
  let y = startY;

  const cols = [
    { label: "Time", x: margin, w: 55 },
    { label: "Temp", x: margin + 58, w: 40 },
    { label: "Wind", x: margin + 100, w: 42 },
    { label: "Gust", x: margin + 145, w: 42 },
    { label: "Precip", x: margin + 190, w: 42 },
    { label: "Type", x: margin + 235, w: 65 },
    { label: "Conditions", x: margin + 305, w: 110 },
    { label: "Risk", x: margin + 420, w: 45 },
  ];

  // Header row
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 10, contentWidth, 16, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  cols.forEach((col) => doc.text(col.label, col.x + 2, y));
  y += 12;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  hours.forEach((hour) => {
    checkPage(18);

    const hasHail = hour.preciptype?.includes("hail") ?? false;
    const highWind = (hour.windgust ?? 0) >= 58;
    const isHighlight = hasHail || highWind;

    // Highlight row background
    if (isHighlight) {
      doc.setFillColor(254, 226, 226); // red-100
      doc.rect(margin, y - 9, contentWidth, 14, "F");
    }

    doc.setTextColor(0, 0, 0);
    doc.text(formatTime12(hour.datetime), cols[0].x + 2, y);
    doc.text(`${Math.round(hour.temp)}°F`, cols[1].x + 2, y);
    doc.text(`${Math.round(hour.windspeed)}`, cols[2].x + 2, y);

    // Gust — red if ≥ 58
    if (highWind) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
    }
    doc.text(
      hour.windgust ? `${Math.round(hour.windgust)}` : "—",
      cols[3].x + 2,
      y
    );
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    doc.text(`${hour.precip.toFixed(2)}`, cols[4].x + 2, y);

    // Precip type — red for hail
    const typeStr = hour.preciptype
      ? hour.preciptype.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
      : "—";
    if (hasHail) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
    }
    doc.text(typeStr, cols[5].x + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const condStr =
      hour.conditions.length > 20
        ? hour.conditions.substring(0, 18) + "..."
        : hour.conditions;
    doc.text(condStr, cols[6].x + 2, y);

    // Severe risk — color coded
    const risk = Math.round(hour.severerisk);
    if (risk > 50) {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
    } else if (risk > 30) {
      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
    }
    doc.text(`${risk}`, cols[7].x + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    y += 14;

    // Row divider
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 4, margin + contentWidth, y - 4);
  });

  // Max gust callout
  if (maxGust > 0) {
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Peak Wind Gust:", margin, y);
    if (maxGust >= 58) doc.setTextColor(220, 38, 38);
    doc.text(`${Math.round(maxGust)} mph`, margin + 100, y);
    doc.setTextColor(0, 0, 0);
  }

  return y;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}
