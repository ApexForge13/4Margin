import { Resend } from "resend";

const FROM_EMAIL = "DecodeCoverage <reports@decodecoverage.com>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPolicyReport(opts: {
  to: string;
  firstName: string;
  pdfBuffer: Buffer;
  filename: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: "Your Policy Analysis Report — DecodeCoverage",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1A1A1A; margin-bottom: 16px;">
            Hi ${opts.firstName}, your report is ready!
          </h1>
          <p style="font-size: 16px; color: #5A5A5A; line-height: 1.6; margin-bottom: 24px;">
            Your homeowners insurance policy has been analyzed by our AI.
            Your full Policy Analysis Report is attached as a PDF.
          </p>
          <p style="font-size: 14px; color: #8A8A8A; line-height: 1.5; margin-bottom: 32px;">
            This analysis is for educational purposes only and does not constitute
            insurance or legal advice. Always consult a licensed professional.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E5E0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #8A8A8A;">
            Powered by <a href="https://4margin.com" style="color: #1B6B4A;">4Margin</a>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: opts.filename,
          content: opts.pdfBuffer,
        },
      ],
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send policy report:", err);
    return { success: false, error: err };
  }
}
