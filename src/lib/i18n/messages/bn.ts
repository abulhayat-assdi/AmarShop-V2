import type { Messages } from "./index";

// Bengali storefront copy — mirrors the shape of en.ts. Currency stays
// "৳" + Western digits (standard for BD e-commerce); only text is
// translated this slice.
export const bn: Messages = {
  common: {
    subtotal: "সাবটোটাল",
    total: "মোট",
    delivery: "ডেলিভারি",
    outOfStock: "স্টকে নেই",
  },
  nav: {
    search: "খুঁজুন",
    cart: "কার্ট ({count})",
  },
  home: {
    categories: "ক্যাটাগরি",
    newArrivals: "নতুন এসেছে",
    noProducts: "এখনো কোনো পণ্য নেই।",
  },
  category: {
    empty: "এই ক্যাটাগরিতে এখনো কোনো পণ্য নেই।",
  },
  pdp: {
    inStock: "স্টকে {count}টি আছে",
    addToCart: "কার্টে যোগ করুন",
    adding: "যোগ করা হচ্ছে…",
    addedToCart: "কার্টে যোগ হয়েছে।",
    quantity: "পরিমাণ",
  },
  cart: {
    title: "আপনার কার্ট",
    empty: "আপনার কার্ট খালি।",
    each: "প্রতিটি {price}",
    onlyNInStock: "স্টকে মাত্র {count}টি আছে",
    decrease: "পরিমাণ কমান",
    increase: "পরিমাণ বাড়ান",
    remove: "সরান",
    proceedToCheckout: "চেকআউটে যান",
  },
  checkout: {
    title: "চেকআউট",
    orderSummary: "অর্ডার সারাংশ",
    fullName: "পুরো নাম",
    phone: "ফোন নম্বর",
    phonePlaceholder: "01XXXXXXXXX",
    address: "সম্পূর্ণ ঠিকানা",
    emailOptional: "ইমেইল (ঐচ্ছিক, পেমেন্ট রসিদের জন্য)",
    delivery: "ডেলিভারি",
    noZones:
      "এখনো কোনো ডেলিভারি এলাকা যোগ করা হয়নি — চেকআউট সম্পূর্ণ করার আগে দোকানকে একটি যোগ করতে হবে।",
    paymentMethod: "পেমেন্ট পদ্ধতি",
    cod: "ক্যাশ অন ডেলিভারি",
    onlinePayment: "অনলাইন পেমেন্ট — বিকাশ, নগদ, DBBL Nexus, Visa, Mastercard",
    onlineHint: "সম্পূর্ণ করতে আপনাকে একটি নিরাপদ পেমেন্ট পেজে নিয়ে যাওয়া হবে।",
    orderNotes: "অর্ডার নোট (ঐচ্ছিক)",
    placeOrder: "অর্ডার করুন",
    placingOrder: "অর্ডার করা হচ্ছে…",
  },
  search: {
    title: "পণ্য খুঁজুন",
    placeholder: "পণ্য খুঁজুন…",
    submit: "খুঁজুন",
    shopByCategory: "ক্যাটাগরি থেকে কিনুন",
    showing: "“{query}” এর জন্য {total}টির মধ্যে {shown}টি ফলাফল দেখানো হচ্ছে",
    showingOne: "“{query}” এর জন্য {total}টির মধ্যে {shown}টি ফলাফল দেখানো হচ্ছে",
    loadMore: "আরও পণ্য দেখুন",
    noResults: "“{query}” এর জন্য কোনো পণ্য পাওয়া যায়নি।",
    backToSearch: "সার্চে ফিরে যান",
    sort: "সাজান",
    sortRelevance: "প্রাসঙ্গিকতা",
    sortPriceAsc: "দাম: কম থেকে বেশি",
    sortPriceDesc: "দাম: বেশি থেকে কম",
    sortNewest: "নতুন",
  },
  confirmation: {
    thankYou: "ধন্যবাদ, {name}!",
    placed: "আপনার অর্ডার সম্পন্ন হয়েছে।",
    payOnDelivery: "ডেলিভারির সময় পরিশোধ করুন।",
    paymentConfirmed: "পেমেন্ট নিশ্চিত হয়েছে।",
    paymentPending: "পেমেন্ট নিশ্চিত করা হচ্ছে।",
    orderSummary: "অর্ডার সারাংশ",
    deliveringTo: "ডেলিভারি হবে: {address}",
    phone: "ফোন: {phone}",
    trackDelivery: "আপনার ডেলিভারি ট্র্যাক করুন",
  },
};
