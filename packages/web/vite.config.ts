import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

/**
 * In production, event-description images under /uploads/* are served by a CloudFront
 * origin on the static site (see infra/web.ts). But `sst dev` does NOT deploy the
 * StaticSite/CloudFront, and the uploads bucket is private — so in dev we serve those
 * objects directly from S3 using the developer's local AWS credentials (the same ones
 * `sst dev` uses; the bucket owner can read via IAM regardless of the CloudFront-only
 * bucket policy). Uploads (presigned PUT) still go straight to S3 as in prod.
 */
function serveUploadsFromS3(bucket: string): Plugin {
  const s3 = new S3Client({});
  return {
    name: "serve-uploads-from-s3",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/uploads/")) return next();
        const key = decodeURIComponent(req.url.slice(1).split("?")[0]);
        s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
          .then((obj) => {
            if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
            (obj.Body as Readable).pipe(res);
          })
          .catch(() => {
            res.statusCode = 404;
            res.end("Not found");
          });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // vite.config runs in Node; .env files are NOT in process.env unless loaded here.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  const stage = env.SST_STAGE || "dev";
  const bucket = env.VITE_UPLOADS_BUCKET || `coderdojo-${stage}-uploads`;
  return {
    plugins: [react(), serveUploadsFromS3(bucket)],
    define: {
      global: "globalThis",
    },
    build: { outDir: "dist" },
  };
});
