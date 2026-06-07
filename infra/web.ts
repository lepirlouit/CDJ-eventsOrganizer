import { api } from "./api";
import { userPool, userPoolClient } from "./auth";

// Custom domain: after deploy, point a CNAME in pirlou.it DNS:
//   cdj.pirlou.it  CNAME  <CloudFront URL printed by sst deploy>
// Then re-add the domain block below (SST will issue an ACM cert;
// add the validation CNAME it shows in the AWS console under
// Certificate Manager → cdj.pirlou.it → "Create records in Route 53"
// is greyed out — copy the CNAME manually into pirlou.it DNS instead).
//
// domain: { name: "cdj.pirlou.it" },

export const web = new sst.aws.StaticSite(`Web`, {
  path: "packages/web",
  build: {
    command: "npm run build",
    output: "dist",
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_COGNITO_USER_POOL_ID: userPool.id,
    VITE_COGNITO_CLIENT_ID: userPoolClient.id,
  },
});
