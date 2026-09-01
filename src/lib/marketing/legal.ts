import type { Locale } from "@/lib/i18n/config";
import { BRAND_NAME, COMPANY_LEGAL_NAME } from "./constants";

// Baseline Terms of Service / Privacy Policy for the public marketing site
// (SITE_STRUCTURE.md Part A — the signup ToS checkbox links here). Written
// as Markdown so long-form prose stays readable, rendered + sanitised at
// request time via src/lib/cms/render.ts, the same path the blog uses.
//
// PLACEHOLDER, like the brand name itself: this is a reasonable starting
// draft, NOT lawyer-reviewed. Have it reviewed before a real launch, and
// bump LEGAL_LAST_UPDATED when the text changes.
export const LEGAL_LAST_UPDATED = "2026-09-02";

export const TERMS_MARKDOWN: Record<Locale, string> = {
  en: `
## 1. Acceptance

By creating an account or using ${BRAND_NAME} ("the Service", operated by ${COMPANY_LEGAL_NAME}) you agree to these Terms. If you do not agree, do not use the Service.

## 2. The Service

${BRAND_NAME} is a hosted platform for running an online store — storefront, orders, payments, delivery and invoices. Features change over time; we may add, alter or remove them.

## 3. Your account

You are responsible for your account, your staff's access, and everything done under it. Keep your password secure and give accurate business and contact details. You must be able to enter into a contract under the laws of Bangladesh.

## 4. Your store and your customers

You are the merchant of record for every sale on your store. You are responsible for your products, prices, descriptions, order fulfilment, customer service, refunds and returns, and for complying with the laws that apply to your business, including consumer-protection and tax rules.

## 5. Acceptable use

Do not use the Service to sell prohibited or illegal goods, to infringe others' rights, to send spam, to probe or disrupt the platform, or to process payments that are not genuine sales on your own store.

## 6. Subscription and billing

Paid plans are billed in advance for the period you choose. Plan prices and limits are shown on the Pricing page. A plan may be changed at any time; on the free trial a store is treated as being on the trial tier until it ends. We do not take a commission on your sales — your customers' payments are settled directly to you by your own payment and courier providers.

## 7. Third-party providers

Payments, courier delivery, SMS and similar functions are provided by third parties you connect with your own credentials. Their terms and fees apply to you directly; ${BRAND_NAME} only passes data to them on your instruction.

## 8. Availability and warranties

We work to keep the Service available but do not guarantee uninterrupted or error-free operation, and the Service is provided "as is" without warranties of any kind to the extent the law allows.

## 9. Limitation of liability

To the extent permitted by law, ${COMPANY_LEGAL_NAME} is not liable for indirect or consequential losses, lost profits or lost data, and our total liability for any claim is limited to the fees you paid for the Service in the three months before the claim.

## 10. Suspension and termination

We may suspend or close an account that breaches these Terms, is used unlawfully, or has unpaid fees. You may stop using the Service and close your account at any time; fees already paid are not refunded except where the law requires.

## 11. Changes

We may update these Terms; material changes will be posted here with a new date. Continued use after a change means you accept it.

## 12. Contact

Questions about these Terms: reach us through the contact details on our site.
`,
  bn: `
## ১. সম্মতি

অ্যাকাউন্ট তৈরি করে বা ${BRAND_NAME} ("সেবা", পরিচালনায় ${COMPANY_LEGAL_NAME}) ব্যবহার করে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন। সম্মত না হলে সেবাটি ব্যবহার করবেন না।

## ২. সেবা

${BRAND_NAME} একটি হোস্টেড প্ল্যাটফর্ম যেখানে অনলাইন দোকান চালানো যায় — স্টোরফ্রন্ট, অর্ডার, পেমেন্ট, ডেলিভারি ও ইনভয়েস। ফিচার সময়ে সময়ে বদলাতে পারে; আমরা তা যোগ, পরিবর্তন বা বাদ দিতে পারি।

## ৩. আপনার অ্যাকাউন্ট

আপনার অ্যাকাউন্ট, স্টাফদের অ্যাক্সেস এবং তার অধীনে করা সবকিছুর দায় আপনার। পাসওয়ার্ড নিরাপদ রাখুন এবং সঠিক ব্যবসায়িক ও যোগাযোগের তথ্য দিন। বাংলাদেশের আইনে চুক্তি করার যোগ্য হতে হবে।

## ৪. আপনার দোকান ও আপনার কাস্টমার

আপনার দোকানের প্রতিটি বিক্রির merchant of record আপনি। পণ্য, দাম, বর্ণনা, অর্ডার সরবরাহ, কাস্টমার সেবা, রিফান্ড ও রিটার্ন এবং আপনার ব্যবসায় প্রযোজ্য আইন (ভোক্তা-অধিকার ও কর সহ) মেনে চলার দায় আপনার।

## ৫. গ্রহণযোগ্য ব্যবহার

নিষিদ্ধ বা অবৈধ পণ্য বিক্রি, অন্যের অধিকার লঙ্ঘন, স্প্যাম পাঠানো, প্ল্যাটফর্মে আক্রমণ বা বিঘ্ন ঘটানো, অথবা নিজের দোকানের প্রকৃত বিক্রি নয় এমন পেমেন্ট প্রসেস করার জন্য সেবাটি ব্যবহার করবেন না।

## ৬. সাবস্ক্রিপশন ও বিলিং

পেইড প্ল্যান আপনার বেছে নেওয়া মেয়াদের জন্য আগাম বিল করা হয়। প্ল্যানের দাম ও সীমা প্রাইসিং পেজে দেখানো আছে। যেকোনো সময় প্ল্যান বদলানো যায়; ফ্রি ট্রায়াল চলাকালীন দোকানকে ট্রায়াল টিয়ারে গণ্য করা হয়। আমরা আপনার বিক্রির উপর কমিশন নিই না — কাস্টমারের পেমেন্ট আপনার নিজের পেমেন্ট ও কুরিয়ার প্রোভাইডার সরাসরি আপনাকে দেয়।

## ৭. তৃতীয় পক্ষের প্রোভাইডার

পেমেন্ট, কুরিয়ার ডেলিভারি, SMS প্রভৃতি তৃতীয় পক্ষ দেয় যাদের আপনি নিজের ক্রেডেনশিয়ালে যুক্ত করেন। তাদের শর্ত ও ফি সরাসরি আপনার উপর প্রযোজ্য; ${BRAND_NAME} শুধু আপনার নির্দেশে তাদের কাছে ডেটা পাঠায়।

## ৮. প্রাপ্যতা ও ওয়ারেন্টি

আমরা সেবা সচল রাখার চেষ্টা করি কিন্তু নিরবচ্ছিন্ন বা ত্রুটিহীন পরিচালনার নিশ্চয়তা দিই না; আইন যতটা অনুমতি দেয়, সেবাটি "যেমন আছে" ভিত্তিতে, কোনো ওয়ারেন্টি ছাড়াই দেওয়া হয়।

## ৯. দায়ের সীমা

আইন যতটা অনুমতি দেয়, ${COMPANY_LEGAL_NAME} পরোক্ষ বা পারিণামিক ক্ষতি, মুনাফা বা ডেটা হারানোর জন্য দায়ী নয়; কোনো দাবিতে আমাদের মোট দায় দাবির আগের তিন মাসে আপনার পরিশোধিত ফি পর্যন্ত সীমিত।

## ১০. স্থগিত ও সমাপ্তি

যে অ্যাকাউন্ট এই শর্ত ভাঙে, অবৈধভাবে ব্যবহৃত হয়, বা ফি বকেয়া থাকে, তা আমরা স্থগিত বা বন্ধ করতে পারি। আপনি যেকোনো সময় সেবা বন্ধ করে অ্যাকাউন্ট বন্ধ করতে পারেন; আইন না চাইলে ইতিমধ্যে পরিশোধিত ফি ফেরত দেওয়া হয় না।

## ১১. পরিবর্তন

আমরা এই শর্তাবলি হালনাগাদ করতে পারি; উল্লেখযোগ্য পরিবর্তন নতুন তারিখসহ এখানে দেওয়া হবে। পরিবর্তনের পরও ব্যবহার চালিয়ে গেলে তা আপনি মেনে নিচ্ছেন।

## ১২. যোগাযোগ

এই শর্তাবলি নিয়ে প্রশ্ন থাকলে আমাদের সাইটের যোগাযোগের ঠিকানায় জানান।
`,
};

export const PRIVACY_MARKDOWN: Record<Locale, string> = {
  en: `
## 1. Who this covers

This policy explains how ${COMPANY_LEGAL_NAME} handles data for ${BRAND_NAME}, the platform. Each merchant is the controller of their own customers' data; we act as their processor for that.

## 2. What we collect

**From merchants:** your name, phone, email, store details and the content you put in your store. **Automatically:** log and usage data (IP, device, pages, timestamps) to run and secure the Service. **Payments to us:** the wallet number and reference you submit when you pay for a plan.

## 3. How we use it

To provide and improve the Service, to authenticate you, to bill you, to send service and billing notices, to prevent abuse, and to meet legal obligations.

## 4. Sharing

We share data with infrastructure providers who host the platform, and — only on a merchant's instruction and with their credentials — with the payment, courier and SMS providers a merchant connects. We do not sell personal data. We may disclose data where the law requires it.

## 5. Your customers' data

Order and customer data a merchant collects through their store belongs to that merchant. We process it to run the store and do not use it for our own marketing.

## 6. Cookies

We use a small number of cookies for sign-in, security and remembering your language. The marketing site may load analytics tags (e.g. Google Analytics, Meta Pixel) when configured.

## 7. Retention

We keep account and store data for as long as the account is active, and for a limited period afterward as needed for backups, disputes and legal requirements, then delete or anonymise it.

## 8. Security

We use access controls, encryption in transit, and tenant isolation at the database layer. No system is perfectly secure; tell us promptly if you suspect a problem.

## 9. Your rights

You can access and correct your account information in the dashboard, and request deletion of your account. Contact us to exercise any right the law gives you.

## 10. Changes and contact

We may update this policy; material changes are posted here with a new date. For privacy questions, reach us through the contact details on our site.
`,
  bn: `
## ১. এটি কাদের জন্য

এই নীতি ব্যাখ্যা করে ${COMPANY_LEGAL_NAME} প্ল্যাটফর্ম ${BRAND_NAME}-এর জন্য কীভাবে ডেটা পরিচালনা করে। প্রতিটি মার্চেন্ট তাঁর নিজের কাস্টমারদের ডেটার কন্ট্রোলার; সেটির জন্য আমরা তাঁর প্রসেসর হিসেবে কাজ করি।

## ২. আমরা কী সংগ্রহ করি

**মার্চেন্টের কাছ থেকে:** নাম, ফোন, ইমেইল, দোকানের তথ্য এবং দোকানে রাখা কনটেন্ট। **স্বয়ংক্রিয়ভাবে:** লগ ও ব্যবহারের ডেটা (IP, ডিভাইস, পেজ, সময়) — সেবা চালাতে ও নিরাপদ রাখতে। **আমাদের পেমেন্ট:** প্ল্যানের জন্য পেমেন্ট করার সময় দেওয়া ওয়ালেট নম্বর ও রেফারেন্স।

## ৩. কীভাবে ব্যবহার করি

সেবা দেওয়া ও উন্নত করা, আপনাকে যাচাই করা, বিল করা, সেবা ও বিলিং নোটিশ পাঠানো, অপব্যবহার রোধ করা, এবং আইনি বাধ্যবাধকতা মেটানো।

## ৪. শেয়ার করা

প্ল্যাটফর্ম হোস্ট করা অবকাঠামো প্রোভাইডারের সাথে, এবং — শুধু মার্চেন্টের নির্দেশে ও তাঁর ক্রেডেনশিয়ালে — মার্চেন্টের যুক্ত করা পেমেন্ট, কুরিয়ার ও SMS প্রোভাইডারের সাথে ডেটা শেয়ার করি। আমরা ব্যক্তিগত ডেটা বিক্রি করি না। আইন চাইলে ডেটা প্রকাশ করতে পারি।

## ৫. আপনার কাস্টমারদের ডেটা

মার্চেন্ট তাঁর দোকানের মাধ্যমে সংগ্রহ করা অর্ডার ও কাস্টমার ডেটা সেই মার্চেন্টের। আমরা তা শুধু দোকান চালাতে প্রসেস করি, নিজেদের মার্কেটিংয়ে ব্যবহার করি না।

## ৬. কুকি

সাইন-ইন, নিরাপত্তা ও আপনার ভাষা মনে রাখার জন্য অল্প কয়েকটি কুকি ব্যবহার করি। কনফিগার করা থাকলে মার্কেটিং সাইট অ্যানালিটিক্স ট্যাগ (যেমন Google Analytics, Meta Pixel) লোড করতে পারে।

## ৭. সংরক্ষণ

অ্যাকাউন্ট সক্রিয় থাকা পর্যন্ত এবং তারপর ব্যাকআপ, বিরোধ ও আইনি প্রয়োজনে সীমিত সময়ের জন্য অ্যাকাউন্ট ও দোকানের ডেটা রাখি, তারপর মুছে ফেলি বা বেনামি করি।

## ৮. নিরাপত্তা

অ্যাক্সেস কন্ট্রোল, ট্রানজিটে এনক্রিপশন এবং ডেটাবেস স্তরে টেন্যান্ট আইসোলেশন ব্যবহার করি। কোনো সিস্টেম সম্পূর্ণ নিরাপদ নয়; সমস্যার সন্দেহ হলে দ্রুত জানান।

## ৯. আপনার অধিকার

ড্যাশবোর্ড থেকে অ্যাকাউন্টের তথ্য দেখতে ও ঠিক করতে পারেন এবং অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারেন। আইন যে অধিকার দেয় তা প্রয়োগ করতে আমাদের সাথে যোগাযোগ করুন।

## ১০. পরিবর্তন ও যোগাযোগ

আমরা এই নীতি হালনাগাদ করতে পারি; উল্লেখযোগ্য পরিবর্তন নতুন তারিখসহ এখানে দেওয়া হবে। প্রাইভেসি সংক্রান্ত প্রশ্নে আমাদের সাইটের যোগাযোগের ঠিকানায় জানান।
`,
};
