import { api } from "./api";
import { userPool, userPoolClient } from "./auth";
import { uploadsBucket } from "./storage";

// Lets CloudFront read the (otherwise private) uploads bucket via Origin Access Control.
const uploadsOac = new aws.cloudfront.OriginAccessControl(`UploadsOac`, {
  name: `coderdojo-${$app.stage}-uploads-oac`,
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});

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
  transform: {
    // Serve event-description images from the uploads bucket under the SAME domain,
    // at /uploads/*. Must mutate args in place (the object form would replace SST's
    // default origin). No functionAssociations here, so SST's edge router — which is
    // attached only to the default behavior — never rewrites this path's origin.
    cdn: (args: any) => {
      (args.origins as any[]).push({
        originId: "uploads",
        domainName: uploadsBucket.nodes.bucket.bucketRegionalDomainName,
        originAccessControlId: uploadsOac.id,
        s3OriginConfig: { originAccessIdentity: "" },
      });
      args.orderedCacheBehaviors = [
        ...((args.orderedCacheBehaviors as any[]) ?? []),
        {
          pathPattern: "/uploads/*",
          targetOriginId: "uploads",
          viewerProtocolPolicy: "redirect-to-https",
          allowedMethods: ["GET", "HEAD"],
          cachedMethods: ["GET", "HEAD"],
          compress: true,
          cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // managed CachingOptimized
        },
      ];
    },
  },
});
