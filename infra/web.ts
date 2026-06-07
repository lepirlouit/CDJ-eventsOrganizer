import { api } from "./api";
import { userPool, userPoolClient } from "./auth";

export const web = new sst.aws.StaticSite(`Web`, {
  path: "packages/web",
  build: {
    command: "npm run build",
    output: "dist",
  },
  domain: {
    name: "cdj.pirlou.it",
    // pirlou.it is not in Route 53 — add a CNAME record manually:
    //   cdj.pirlou.it  CNAME  <CloudFront URL printed after deploy>
    // dns: sst.aws.dns(),
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_COGNITO_USER_POOL_ID: userPool.id,
    VITE_COGNITO_CLIENT_ID: userPoolClient.id,
  },
});
