import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
