import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // sharp is a native module — let Next require it at runtime from
  // node_modules instead of trying to bundle it.
  serverExternalPackages: ["sharp"],
  experimental: {
    // Product media uploads go through a Server Action as multipart form
    // data. The configured worst case is 2×50 MB videos + 5×4 MB photos in
    // one request; the default cap is 1 MB. Next buffers the whole body in
    // memory — acceptable at current scale, and merchants normally add a
    // few items at a time. Presigned direct-to-storage upload is the real
    // fix once R2 lands (Phase 2).
    serverActions: { bodySizeLimit: "120mb" },
  },
  // The invoice PDF routes read vendored .ttf files at runtime via
  // fs.readFile(process.cwd() + "src/lib/invoices/fonts/..."). Next's file
  // tracing won't follow a dynamic fs path on its own, so force the font
  // dir into the standalone build for both route handlers.
  outputFileTracingIncludes: {
    "/orders/[id]/invoice": ["./src/lib/invoices/fonts/**"],
    "/order/[tranId]/invoice": ["./src/lib/invoices/fonts/**"],
  },
};

export default nextConfig;
