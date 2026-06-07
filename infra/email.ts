export const emailIdentity = new aws.ses.DomainIdentity(`EmailIdentity`, {
  domain: "cdj.pirlou.it",
});

// Custom MAIL FROM domain — sets the envelope Return-Path to mail.cdj.pirlou.it
// instead of Amazon's default (amazonses.com).
// Required DNS records after deploy:
//   MX  mail.cdj.pirlou.it  10 feedback-smtp.<region>.amazonses.com
//   TXT mail.cdj.pirlou.it  "v=spf1 include:amazonses.com ~all"
export const mailFrom = new aws.ses.MailFrom(`EmailMailFrom`, {
  domain: emailIdentity.domain,
  mailFromDomain: $interpolate`mail.${emailIdentity.domain}`,
  behaviorOnMxFailure: "UseDefaultValue",
});

export const configSet = new aws.ses.ConfigurationSet(`EmailConfigSet`, {
  name: `coderdojo-${$app.stage}-emails`,
});
