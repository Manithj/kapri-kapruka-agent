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

// ---- Generative-UI card payloads streamed from the server ----
export type UICard =
  | { component: "products"; data: { title?: string; products: Product[] } }
  | { component: "product"; data: { product: Product } }
  | { component: "categories"; data: { categories: Category[] } }
  | { component: "cities"; data: { query?: string; cities: City[] } }
  | { component: "delivery"; data: DeliveryQuote }
  | { component: "cart"; data: { items: CartItem[] } }
  | { component: "cart_op"; data: { op: "add" | "remove" | "set"; items: CartItem[] } }
  | { component: "order"; data: OrderConfirmation }
  | { component: "tracking"; data: OrderTracking }
  | {
      component: "checkout_form";
      data: { prefill?: { city?: string; date?: string; recipient_name?: string } };
    };

// ---- SSE event protocol ----
export type StreamEvent =
  | { type: "text"; value: string }
  | { type: "tool"; tool: string; status: "running" }
  | { type: "ui"; card: UICard }
  | { type: "done" }
  | { type: "error"; value: string };

// A rendered assistant message is an ordered list of parts.
export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "card"; card: UICard };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

// Wire format the client sends to /api/chat for the model's history.
export interface WireMessage {
  role: "user" | "assistant";
  content: string;
}
