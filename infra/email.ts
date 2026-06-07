export const emailIdentity = new aws.ses.DomainIdentity(`EmailIdentity`, {
  domain: "cdj.pirlou.it",
});

export const configSet = new aws.ses.ConfigurationSet(`EmailConfigSet`, {
  name: `coderdojo-${$app.stage}-emails`,
});
