import OpenAI from "openai";
import { kapruka, upsizeImage } from "./kapruka";
import type { BundleItem, CartItem, Product, ProfileOp, UICard } from "./types";

// ---- OpenAI tool (function) definitions ----
export const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the Kapruka catalog by keyword. Returns matching products as visual cards. Search is keyword-based and can be quirky — if you get no results, try different wording or browse categories.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query, min 3 chars (e.g. 'roses', 'samsung', 'perfume for him')." },
          category: { type: "string", description: "Optional category filter (e.g. 'Flowers', 'Chocolates')." },
          min_price: { type: "number", description: "Minimum price in the requested currency." },
          max_price: { type: "number", description: "Maximum price in the requested currency." },
          in_stock_only: { type: "boolean", description: "Only return in-stock items." },
          sort: {
            type: "string",
            enum: ["relevance", "price_asc", "price_desc", "newest", "bestseller"],
          },
          limit: { type: "integer", description: "How many results (1-12). Default 8." },
          currency: { type: "string", description: "LKR (default), USD, GBP, AUD, CAD, EUR." },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description: "Fetch full details (description, all images, stock) for one product by its exact product_id.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          currency: { type: "string" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_categories",
      description: "List top-level Kapruka product categories. Useful for guided browsing or when search comes up empty.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_delivery_cities",
      description: "Find/validate Sri Lankan delivery cities by partial name. Always pass a query.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Partial city name, e.g. 'colombo', 'galle', 'kandy'." } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_delivery",
      description:
        "Check whether Kapruka can deliver to a city on a date, and the flat delivery fee. Pass a product_id for perishable (cake/flower) freshness warnings.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Canonical city name from list_delivery_cities." },
          delivery_date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
          product_id: { type: "string" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add a product to the customer's cart by exact product_id. The cart updates live on screen.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          quantity: { type: "integer", description: "1-99. Default 1." },
          icing_text: { type: "string", description: "Icing message for cakes only (ignored otherwise)." },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Remove a product from the cart by product_id.",
      parameters: {
        type: "object",
        properties: { product_id: { type: "string" } },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_cart",
      description: "Show the customer's current cart.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "show_checkout_form",
      description:
        "Display a clean, fillable checkout form for the customer to enter recipient, delivery and gift details. Prefer this over asking for the details one-by-one in text. Prefill city/date/recipient name if you already know them. After the customer submits, validate and call create_order.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Prefill the delivery city if known." },
          date: { type: "string", description: "Prefill the delivery date (YYYY-MM-DD) if known." },
          recipient_name: { type: "string", description: "Prefill the recipient's name if known." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description:
        "Create a guest-checkout order from the current cart and return a pay link. Only call once the cart is confirmed and you have recipient, delivery and sender details. The cart items are taken from live context — you supply the rest.",
      parameters: {
        type: "object",
        properties: {
          recipient: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string", description: "077XXXXXXX or +9477XXXXXXX." },
            },
            required: ["name", "phone"],
          },
          delivery: {
            type: "object",
            properties: {
              address: { type: "string" },
              city: { type: "string", description: "Canonical Kapruka delivery city." },
              location_type: { type: "string", enum: ["house", "apartment", "office", "other"] },
              date: { type: "string", description: "YYYY-MM-DD, today or future." },
              instructions: { type: "string" },
            },
            required: ["address", "city", "date"],
          },
          sender: {
            type: "object",
            properties: {
              name: { type: "string" },
              anonymous: { type: "boolean" },
            },
            required: ["name"],
          },
          gift_message: { type: "string", description: "Up to 300 chars." },
          currency: { type: "string" },
        },
        required: ["recipient", "delivery", "sender"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "track_order",
      description: "Track a paid Kapruka order by its order number (from the confirmation email).",
      parameters: {
        type: "object",
        properties: { order_number: { type: "string" } },
        required: ["order_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_bundle",
      description:
        "Propose a curated gift bundle of 2–4 complementary products (e.g. cake + flowers + card). Renders one card with the combined total and an 'Add all to cart' button. Use real product_ids from prior search/get_product results. Keep the total within the customer's budget when one is given.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "A short, warm name for the bundle, e.g. 'Birthday Surprise for Amma'." },
          occasion: { type: "string" },
          budget: { type: "number", description: "Target budget in the currency, if the customer gave one." },
          currency: { type: "string" },
          items: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                product_id: { type: "string" },
                quantity: { type: "integer", description: "1-10. Default 1." },
                reason: { type: "string", description: "One short line on why this item fits." },
              },
              required: ["product_id"],
            },
          },
        },
        required: ["title", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_products",
      description:
        "Show a side-by-side comparison of 2–4 specific products by their product_ids. Use when the customer is torn between options, then give a confident recommendation.",
      parameters: {
        type: "object",
        properties: {
          product_ids: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
          currency: { type: "string" },
        },
        required: ["product_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description:
        "Save a durable fact about the customer so Kapri recalls it next time: a recipient, an occasion (birthday/anniversary), their preferred language, usual city, or active budget. Call this naturally when the customer reveals such a fact — don't announce every save.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["recipient", "occasion", "language", "city", "budget"] },
          name: { type: "string", description: "Recipient name (kind=recipient)." },
          relationship: { type: "string", description: "e.g. mother, wife, friend (kind=recipient)." },
          city: { type: "string", description: "City (kind=recipient or kind=city)." },
          notes: { type: "string", description: "Anything to remember about the recipient (kind=recipient)." },
          label: { type: "string", description: "Occasion name, e.g. \"Amma's birthday\" (kind=occasion)." },
          date: { type: "string", description: "YYYY-MM-DD of the occasion (kind=occasion)." },
          recurring: { type: "boolean", description: "Does it repeat yearly? Default true (kind=occasion)." },
          recipient_name: { type: "string", description: "Who the occasion is for (kind=occasion)." },
          language: { type: "string", enum: ["en", "si", "tanglish"], description: "Preferred language (kind=language)." },
          amount: { type: "number", description: "Budget amount (kind=budget)." },
          currency: { type: "string", description: "Budget currency (kind=budget)." },
        },
        required: ["kind"],
      },
    },
  },
];

// ---- mappers ----
function mapSearchProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    summary: r.summary,
    price: r.price ?? { amount: null, currency: "LKR" },
    compare_at_price: r.compare_at_price ?? null,
    in_stock: r.in_stock,
    stock_level: r.stock_level,
    image_url: upsizeImage(r.image_url, 600),
    category: r.category,
    ships_internationally: r.ships_internationally,
    url: r.url,
  };
}

function mapDetailProduct(d: any): Product {
  const images: string[] = Array.isArray(d.images)
    ? d.images.map((u: string) => upsizeImage(u, 900)!).filter(Boolean)
    : [];
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    summary: d.summary,
    price: d.price ?? { amount: null, currency: "LKR" },
    compare_at_price: d.compare_at_price ?? null,
    in_stock: d.in_stock,
    stock_level: d.stock_level,
    images,
    image_url: images[0] ?? null,
    category: d.category,
    url: d.url,
  };
}

export interface AgentContext {
  cart: CartItem[];
  currency: string;
}

export interface ExecResult {
  result: string; // text returned to the model
  cards: UICard[]; // rich UI streamed to the client
}

// Translate a `remember` tool call into a client-applied ProfileOp.
function buildProfileOp(args: any): ProfileOp | null {
  switch (args.kind) {
    case "recipient":
      if (!args.name) return null;
      return { op: "remember_recipient", name: args.name, relationship: args.relationship, city: args.city, notes: args.notes };
    case "occasion":
      if (!args.label || !args.date) return null;
      return {
        op: "add_occasion",
        label: args.label,
        date: args.date,
        recurring: args.recurring ?? true,
        recipientName: args.recipient_name,
        occasionType: /birthday/i.test(args.label) ? "birthday" : /anniversary/i.test(args.label) ? "anniversary" : "custom",
      };
    case "language":
      if (!args.language) return null;
      return { op: "set_language", language: args.language };
    case "city":
      if (!args.city) return null;
      return { op: "set_city", city: args.city };
    case "budget":
      if (typeof args.amount !== "number") return null;
      return { op: "set_budget", amount: args.amount, currency: args.currency };
    default:
      return null;
  }
}

function upsertCart(cart: CartItem[], item: CartItem) {
  const existing = cart.find((c) => c.product_id === item.product_id);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + item.quantity);
    if (item.icing_text) existing.icing_text = item.icing_text;
  } else {
    cart.push(item);
  }
}

// Executes a tool call, mutating ctx.cart where relevant and returning both the
// model-facing text result and any rich cards to render.
export async function executeTool(
  name: string,
  args: any,
  ctx: AgentContext
): Promise<ExecResult> {
  switch (name) {
    case "search_products": {
      const res = await kapruka.searchProducts({
        q: args.q,
        category: args.category ?? null,
        min_price: args.min_price ?? null,
        max_price: args.max_price ?? null,
        in_stock_only: args.in_stock_only ?? false,
        sort: args.sort ?? "relevance",
        limit: Math.min(12, args.limit ?? 8),
        currency: args.currency ?? ctx.currency,
      });
      if (!res.ok) {
        return {
          result: `No results for "${args.q}". Try a reworded query (synonyms, brand names, more or less specific), or call list_categories and browse a relevant category.`,
          cards: [],
        };
      }
      const products: Product[] = (res.data.results || []).map(mapSearchProduct);
      if (products.length === 0) {
        return { result: `No results for "${args.q}". Try a different query or browse categories.`, cards: [] };
      }
      const brief = products
        .slice(0, 12)
        .map((p) => `${p.name} | id:${p.id} | ${p.price.currency} ${p.price.amount ?? "?"} | ${p.in_stock ? "in stock" : "out of stock"}`)
        .join("\n");
      return {
        result: `Found ${products.length} products for "${args.q}" (shown to the user as cards):\n${brief}`,
        cards: [{ component: "products", data: { title: args.q, products } }],
      };
    }

    case "get_product": {
      const res = await kapruka.getProduct({ product_id: args.product_id, currency: args.currency ?? ctx.currency });
      if (!res.ok) return { result: `Could not load product ${args.product_id}: ${res.message}`, cards: [] };
      const product = mapDetailProduct(res.data);
      return {
        result: `Loaded "${product.name}" (id:${product.id}), ${product.price.currency} ${product.price.amount ?? "?"}, ${product.in_stock ? "in stock" : "out of stock"}.`,
        cards: [{ component: "product", data: { product } }],
      };
    }

    case "list_categories": {
      const res = await kapruka.listCategories({});
      if (!res.ok) return { result: `Could not load categories: ${res.message}`, cards: [] };
      const categories = res.data.categories || [];
      return {
        result: `Categories: ${categories.map((c: any) => c.name).join(", ")}`,
        cards: [{ component: "categories", data: { categories } }],
      };
    }

    case "list_delivery_cities": {
      const res = await kapruka.listDeliveryCities({ query: args.query, limit: 25 });
      if (!res.ok) return { result: `No cities matched "${args.query}".`, cards: [] };
      const cities = res.data.cities || [];
      return {
        result: `Matched ${cities.length} cities for "${args.query}": ${cities.map((c: any) => c.name).join(", ")}`,
        cards: [{ component: "cities", data: { query: args.query, cities } }],
      };
    }

    case "check_delivery": {
      const res = await kapruka.checkDelivery({
        city: args.city,
        delivery_date: args.delivery_date,
        product_id: args.product_id,
      });
      if (!res.ok) return { result: `Delivery check failed: ${res.message}`, cards: [] };
      const d = res.data;
      const summary = d.available
        ? `Delivery to ${d.city} on ${d.checked_date} is available. Flat fee ${d.currency} ${d.rate}.${d.perishable_warning ? " Warning: " + d.perishable_warning : ""}`
        : `Not available on ${d.checked_date}: ${d.reason || "unavailable"}. Next available: ${d.next_available_date || "n/a"}.`;
      return { result: summary, cards: [{ component: "delivery", data: d }] };
    }

    case "add_to_cart": {
      const res = await kapruka.getProduct({ product_id: args.product_id, currency: ctx.currency });
      if (!res.ok) return { result: `Couldn't add — product ${args.product_id} not found.`, cards: [] };
      const p = mapDetailProduct(res.data);
      const qty = Math.min(99, Math.max(1, args.quantity ?? 1));
      const item: CartItem = {
        product_id: p.id,
        name: p.name,
        image: p.image_url,
        price: p.price.amount,
        currency: p.price.currency,
        quantity: qty,
        icing_text: args.icing_text ?? null,
      };
      upsertCart(ctx.cart, item);
      return {
        result: `Added ${qty}× "${p.name}" to the cart. Cart now has ${ctx.cart.reduce((s, c) => s + c.quantity, 0)} item(s).`,
        cards: [{ component: "cart_op", data: { op: "add", items: [...ctx.cart] } }],
      };
    }

    case "remove_from_cart": {
      const before = ctx.cart.length;
      ctx.cart = ctx.cart.filter((c) => c.product_id !== args.product_id);
      const removed = ctx.cart.length < before;
      return {
        result: removed ? `Removed ${args.product_id} from the cart.` : `${args.product_id} wasn't in the cart.`,
        cards: [{ component: "cart_op", data: { op: "remove", items: [...ctx.cart] } }],
      };
    }

    case "view_cart": {
      return {
        result:
          ctx.cart.length === 0
            ? "The cart is empty."
            : "Cart: " + ctx.cart.map((c) => `${c.quantity}× ${c.name}`).join(", "),
        cards: [{ component: "cart", data: { items: [...ctx.cart] } }],
      };
    }

    case "show_checkout_form": {
      return {
        result:
          "Displayed an interactive checkout form for the customer to fill in. Wait for them to submit their recipient/delivery/sender details, then validate the city & date and call create_order.",
        cards: [
          {
            component: "checkout_form",
            data: {
              prefill: {
                city: args.city || undefined,
                date: args.date || undefined,
                recipient_name: args.recipient_name || undefined,
              },
            },
          },
        ],
      };
    }

    case "create_order": {
      if (ctx.cart.length === 0) {
        return { result: "Cart is empty — add at least one item before creating an order.", cards: [] };
      }
      const payload = {
        cart: ctx.cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          ...(c.icing_text ? { icing_text: c.icing_text } : {}),
        })),
        recipient: args.recipient,
        delivery: {
          ...args.delivery,
          location_type: args.delivery?.location_type ?? "house",
        },
        sender: args.sender,
        ...(args.gift_message ? { gift_message: args.gift_message } : {}),
        currency: args.currency ?? ctx.currency,
      };
      const res = await kapruka.createOrder(payload);
      if (!res.ok) return { result: `Order failed: ${res.message}`, cards: [] };
      const d = res.data;
      const card: UICard = {
        component: "order",
        data: {
          ...d,
          items: [...ctx.cart],
          recipient: { name: args.recipient?.name, city: args.delivery?.city },
        },
      };
      return {
        result: `Order created. Ref ${d.order_ref}. Grand total ${d.summary?.currency} ${d.summary?.grand_total}. Pay link: ${d.checkout_url} (expires ~60 min). Tell the customer warmly and point them to the Pay now button.`,
        cards: [card],
      };
    }

    case "track_order": {
      const res = await kapruka.trackOrder({ order_number: args.order_number });
      if (!res.ok) return { result: `Couldn't track ${args.order_number}: ${res.message}`, cards: [] };
      const d = res.data;
      return {
        result: `Order ${d.order_number}: ${d.status_display || d.status}. Delivery date ${d.delivery_date || "n/a"}.`,
        cards: [{ component: "tracking", data: d }],
      };
    }

    case "propose_bundle": {
      const rawItems: any[] = Array.isArray(args.items) ? args.items.slice(0, 4) : [];
      const currency = args.currency ?? ctx.currency;
      const fetched = await Promise.all(
        rawItems.map((it) => kapruka.getProduct({ product_id: it.product_id, currency }))
      );
      const items: BundleItem[] = [];
      fetched.forEach((res, i) => {
        if (res.ok) {
          items.push({
            product: mapDetailProduct(res.data),
            quantity: Math.min(10, Math.max(1, rawItems[i].quantity ?? 1)),
            reason: rawItems[i].reason || undefined,
          });
        }
      });
      if (items.length < 2) {
        return {
          result: "Couldn't load enough valid products for a bundle — search again and use exact product_ids.",
          cards: [],
        };
      }
      const total = items.reduce((s, it) => s + (it.product.price.amount ?? 0) * it.quantity, 0);
      const budget = typeof args.budget === "number" ? args.budget : null;
      const brief = items.map((it) => `${it.quantity}× ${it.product.name} (${currency} ${it.product.price.amount ?? "?"})`).join("; ");
      return {
        result: `Bundle "${args.title}" with ${items.length} items, total ${currency} ${total}${
          budget ? ` (budget ${currency} ${budget}${total > budget ? " — OVER budget, consider trimming" : " — within budget"})` : ""
        }: ${brief}. Shown as a card with 'Add all to cart'.`,
        cards: [
          {
            component: "bundle",
            data: { title: args.title, occasion: args.occasion, budget, currency, items, total },
          },
        ],
      };
    }

    case "compare_products": {
      const ids: string[] = Array.isArray(args.product_ids) ? args.product_ids.slice(0, 4) : [];
      const currency = args.currency ?? ctx.currency;
      const fetched = await Promise.all(ids.map((id) => kapruka.getProduct({ product_id: id, currency })));
      const products: Product[] = fetched.filter((r) => r.ok).map((r: any) => mapDetailProduct(r.data));
      if (products.length < 2) {
        return { result: "Need at least 2 valid products to compare — use exact product_ids from search results.", cards: [] };
      }
      const brief = products
        .map((p) => `${p.name}: ${p.price.currency} ${p.price.amount ?? "?"}, ${p.in_stock ? "in stock" : "out of stock"}`)
        .join(" | ");
      return {
        result: `Comparison shown for ${products.length} products — ${brief}. Now give a confident recommendation.`,
        cards: [{ component: "compare", data: { products } }],
      };
    }

    case "remember": {
      const op = buildProfileOp(args);
      if (!op) return { result: "Nothing specific to remember from that.", cards: [] };
      return { result: "Noted — Kapri will remember that.", cards: [{ component: "profile_op", data: op }] };
    }

    default:
      return { result: `Unknown tool: ${name}`, cards: [] };
  }
}
