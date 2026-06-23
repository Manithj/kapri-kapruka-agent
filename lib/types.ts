// Shared types between the streaming API and the React client.

export interface Money {
  amount: number | null;
  currency: string;
}

export interface Product {
  id: string;
  name: string;
  summary?: string;
  price: Money;
  compare_at_price?: Money | null;
  in_stock?: boolean;
  stock_level?: string;
  image_url?: string | null;
  images?: string[];
  description?: string;
  category?: { id?: string; name?: string; slug?: string };
  ships_internationally?: boolean;
  url?: string;
  variants?: ProductVariant[];
  attributes?: ProductAttributes;
  shipping?: ProductShipping;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: Money;
  in_stock?: boolean;
  stock_level?: string;
  attributes?: { weight?: string } & Record<string, string>;
}

export interface ProductAttributes {
  type?: string;
  subtype?: string;
  weight?: string;
  vendor?: string;
}

export interface ProductShipping {
  ships_from?: string;
  ships_internationally?: boolean;
  restricted_countries?: string[];
}

export interface CartItem {
  product_id: string;
  name: string;
  image?: string | null;
  price: number | null;
  currency: string;
  quantity: number;
  icing_text?: string | null;
}

export interface Category {
  name: string;
  url?: string;
  children?: Category[];
}

export interface DeliveryQuote {
  city: string;
  checked_date?: string;
  available: boolean;
  rate: number;
  currency: string;
  reason?: string | null;
  next_available_date?: string | null;
  perishable_warning?: string | null;
}

export interface City {
  name: string;
  aliases?: string[];
}

export interface OrderConfirmation {
  checkout_url: string;
  order_ref: string;
  summary: {
    items_total: number;
    delivery_fee: number;
    addons_total: number;
    grand_total: number;
    currency: string;
  };
  expires_at?: string;
  // echoed back for a richer confirmation card
  items?: CartItem[];
  recipient?: { name?: string; city?: string };
}

export interface OrderTracking {
  order_number: string;
  status?: string;
  status_display?: string;
  order_date?: string;
  delivery_date?: string;
  amount?: string;
  recipient?: { name?: string; phone?: string; address?: string; city?: string };
  greeting_message?: string | null;
  progress?: { step: string; timestamp: string }[];
  items?: { product_id: string; name: string; quantity: number; selling_price: number }[];
  has_delivery_photo?: boolean;
}

export interface BundleItem {
  product: Product;
  quantity: number;
  reason?: string;
}

export interface BundleData {
  title: string;
  occasion?: string;
  budget?: number | null;
  currency: string;
  items: BundleItem[];
  total: number;
}

// ---- Generative-UI card payloads streamed from the server ----
export type UICard =
  | {
      component: "products";
      data: { title?: string; products: Product[]; query?: string; nextCursor?: string; maxPrice?: number; minPrice?: number };
    }
  | { component: "product"; data: { product: Product } }
  | { component: "categories"; data: { categories: Category[] } }
  | { component: "cities"; data: { query?: string; cities: City[] } }
  | { component: "delivery"; data: DeliveryQuote }
  | { component: "cart"; data: { items: CartItem[] } }
  | { component: "cart_op"; data: { op: "add" | "remove" | "set"; items: CartItem[] } }
  | { component: "order"; data: OrderConfirmation }
  | { component: "tracking"; data: OrderTracking }
  | { component: "bundle"; data: BundleData }
  | { component: "compare"; data: { products: Product[] } }
  | { component: "profile_op"; data: ProfileOp }
  | {
      component: "checkout_form";
      data: { prefill?: { city?: string; date?: string; recipient_name?: string } };
    };

// ---- SSE event protocol ----
export type StreamEvent =
  | { type: "text"; value: string }
  | { type: "tool"; tool: string; status: "running" }
  | { type: "ui"; card: UICard }
  | { type: "chips"; values: string[] }
  | { type: "done" }
  | { type: "error"; value: string };

// A rendered assistant message is an ordered list of parts.
export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "card"; card: UICard }
  | { kind: "image"; url: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  // For user messages whose visible bubble differs from what the model should
  // receive (e.g. a "Load more" button that carries a hidden cursor instruction).
  wireText?: string;
}

// Wire format the client sends to /api/chat for the model's history.
export interface WireMessage {
  role: "user" | "assistant";
  content: string;
  // Data-URL images attached to a user message (only the latest turn carries bytes).
  images?: string[];
}

// ---- Client-side profile (localStorage; flows up to the server as WireProfile) ----
export interface ProfileRecipient {
  id: string;
  name: string;
  relationship?: string;
  city?: string;
  notes?: string;
}

export interface ProfileOccasion {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD (recurring: month/day are what matter)
  recurring: boolean;
  type: "birthday" | "anniversary" | "custom";
  recipientName?: string;
}

export interface ProfileOrder {
  order_ref: string;
  placedAt: string;
  total: number;
  currency: string;
  recipient?: string;
  city?: string;
  items: { name: string; quantity: number }[];
}

export interface KapriProfile {
  v: 1;
  language?: "en" | "si" | "tanglish";
  defaultCity?: string;
  budget?: { amount: number; currency: string } | null;
  recipients: ProfileRecipient[];
  occasions: ProfileOccasion[];
  orders: ProfileOrder[];
}

// A profile_op card is intercepted client-side (like cart_op) to mutate the profile.
export type ProfileOp =
  | { op: "remember_recipient"; name: string; relationship?: string; city?: string; notes?: string }
  | { op: "add_occasion"; label: string; date: string; recurring?: boolean; occasionType?: "birthday" | "anniversary" | "custom"; recipientName?: string }
  | { op: "set_budget"; amount: number; currency?: string }
  | { op: "clear_budget" }
  | { op: "set_language"; language: "en" | "si" | "tanglish" }
  | { op: "set_city"; city: string };

// Compact, client-computed summary sent up each request in the POST body.
export interface WireProfile {
  language?: "en" | "si" | "tanglish";
  defaultCity?: string;
  budget?: { amount: number; currency: string } | null;
  recipients?: { name: string; relationship?: string; city?: string; notes?: string }[];
  upcoming?: { label: string; date: string; inDays: number; recipientName?: string }[];
  recentOrders?: { order_ref: string; recipient?: string; city?: string }[];
}
