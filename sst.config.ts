/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "coderdojo",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const { table, exportBucket } = await import("./infra/storage");
    const { emailIdentity, configSet } = await import("./infra/email");
    const { userPool, userPoolClient } = await import("./infra/auth");
    const { api } = await import("./infra/api");
    const { web } = await import("./infra/web");

    return {
      api: api.url,
      web: web.url,
    };
  },
});
