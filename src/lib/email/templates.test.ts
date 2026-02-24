import { describe, it, expect } from "vitest";
import {
  supplementReadyEmail,
  paymentConfirmationEmail,
  welcomeEmail,
  pipelineErrorEmail,
} from "./templates";

describe("supplementReadyEmail", () => {
  it("generates subject and html", () => {
    const { subject, html } = supplementReadyEmail({
      userName: "John",
      claimNumber: "CLM-001",
      propertyAddress: "123 Main St",
      itemCount: 5,
      supplementTotal: 4250,
      supplementUrl: "https://app.4margin.com/dashboard/supplements/abc",
      isFree: false,
    });

    expect(subject).toContain("CLM-001");
    expect(subject).toContain("$4,250.00");
    expect(html).toContain("John");
    expect(html).toContain("5 missing line items");
    expect(html).toContain("$4,250.00");
    expect(html).toContain("View & Unlock Supplement");
    expect(html).not.toContain("first supplement is on us");
  });

  it("shows free badge when isFree", () => {
    const { html } = supplementReadyEmail({
      userName: "Jane",
      claimNumber: "CLM-002",
      propertyAddress: "456 Oak Ave",
      itemCount: 3,
      supplementTotal: 2000,
      supplementUrl: "https://app.4margin.com/dashboard/supplements/xyz",
      isFree: true,
    });

    expect(html).toContain("View Your Free Supplement");
    expect(html).toContain("first supplement is on us");
  });

  it("handles singular item count", () => {
    const { html } = supplementReadyEmail({
      userName: "Bob",
      claimNumber: "CLM-003",
      propertyAddress: "789 Elm",
      itemCount: 1,
      supplementTotal: 500,
      supplementUrl: "http://localhost:3000/dashboard/supplements/abc",
      isFree: false,
    });

    expect(html).toContain("1 missing line item");
    expect(html).not.toContain("1 missing line items");
  });
});

describe("paymentConfirmationEmail", () => {
  it("generates payment confirmation", () => {
    const { subject, html } = paymentConfirmationEmail({
      userName: "John",
      claimNumber: "CLM-001",
      propertyAddress: "123 Main St",
      amount: 149,
      supplementUrl: "https://app.4margin.com/dashboard/supplements/abc",
    });

    expect(subject).toContain("Payment Confirmed");
    expect(subject).toContain("$149.00");
    expect(html).toContain("$149.00");
    expect(html).toContain("Download Supplement");
  });
});

describe("welcomeEmail", () => {
  it("generates welcome email", () => {
    const { subject, html } = welcomeEmail({
      userName: "Sarah",
      companyName: "Star Roofing",
    });

    expect(subject).toContain("Welcome to 4Margin");
    expect(html).toContain("Sarah");
    expect(html).toContain("Star Roofing");
    expect(html).toContain("first supplement is free");
  });
});

describe("pipelineErrorEmail", () => {
  it("generates error notification", () => {
    const { subject, html } = pipelineErrorEmail({
      userName: "Mike",
      claimNumber: "CLM-999",
      supplementUrl: "https://app.4margin.com/dashboard/supplements/err",
    });

    expect(subject).toContain("Action Needed");
    expect(subject).toContain("CLM-999");
    expect(html).toContain("Mike");
    expect(html).toContain("re-uploading");
  });
});

describe("all templates include brand header", () => {
  it("includes 4MARGIN logo in every template", () => {
    const templates = [
      supplementReadyEmail({
        userName: "X", claimNumber: "", propertyAddress: "",
        itemCount: 0, supplementTotal: 0, supplementUrl: "", isFree: false,
      }),
      paymentConfirmationEmail({
        userName: "X", claimNumber: "", propertyAddress: "",
        amount: 0, supplementUrl: "",
      }),
      welcomeEmail({ userName: "X", companyName: "X" }),
      pipelineErrorEmail({ userName: "X", claimNumber: "", supplementUrl: "" }),
    ];

    for (const { html } of templates) {
      expect(html).toContain("#00BFFF"); // brand cyan
      expect(html).toContain("#39FF9E"); // brand green
      expect(html).toContain("4Margin");
    }
  });
});
