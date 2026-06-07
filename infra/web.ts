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
    // Certificate is manually managed in ACM (pirlou.it is not in Route 53)
    // After deploy, add a CNAME in pirlou.it DNS:
    //   cdj.pirlou.it  CNAME  <CloudFront URL printed by sst deploy>
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_COGNITO_USER_POOL_ID: userPool.id,
    VITE_COGNITO_CLIENT_ID: userPoolClient.id,
  },
});
