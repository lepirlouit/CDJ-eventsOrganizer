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
