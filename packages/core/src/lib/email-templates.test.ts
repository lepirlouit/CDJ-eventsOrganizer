import { describe, it, expect } from "vitest";
import {
  otpEmail,
  magicLinkEmail,
  broadcastEmail,
  contactDojoEmail,
  contactDojoConfirmationEmail,
  registrationConfirmedEmail,
} from "./email-templates.js";

describe("otpEmail", () => {
  it("includes the code and localizes the subject", () => {
    expect(otpEmail("en", "123456").subject).toContain("123456");
    expect(otpEmail("fr", "123456").subject).toContain("connexion");
    expect(otpEmail("nl", "123456").subject).toContain("inlogcode");
  });
});

describe("magicLinkEmail", () => {
  const url = "https://cdj.pirlou.it/login/verify?email=a%40b.co&token=abc123";

  it("embeds the magic link and the fallback code in both html and text", () => {
    const m = magicLinkEmail("en", { url, otp: "123456" });
    expect(m.html).toContain(url);
    expect(m.html).toContain("123456");
    expect(m.text).toContain(url);
    expect(m.text).toContain("123456");
  });

  it("localizes the subject per language", () => {
    expect(magicLinkEmail("en", { url, otp: "1" }).subject).toContain("Sign in");
    expect(magicLinkEmail("fr", { url, otp: "1" }).subject).toContain("Connexion");
    expect(magicLinkEmail("nl", { url, otp: "1" }).subject).toContain("Aanmelden");
  });
});

describe("broadcastEmail", () => {
  it("passes the author's subject through unchanged", () => {
    const t = broadcastEmail({ subject: "Next event!", message: "Hello" });
    expect(t.subject).toBe("Next event!");
  });

  it("converts newlines to <br> and keeps plain text", () => {
    const t = broadcastEmail({ subject: "s", message: "line1\nline2" });
    expect(t.html).toContain("line1<br>line2");
    expect(t.text).toBe("line1\nline2");
  });

  it("escapes HTML in the message to prevent injection", () => {
    const t = broadcastEmail({ subject: "s", message: "<script>alert(1)</script>" });
    expect(t.html).not.toContain("<script>");
    expect(t.html).toContain("&lt;script&gt;");
  });
});

describe("contactDojoEmail", () => {
  it("includes the visitor's name, email and message", () => {
    const t = contactDojoEmail("en", {
      dojoName: "Brussels Dojo",
      visitorName: "Sam",
      visitorEmail: "sam@example.com",
      message: "Can my kid join?",
    });
    expect(t.subject).toContain("Brussels Dojo");
    expect(t.html).toContain("Sam");
    expect(t.html).toContain("sam@example.com");
    expect(t.html).toContain("Can my kid join?");
  });

  it("escapes HTML in visitor-supplied fields", () => {
    const t = contactDojoEmail("en", {
      dojoName: "D",
      visitorName: "<b>x</b>",
      visitorEmail: "a@b.co",
      message: "<img src=x onerror=1>",
    });
    expect(t.html).not.toContain("<b>x</b>");
    expect(t.html).not.toContain("<img");
  });
});

describe("contactDojoConfirmationEmail", () => {
  it("names the dojo and localizes", () => {
    expect(contactDojoConfirmationEmail("nl", { dojoName: "Gent Dojo" }).subject).toContain("Gent Dojo");
    expect(contactDojoConfirmationEmail("fr", { dojoName: "Gent Dojo" }).html).toContain("Gent Dojo");
  });
});

describe("registrationConfirmedEmail", () => {
  it("localizes the subject per language", () => {
    const params = {
      parentName: "P", ninjaName: "N", eventTitle: "Spring Jam",
      eventDate: "2026-05-01", eventAddress: "Main St", atelierName: "Scratch",
      cancellationUrl: "https://x/y",
    };
    expect(registrationConfirmedEmail("en", params).subject).toContain("Registration confirmed");
    expect(registrationConfirmedEmail("fr", params).subject).toContain("Inscription confirmée");
    expect(registrationConfirmedEmail("nl", params).subject).toContain("Inschrijving bevestigd");
    expect(registrationConfirmedEmail("en", params).html).toContain("Scratch");
  });
});
