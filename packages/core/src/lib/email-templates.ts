type Lang = "en" | "fr" | "nl";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function t(lang: Lang, en: string, fr: string, nl: string): string {
  return lang === "fr" ? fr : lang === "nl" ? nl : en;
}

export function otpEmail(lang: Lang, otp: string): EmailTemplate {
  const subject = t(
    lang,
    `Your CoderDojo login code: ${otp}`,
    `Votre code de connexion CoderDojo: ${otp}`,
    `Uw CoderDojo inlogcode: ${otp}`
  );
  const body = t(
    lang,
    `Your one-time login code is <strong>${otp}</strong>. It expires in 10 minutes.`,
    `Votre code de connexion unique est <strong>${otp}</strong>. Il expire dans 10 minutes.`,
    `Uw eenmalige inlogcode is <strong>${otp}</strong>. Deze verloopt over 10 minuten.`
  );
  return {
    subject,
    html: `<p>${body}</p>`,
    text: body.replace(/<[^>]+>/g, ""),
  };
}

/**
 * Passwordless sign-in email: a one-click magic link plus the 6-digit code as
 * a fallback for users who'd rather type it (or whose mail client mangles the
 * link). Both secrets are valid for the same login.
 */
export function magicLinkEmail(
  lang: Lang,
  params: { url: string; otp: string }
): EmailTemplate {
  const { url, otp } = params;

  const subject = t(
    lang,
    "Sign in to CoderDojo Events",
    "Connexion à CoderDojo Events",
    "Aanmelden bij CoderDojo Events"
  );
  const intro = t(
    lang,
    "Click the button below to sign in. The link expires in 15 minutes and can only be used once.",
    "Cliquez sur le bouton ci-dessous pour vous connecter. Le lien expire dans 15 minutes et ne peut être utilisé qu'une seule fois.",
    "Klik op de onderstaande knop om aan te melden. De link verloopt over 15 minuten en kan slechts één keer worden gebruikt."
  );
  const cta = t(lang, "Sign in", "Se connecter", "Aanmelden");
  const fallbackLabel = t(
    lang,
    "Or enter this code manually:",
    "Ou entrez ce code manuellement :",
    "Of voer deze code handmatig in:"
  );
  const ignore = t(
    lang,
    "If you didn't request this, you can safely ignore this email.",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.",
    "Als u dit niet hebt aangevraagd, kunt u deze e-mail negeren."
  );

  const html = `
    <p>${intro}</p>
    <p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">${cta}</a>
    </p>
    <p style="color:#555">${fallbackLabel} <strong style="font-size:18px;letter-spacing:2px">${otp}</strong></p>
    <p style="color:#888;font-size:13px">${ignore}</p>
  `;

  const text = [
    intro,
    "",
    `${cta}: ${url}`,
    "",
    `${fallbackLabel.replace(/\s*[:：]\s*$/, "")}: ${otp}`,
    "",
    ignore,
  ].join("\n");

  return { subject, html, text };
}

export function registrationConfirmedEmail(
  lang: Lang,
  params: {
    parentName: string;
    ninjaName: string;
    eventTitle: string;
    eventDate: string;
    eventAddress: string;
    atelierName: string;
    cancellationUrl: string;
  }
): EmailTemplate {
  const subject = t(
    lang,
    `Registration confirmed — ${params.eventTitle}`,
    `Inscription confirmée — ${params.eventTitle}`,
    `Inschrijving bevestigd — ${params.eventTitle}`
  );
  const html = `
    <h2>${t(lang, "You're registered!", "Vous êtes inscrit!", "U bent ingeschreven!")}</h2>
    <p>${t(lang, `Dear ${params.parentName},`, `Cher/Chère ${params.parentName},`, `Beste ${params.parentName},`)}</p>
    <p>${params.ninjaName} ${t(lang, "is confirmed for", "est inscrit(e) pour", "is ingeschreven voor")} <strong>${params.eventTitle}</strong>.</p>
    <ul>
      <li><strong>${t(lang, "Date", "Date", "Datum")}:</strong> ${params.eventDate}</li>
      <li><strong>${t(lang, "Location", "Lieu", "Locatie")}:</strong> ${params.eventAddress}</li>
      <li><strong>${t(lang, "Atelier", "Atelier", "Atelier")}:</strong> ${params.atelierName}</li>
    </ul>
    <p><a href="${params.cancellationUrl}">${t(lang, "Cancel registration", "Annuler l'inscription", "Inschrijving annuleren")}</a></p>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}

export function waitlistedEmail(
  lang: Lang,
  params: {
    parentName: string;
    ninjaName: string;
    eventTitle: string;
    position: number;
  }
): EmailTemplate {
  const subject = t(
    lang,
    `You're on the waitlist — ${params.eventTitle}`,
    `Vous êtes sur liste d'attente — ${params.eventTitle}`,
    `U staat op de wachtlijst — ${params.eventTitle}`
  );
  const html = `
    <h2>${t(lang, "Waitlist confirmed", "Liste d'attente confirmée", "Wachtlijst bevestigd")}</h2>
    <p>${params.ninjaName} ${t(lang, "is on the waitlist at position", "est sur la liste d'attente en position", "staat op de wachtlijst op positie")} <strong>#${params.position}</strong> ${t(lang, "for", "pour", "voor")} ${params.eventTitle}.</p>
    <p>${t(lang, "We'll notify you if a spot opens up.", "Nous vous notifierons si une place se libère.", "We laten u weten als er een plek vrijkomt.")}</p>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}

export function promotedFromWaitlistEmail(
  lang: Lang,
  params: {
    parentName: string;
    ninjaName: string;
    eventTitle: string;
    eventDate: string;
    eventAddress: string;
  }
): EmailTemplate {
  const subject = t(
    lang,
    `Great news! Your spot is confirmed — ${params.eventTitle}`,
    `Bonne nouvelle! Votre place est confirmée — ${params.eventTitle}`,
    `Goed nieuws! Uw plek is bevestigd — ${params.eventTitle}`
  );
  const html = `
    <h2>${t(lang, "You've been promoted from the waitlist!", "Vous avez été promu de la liste d'attente!", "U bent bevorderd van de wachtlijst!")}</h2>
    <p>${params.ninjaName} ${t(lang, "now has a confirmed spot at", "a maintenant une place confirmée à", "heeft nu een bevestigde plek bij")} ${params.eventTitle}.</p>
    <ul>
      <li><strong>${t(lang, "Date", "Date", "Datum")}:</strong> ${params.eventDate}</li>
      <li><strong>${t(lang, "Location", "Lieu", "Locatie")}:</strong> ${params.eventAddress}</li>
    </ul>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}

export function volunteerConfirmedEmail(
  lang: Lang,
  params: { coachName: string; eventTitle: string; eventDate: string }
): EmailTemplate {
  const subject = t(
    lang,
    `You're signed up as a volunteer — ${params.eventTitle}`,
    `Vous êtes inscrit comme volontaire — ${params.eventTitle}`,
    `U bent ingeschreven als vrijwilliger — ${params.eventTitle}`
  );
  const html = `
    <h2>${t(lang, "Volunteer sign-up confirmed", "Inscription volontaire confirmée", "Vrijwilligersaanmelding bevestigd")}</h2>
    <p>${t(lang, `Dear ${params.coachName},`, `Cher/Chère ${params.coachName},`, `Beste ${params.coachName},`)}</p>
    <p>${t(lang, `You're signed up as a volunteer for <strong>${params.eventTitle}</strong> on ${params.eventDate}.`, `Vous êtes inscrit comme volontaire pour <strong>${params.eventTitle}</strong> le ${params.eventDate}.`, `U bent ingeschreven als vrijwilliger voor <strong>${params.eventTitle}</strong> op ${params.eventDate}.`)}</p>
    <p>${t(lang, "Thank you for helping!", "Merci pour votre aide!", "Bedankt voor uw hulp!")}</p>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}

// Escapes HTML and converts newlines to <br> for author-written messages.
function richText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/**
 * Generic broadcast email for newsletters and event promotions. The subject and
 * message are author-written (by a lead coach or super-admin), so this wraps the
 * message rather than translating it.
 */
export function broadcastEmail(params: { subject: string; message: string }): EmailTemplate {
  const html = `<div>${richText(params.message)}</div>`;
  return { subject: params.subject, html, text: params.message };
}

/** Sent to a dojo's lead coaches when a visitor uses the "contact dojo" form. */
export function contactDojoEmail(
  lang: Lang,
  params: { dojoName: string; visitorName: string; visitorEmail: string; message: string }
): EmailTemplate {
  const subject = t(
    lang,
    `New message for ${params.dojoName}`,
    `Nouveau message pour ${params.dojoName}`,
    `Nieuw bericht voor ${params.dojoName}`
  );
  const html = `
    <h2>${t(lang, "New message from the website", "Nouveau message depuis le site", "Nieuw bericht via de website")}</h2>
    <p><strong>${t(lang, "From", "De", "Van")}:</strong> ${richText(params.visitorName)} (${richText(params.visitorEmail)})</p>
    <p><strong>${t(lang, "Message", "Message", "Bericht")}:</strong></p>
    <div>${richText(params.message)}</div>
    <p>${t(lang, "Reply directly to this person at their email above.", "Répondez directement à cette personne à l'adresse ci-dessus.", "Antwoord rechtstreeks aan deze persoon op het e-mailadres hierboven.")}</p>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}

/** Confirmation sent to the visitor who submitted the "contact dojo" form. */
export function contactDojoConfirmationEmail(
  lang: Lang,
  params: { dojoName: string }
): EmailTemplate {
  const subject = t(
    lang,
    `Your message to ${params.dojoName} was sent`,
    `Votre message à ${params.dojoName} a été envoyé`,
    `Uw bericht aan ${params.dojoName} is verzonden`
  );
  const html = `
    <p>${t(
      lang,
      `Thanks for reaching out! Your message to ${params.dojoName} has been forwarded to their coaches, who will get back to you.`,
      `Merci de nous avoir contactés! Votre message à ${params.dojoName} a été transmis à leurs coaches, qui vous répondront.`,
      `Bedankt voor uw bericht! Uw bericht aan ${params.dojoName} is doorgestuurd naar hun coaches, die contact met u zullen opnemen.`
    )}</p>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}

export function volunteerEventCancelledEmail(
  lang: Lang,
  params: { coachName: string; eventTitle: string }
): EmailTemplate {
  const subject = t(
    lang,
    `Event cancelled — ${params.eventTitle}`,
    `Événement annulé — ${params.eventTitle}`,
    `Evenement geannuleerd — ${params.eventTitle}`
  );
  const html = `
    <h2>${t(lang, "Event cancelled", "Événement annulé", "Evenement geannuleerd")}</h2>
    <p>${t(lang, `Dear ${params.coachName},`, `Cher/Chère ${params.coachName},`, `Beste ${params.coachName},`)}</p>
    <p>${t(lang, `The event <strong>${params.eventTitle}</strong> that you signed up to volunteer for has been cancelled.`, `L'événement <strong>${params.eventTitle}</strong> pour lequel vous vous étiez inscrit comme volontaire a été annulé.`, `Het evenement <strong>${params.eventTitle}</strong> waarvoor u zich als vrijwilliger had aangemeld, is geannuleerd.`)}</p>
  `;
  return { subject, html, text: html.replace(/<[^>]+>/g, "") };
}
