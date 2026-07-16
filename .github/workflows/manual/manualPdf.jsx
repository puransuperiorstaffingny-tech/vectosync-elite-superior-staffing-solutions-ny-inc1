// PDF builder for the Training Manual — extracted from pages/TrainingManual.
import jsPDF from "jspdf";
import { COMPANY, LOGO_URL } from "@/components/manual/manualData";

// ── Image loading for PDF ────────────────────────────────────────────────────
async function loadImageAsDataURL(url, bgColor = "#ffffff") {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ dataURL: canvas.toDataURL("image/png", 1.0), w: canvas.width, h: canvas.height });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── PDF builder ──────────────────────────────────────────────────────────────
export async function buildPDF(type, sections, onProgress) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;
  let y = 0;

  const isAdmin = type === "admin";
  const role = isAdmin ? "ADMIN" : "EMPLOYEE";

  // Gold + Navy palette
  const gold1R = 194, gold1G = 148, gold1B = 14;
  const gold2R = 218, gold2G = 182, gold2B = 60;
  const gold3R = 248, gold3G = 215, gold3B = 110;
  const navyR  = 10,  navyG  = 22,  navyB  = 60;
  const navy2R = 18,  navy2G = 38,  navy2B = 90;
  const navy3R = 28,  navy3G = 55,  navy3B = 120;
  const creamR = 245, creamG = 248, creamB = 255;

  const logoData = await loadImageAsDataURL(LOGO_URL, `rgb(${navyR},${navyG},${navyB})`);

  function drawCoverBg() {
    doc.setFillColor(navyR, navyG, navyB);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.triangle(0, pageH * 0.68, pageW * 0.62, pageH, 0, pageH, "F");
    doc.setFillColor(gold2R, gold2G, gold2B);
    doc.triangle(0, pageH * 0.60, pageW * 0.50, pageH, 0, pageH * 0.68, "F");
    doc.setFillColor(gold3R, gold3G, gold3B);
    doc.triangle(0, pageH * 0.56, pageW * 0.38, pageH, 0, pageH * 0.60, "F");
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.triangle(pageW, 0, pageW, pageH * 0.18, pageW * 0.72, 0, "F");
    doc.setFillColor(gold2R, gold2G, gold2B);
    doc.triangle(pageW, pageH * 0.18, pageW, pageH * 0.28, pageW * 0.58, 0, "F");
    doc.setFillColor(navyR, navyG, navyB);
    doc.rect(0, 0, pageW, pageH * 0.56, "F");
    doc.setFillColor(navy2R, navy2G, navy2B);
    doc.triangle(0, pageH * 0.56, pageW * 0.55, pageH * 0.56, 0, pageH * 0.64, "F");
  }

  function drawSweepLines() {
    for (let i = 0; i < 6; i++) {
      doc.setDrawColor(gold3R, gold3G, gold3B);
      doc.setLineWidth(Math.max(0.08, 0.7 - i * 0.1));
      doc.line(0, pageH * (0.56 - i * 0.028), pageW * (0.65 + i * 0.05), pageH * (0.56 - i * 0.028) - 30);
    }
    for (let i = 0; i < 5; i++) {
      doc.setDrawColor(gold2R, gold2G, gold2B);
      doc.setLineWidth(Math.max(0.08, 0.5 - i * 0.08));
      doc.line(pageW * (0.55 + i * 0.04), pageH, pageW, pageH * (0.72 - i * 0.06));
    }
    doc.setDrawColor(255, 245, 160);
    doc.setLineWidth(1.4);
    doc.line(0, pageH * 0.565, pageW * 0.70, pageH * 0.565);
    doc.setLineWidth(0.5);
    doc.setDrawColor(gold1R, gold1G, gold1B);
    doc.line(0, pageH * 0.572, pageW * 0.55, pageH * 0.572);
  }

  function drawSparkles(scale = 1) {
    const dots = [
      [pageW*0.08, pageH*0.58, 3],   [pageW*0.14, pageH*0.70, 1.8],
      [pageW*0.20, pageH*0.63, 3.5], [pageW*0.82, pageH*0.54, 2.2],
      [pageW*0.89, pageH*0.63, 1.8], [pageW*0.76, pageH*0.71, 3],
      [pageW*0.50, pageH*0.80, 2.2], [pageW*0.62, pageH*0.76, 1.6],
      [pageW*0.33, pageH*0.74, 2.4], [pageW*0.91, pageH*0.42, 1.8],
      [pageW*0.05, pageH*0.45, 1.5], [pageW*0.95, pageH*0.78, 1.5],
      [pageW*0.55, pageH*0.88, 2],   [pageW*0.25, pageH*0.85, 1.5],
    ];
    doc.setFillColor(255, 245, 180);
    dots.forEach(([x, y2, r]) => doc.circle(x, y2, r * scale, "F"));
    doc.setFillColor(navy3R, navy3G, navy3B);
    [[pageW*0.42, pageH*0.72, 1.2],[pageW*0.68, pageH*0.80, 1],[pageW*0.18, pageH*0.78, 1]].forEach(([x,y2,r]) => doc.circle(x,y2,r*scale,"F"));
  }

  function drawPageSparkles() {
    const dots = [
      [pageW - margin + 8, 45, 2],
      [pageW - margin + 16, 38, 1.2],
      [margin - 12, pageH - 40, 1.5],
      [pageW - margin + 12, pageH - 50, 1.8],
    ];
    doc.setFillColor(gold2R, gold2G, gold2B);
    dots.forEach(([x, y2, r]) => doc.circle(x, y2, r, "F"));
  }

  function drawInteriorPageBg() {
    doc.setFillColor(creamR, creamG, creamB);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(navyR, navyG, navyB);
    doc.rect(0, 0, 7, pageH, "F");
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.rect(7, 0, 3, pageH, "F");
    doc.setFillColor(navyR, navyG, navyB);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.rect(0, 28, pageW, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(gold3R, gold3G, gold3B);
    doc.setFont("helvetica", "bold");
    doc.text("VECTOSYNC ELITE+ — PATSL DEVELOPER LLC", margin, 19);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 255);
    doc.text(`${role} TRAINING MANUAL`, pageW - margin, 19, { align: "right" });
  }

  function drawPageFooter() {
    const pg = doc.internal.getCurrentPageInfo().pageNumber;
    doc.setFillColor(navyR, navyG, navyB);
    doc.rect(0, pageH - 30, pageW, 30, "F");
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.rect(0, pageH - 30, pageW, 2.5, "F");
    doc.setFontSize(7);
    doc.setTextColor(gold3R, gold3G, gold3B);
    doc.setFont("helvetica", "normal");
    doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY", margin, pageH - 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Page ${pg}`, pageW - margin, pageH - 10, { align: "right" });
  }

  function newPage() {
    doc.addPage();
    y = margin + 10;
    drawInteriorPageBg();
    drawPageFooter();
    drawPageSparkles();
  }

  function checkPage(needed = 40) {
    if (y + needed > pageH - 56) newPage();
  }

  // ── COVER PAGE ──
  drawCoverBg();
  drawSweepLines();
  drawSparkles();

  if (logoData) {
    const maxLogoW = pageW * 0.72;
    const maxLogoH = pageH * 0.42;
    const ratio = Math.min(maxLogoW / logoData.w, maxLogoH / logoData.h);
    const lw = logoData.w * ratio;
    const lh = logoData.h * ratio;
    doc.addImage(logoData.dataURL, "PNG", pageW / 2 - lw / 2, pageH * 0.06, lw, lh, undefined, "FAST");
  }

  const divY = pageH * 0.56;
  doc.setDrawColor(255, 240, 160);
  doc.setLineWidth(1.5);
  doc.line(margin * 2, divY, pageW - margin * 2, divY);
  doc.setLineWidth(0.5);
  doc.setDrawColor(180, 130, 10);
  doc.line(margin * 2.5, divY + 5, pageW - margin * 2.5, divY + 5);

  const badgeY = divY + 22;
  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(pageW / 2 - 100, badgeY, 200, 28, 5, 5, "F");
  doc.setFillColor(gold1R, gold1G, gold1B);
  doc.roundedRect(pageW / 2 - 98, badgeY + 2, 196, 24, 4, 4, "F");
  doc.setFontSize(11);
  doc.setTextColor(navyR, navyG, navyB);
  doc.setFont("helvetica", "bold");
  doc.text(`${role} TRAINING MANUAL`, pageW / 2, badgeY + 18, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(255, 248, 200);
  doc.setFont("helvetica", "normal");
  doc.text("Complete Step-by-Step Visual Guide", pageW / 2, badgeY + 44, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(255, 240, 150);
  doc.text(
    `${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}   |   ${sections.length} Sections`,
    pageW / 2, badgeY + 62, { align: "center" }
  );

  doc.setFillColor(navyR, navyG, navyB);
  doc.rect(0, pageH - 48, pageW, 48, "F");
  doc.setFillColor(gold1R, gold1G, gold1B);
  doc.rect(0, pageH - 48, pageW, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(gold3R, gold3G, gold3B);
  doc.setFont("helvetica", "bold");
  doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY", pageW / 2, pageH - 26, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 185, 255);
  doc.text("VectoSync Elite+ — PATSL Developer LLC", pageW / 2, pageH - 12, { align: "center" });

  // ── TABLE OF CONTENTS ──
  newPage();
  y = 50;
  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(margin, y - 14, contentW, 36, 4, 4, "F");
  doc.setFillColor(gold1R, gold1G, gold1B);
  doc.roundedRect(margin, y + 20, contentW, 3, 0, 0, "F");
  doc.setFontSize(15);
  doc.setTextColor(gold3R, gold3G, gold3B);
  doc.setFont("helvetica", "bold");
  doc.text("TABLE OF CONTENTS", pageW / 2, y + 8, { align: "center" });
  y += 38;

  sections.forEach((sec, idx) => {
    checkPage(22);
    if (idx % 2 === 0) {
      doc.setFillColor(255, 250, 220);
      doc.rect(margin - 4, y - 12, contentW + 8, 20, "F");
    }
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.circle(margin + 8, y - 2, 7, "F");
    doc.setFontSize(7);
    doc.setTextColor(navyR, navyG, navyB);
    doc.setFont("helvetica", "bold");
    doc.text(String(idx + 1), margin + 8, y + 0.5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 30, 5);
    const titleText = sec.title.replace(/^\d+\.\s*/, "");
    doc.text(titleText, margin + 22, y);
    doc.setTextColor(180, 150, 60);
    const titleW = doc.getTextWidth(titleText);
    const pgNum = String(idx + 3);
    const pgW = doc.getTextWidth(pgNum);
    let dotX = margin + 22 + titleW + 4;
    const dotEnd = pageW - margin - 4 - pgW - 4;
    while (dotX < dotEnd) { doc.text(".", dotX, y); dotX += 5; }
    doc.setTextColor(gold1R, gold1G, gold1B);
    doc.setFont("helvetica", "bold");
    doc.text(pgNum, pageW - margin - 4, y, { align: "right" });
    y += 20;
  });

  // ── SECTION PAGES ──
  const totalSections = sections.length;
  for (let si = 0; si < totalSections; si++) {
    const sec = sections[si];
    if (onProgress) onProgress(Math.round(((si + 1) / totalSections) * 90));
    newPage();

    doc.setFillColor(navyR, navyG, navyB);
    doc.roundedRect(margin - 8, y - 16, contentW + 16, 36, 4, 4, "F");
    doc.setFillColor(gold1R, gold1G, gold1B);
    doc.roundedRect(margin - 8, y - 16, 8, 36, 2, 2, "F");
    doc.setFillColor(gold2R, gold2G, gold2B);
    doc.rect(margin - 8, y + 18, contentW + 16, 2, "F");
    doc.setFontSize(11.5);
    doc.setTextColor(gold3R, gold3G, gold3B);
    doc.setFont("helvetica", "bold");
    const cleanTitle = sec.title.replace(/[^\x00-\x7F]/g, "");
    const headerLines = doc.splitTextToSize(cleanTitle, contentW - 24);
    doc.text(headerLines[0], margin + 8, y + 4);
    y += 32;

    for (const imgData of sec.images) {
      const loaded = await loadImageAsDataURL(imgData.url);
      if (loaded) {
        const maxW = contentW;
        const maxH = 200;
        const ratio = Math.min(maxW / loaded.w, maxH / loaded.h, 1);
        const iw = loaded.w * ratio;
        const ih = loaded.h * ratio;
        checkPage(ih + 50);
        doc.setFillColor(gold1R, gold1G, gold1B);
        doc.roundedRect(margin + (contentW - iw) / 2 - 3, y - 3, iw + 6, ih + 6, 3, 3, "F");
        doc.addImage(loaded.dataURL, "JPEG", margin + (contentW - iw) / 2, y, iw, ih, undefined, "FAST");
        y += ih + 8;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(gold1R, gold1G, gold1B);
        const plainCaption = imgData.caption.replace(/[^\x00-\x7F]/g, "");
        const capLines = doc.splitTextToSize(plainCaption, contentW - 20);
        capLines.forEach(l => { checkPage(13); doc.text(l, pageW / 2, y, { align: "center" }); y += 12; });
        y += 8;
      } else {
        checkPage(36);
        doc.setFillColor(255, 248, 210);
        doc.setDrawColor(gold2R, gold2G, gold2B);
        doc.roundedRect(margin, y, contentW, 28, 3, 3, "FD");
        doc.setFontSize(8);
        doc.setTextColor(gold1R, gold1G, gold1B);
        doc.setFont("helvetica", "italic");
        const plainCaption = imgData.caption.replace(/[^\x00-\x7F]/g, "");
        doc.text(`[Screenshot: ${plainCaption}]`, pageW / 2, y + 17, { align: "center" });
        y += 38;
      }
    }

    y += 4;
    const bulletIndent = 26;
    const bulletTextW = contentW - bulletIndent - 4;

    sec.content.forEach((bullet, bi) => {
      const cleanBullet = bullet.replace(/[^\x00-\x7F]/g, "");
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(cleanBullet, bulletTextW);
      const lineH = 14;
      const blockH = lines.length * lineH + 12;
      checkPage(blockH + 4);

      doc.setFillColor(bi % 2 === 0 ? 245 : 235, bi % 2 === 0 ? 247 : 240, 255);
      doc.roundedRect(margin - 2, y - 9, contentW + 4, blockH, 2, 2, "F");
      if (bi % 2 === 0) doc.setFillColor(navyR, navyG, navyB);
      else doc.setFillColor(gold1R, gold1G, gold1B);
      doc.rect(margin - 2, y - 9, 3.5, blockH, "F");

      const badgeCX = margin + 10;
      const badgeCY = y + 0.5;
      if (bi % 2 === 0) doc.setFillColor(navyR, navyG, navyB);
      else doc.setFillColor(gold1R, gold1G, gold1B);
      doc.circle(badgeCX, badgeCY, 7.5, "F");
      doc.setFontSize(7);
      doc.setTextColor(bi % 2 === 0 ? gold3R : navyR, bi % 2 === 0 ? gold3G : navyG, bi % 2 === 0 ? gold3B : navyB);
      doc.setFont("helvetica", "bold");
      doc.text(String(bi + 1), badgeCX, badgeCY + 2.5, { align: "center" });

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(navyR, navy2G, 55);
      lines.forEach((line, li) => { checkPage(lineH); doc.text(line, margin + bulletIndent, y + li * lineH); });
      y += blockH;
    });
  }

  // ── BACK / FINAL PAGE ──
  doc.addPage();
  drawCoverBg();
  drawSweepLines();
  drawSparkles();

  if (logoData) {
    const maxW = pageW * 0.68, maxH = pageH * 0.38;
    const ratio = Math.min(maxW / logoData.w, maxH / logoData.h);
    const lw = logoData.w * ratio, lh = logoData.h * ratio;
    doc.addImage(logoData.dataURL, "PNG", pageW / 2 - lw / 2, pageH * 0.07, lw, lh, undefined, "FAST");
  }

  const backDivY = pageH * 0.565;
  doc.setDrawColor(255, 245, 160);
  doc.setLineWidth(1.5);
  doc.line(0, backDivY, pageW * 0.70, backDivY);
  doc.setLineWidth(0.5);
  doc.setDrawColor(gold1R, gold1G, gold1B);
  doc.line(0, backDivY + 7, pageW * 0.55, backDivY + 7);

  const backBadgeY = backDivY + 22;
  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(pageW / 2 - 120, backBadgeY, 240, 30, 5, 5, "F");
  doc.setFillColor(gold1R, gold1G, gold1B);
  doc.roundedRect(pageW / 2 - 118, backBadgeY + 2, 236, 26, 4, 4, "F");
  doc.setFontSize(12);
  doc.setTextColor(navyR, navyG, navyB);
  doc.setFont("helvetica", "bold");
  doc.text("END OF TRAINING MANUAL", pageW / 2, backBadgeY + 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(255, 248, 200);
  doc.setFont("helvetica", "normal");
  doc.text(`${role} Edition  ·  ${sections.length} Sections Covered`, pageW / 2, backBadgeY + 46, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(255, 240, 150);
  doc.text("For questions or support, contact your HR Administrator.", pageW / 2, backBadgeY + 64, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(gold2R, gold2G, gold2B);
  doc.text("VectoSync Elite+ by PATSL Developer LLC", pageW / 2, backBadgeY + 80, { align: "center" });

  const licY = backBadgeY + 106;
  doc.setFillColor(navyR + 8, navyG + 15, navyB + 30);
  doc.roundedRect(margin, licY - 10, contentW, 56, 4, 4, "F");
  doc.setFillColor(gold1R, gold1G, gold1B);
  doc.rect(margin, licY - 10, contentW, 2.5, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(gold3R, gold3G, gold3B);
  doc.text(`\u00A9 2026 ${COMPANY} \u2014 All Rights Reserved.`, pageW / 2, licY + 8, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 255);
  doc.text("Proprietary & Confidential Software. Unauthorized use, copying, or distribution is strictly prohibited.", pageW / 2, licY + 22, { align: "center" });
  doc.text("VectoSync(tm) is a trademark of PATSL Developer LLC. This document contains trade secrets and confidential information belonging exclusively to PATSL Developer LLC.", pageW / 2, licY + 33, { align: "center" });
  doc.text("No portion of this manual may be reproduced or transmitted without prior written consent. Governed by the laws of New York.", pageW / 2, licY + 44, { align: "center" });

  doc.setFillColor(navyR, navyG, navyB);
  doc.rect(0, pageH - 48, pageW, 48, "F");
  doc.setFillColor(gold1R, gold1G, gold1B);
  doc.rect(0, pageH - 48, pageW, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(gold3R, gold3G, gold3B);
  doc.setFont("helvetica", "bold");
  doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY", pageW / 2, pageH - 26, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 185, 255);
  doc.text("VectoSync Elite+ — PATSL Developer LLC", pageW / 2, pageH - 12, { align: "center" });

  if (onProgress) onProgress(100);
  return doc;
}

// ── AI Refresh ──────────────────────────────────────────────────────────────
export async function aiRefreshSections(type, base44, featuresSummary) {
  const role = type === "admin" ? "Admin" : "Employee";
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a technical writer updating a training manual for "${role}" users of an HR/Payroll web application.

Here is the current complete list of app features:
${featuresSummary}

Generate an updated ${role} Training Manual as a JSON array of sections. Each section has:
- "title": string like "1. Feature Name — Brief Description"
- "content": array of 6-10 strings, each a clear step or fact about that feature (no markdown, plain text only, max 200 chars each)

${type === "admin"
  ? "Cover ALL admin features. Be detailed and practical — what to click, what each button/tab does, what each stat means."
  : "Cover all employee-facing features only (portal). Focus on what employees can see and do. Keep it simple and friendly for non-technical staff."
}

Return ONLY valid JSON. No explanation. No markdown fences. Just the raw JSON array.`,
    response_json_schema: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });
  return result?.sections || [];
}