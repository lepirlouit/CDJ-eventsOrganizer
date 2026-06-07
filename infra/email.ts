export const emailIdentity = new aws.ses.DomainIdentity(`EmailIdentity`, {
  domain: "events.coderdojo.be",
});

export const configSet = new aws.ses.ConfigurationSet(`EmailConfigSet`, {
  name: `coderdojo-${$app.stage}-emails`,
});
