import type { CopywriterAdapter } from "./adapter";
import type { DescribeProductInput } from "./types";

// No network. Assembles a short, honest paragraph from the given facts so
// the whole feature builds, tests, and demos with no API key — the same
// role src/lib/sms/log.ts plays for SMS. This is the default provider
// until AI_PROVIDER + AI_API_KEY are set.
export class StubAdapter implements CopywriterAdapter {
  readonly provider = "stub" as const;

  async describeProduct(input: DescribeProductInput): Promise<string> {
    const brand = input.brand ? (input.locale === "bn" ? `${input.brand} ব্র্যান্ডের ` : `${input.brand} `) : "";
    const cat = input.category ?? (input.locale === "bn" ? "পণ্য" : "product");

    if (input.locale === "bn") {
      const price = input.priceBdt != null ? ` মাত্র ৳${input.priceBdt} দামে এটি একটি ভালো পছন্দ।` : "";
      return (
        `${brand}${input.name} আপনার প্রতিদিনের প্রয়োজন মেটাতে তৈরি। ` +
        `${cat} ক্যাটাগরির এই পণ্যটি মান ও স্বাচ্ছন্দ্যের কথা মাথায় রেখে বেছে নেওয়া।${price} ` +
        `অর্ডার করার আগে বিবরণটি নিজের মতো করে সাজিয়ে নিন।`
      );
    }

    const price = input.priceBdt != null ? ` At ৳${input.priceBdt}, it's easy value for money.` : "";
    return (
      `${brand}${input.name} is made for everyday use. ` +
      `Chosen for quality and comfort, it fits right into the ${cat.toLowerCase()} you reach for often.${price} ` +
      `Edit this text to match your own voice before publishing.`
    );
  }
}
