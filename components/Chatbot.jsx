import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* ─────────────── helpers ─────────────── */
const API = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return "";
  return "http://localhost:5001";
};

const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/* ─────────────── knowledge base ─────────────── */
const COMPANY = {
  name: "Nisarg Maitri",
  tagline: "Sustainable Living, Naturally",
  phone: "+91 9999010997",
  email: "nisargmaitri4@gmail.com",
  website: "www.nisargmaitri.in",
  address1:
    "Parsvnath Edens, Near Ryan International School, Alpha 2, Greater Noida – 201306",
  address2: "Tilak Nagar, Indore, Madhya Pradesh",
  hours: "Mon – Sat, 9 AM – 6 PM IST",
  shipping: "Pan-India delivery. Free shipping on orders above ₹500.",
  returns: "30-day hassle-free returns on unused products.",
  categories: ["Bamboo", "Steel", "Menstrual", "Zero Waste"],
};

const FAQ = [
  { q: "shipping", a: `🚚 ${COMPANY.shipping} Orders typically reach you within 5-7 business days.` },
  { q: "return",   a: `🔄 ${COMPANY.returns} Just reach out to us and we'll handle the rest.` },
  { q: "contact",  a: `📞 **Phone / WhatsApp:** ${COMPANY.phone}\n📧 **Email:** ${COMPANY.email}\n📍 **Office:** ${COMPANY.address1}\n⏰ **Hours:** ${COMPANY.hours}` },
  { q: "payment",  a: "💳 We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD)." },
  { q: "bamboo_info", a: "🎋 Bamboo products are 100% natural, biodegradable, and antibacterial. They typically last 1-5 years. Bamboo grows 30× faster than trees and absorbs 35% more CO₂!" },
  { q: "menstrual_info", a: "🌸 Our menstrual cups are made from medical-grade silicone, FDA approved, and last 10+ years. They provide 12 hours of leak-free protection and save over ₹20,000 compared to disposables." },
  { q: "steel_info", a: "🥤 Our stainless steel products are food-grade, 100% recyclable, BPA-free, and built to last a lifetime. Steel retains temperature for hours and never leaches chemicals." },
  { q: "clean",    a: "🧼 Most of our products are easy to clean — bamboo items can be hand-washed with mild soap, steel products are dishwasher-safe, and menstrual cups can be sterilized by boiling for 5 minutes." },
  { q: "bulk",     a: "📦 Yes! We offer bulk discounts — 15% off on ₹1,000+, 20% off on ₹2,000+. Perfect for offices, schools, and corporate gifting. Contact us for custom quotes." },
  { q: "safe",     a: "✅ All our products are rigorously tested. Bamboo is naturally antibacterial, our steel is food-grade 304, and menstrual cups are medical-grade silicone — completely safe for daily use." },
];

const ECO_TIPS = [
  "🪥 Switch to a bamboo toothbrush — it prevents 4+ plastic brushes from ending up in landfills every year.",
  "💧 Carry a reusable steel water bottle — it can save 1,000+ single-use plastic bottles annually.",
  "🌸 One menstrual cup replaces 2,400+ disposable pads over its lifetime and saves over ₹20,000.",
  "🍴 Keep a bamboo cutlery set in your bag — never use plastic forks and spoons again.",
  "🧴 Switch to reusable makeup remover pads — one set replaces 1,000+ cotton pads.",
  "🛍️ Always carry a cloth tote bag — India uses 15,000 crore plastic bags every year.",
  "♻️ Start composting kitchen waste — it reduces household waste by 30% and enriches your garden.",
  "💡 Choose products with minimal packaging — packaging accounts for 40% of all plastic waste.",
];

/* ─────────────── intent detection ─────────────── */
const INTENTS = [
  { key: "greeting",  rx: /^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|howdy|sup)\b/i },
  { key: "products",  rx: /\b(product|item|shop|buy|purchase|order|catalog|collection|show me|what do you sell|what you have|show all)\b/i },
  { key: "price",     rx: /\b(price|cost|how much|expensive|cheap|affordable|budget|under|below)\b/i },
  { key: "category",  rx: /\b(bamboo|steel|menstrual|zero.?waste|cup|bottle|toothbrush|cutlery|straw|razor|tote|bag|lunch.?box|tumbler|pad|makeup)\b/i },
  { key: "shipping",  rx: /\b(ship|deliver|dispatch|courier|track|when will|delivery)\b/i },
  { key: "return",    rx: /\b(return|refund|exchange|replace|cancel)\b/i },
  { key: "contact",   rx: /\b(contact|phone|email|call|whatsapp|address|office|location|reach|support)\b/i },
  { key: "payment",   rx: /\b(pay|payment|upi|card|cod|cash on delivery|net banking|razorpay)\b/i },
  { key: "clean",     rx: /\b(clean|wash|maintain|care|sterilize|hygiene)\b/i },
  { key: "bulk",      rx: /\b(bulk|wholesale|corporate|gift|discount|coupon|offer)\b/i },
  { key: "safe",      rx: /\b(safe|safety|chemical|toxic|bpa|certified|fda|quality|durable|last)\b/i },
  { key: "eco",       rx: /\b(eco|green|sustain|environment|planet|recycle|compost|tip|advice|impact)\b/i },
  { key: "about",     rx: /\b(about|who are you|what is nisarg|tell me about|company|brand|mission|story)\b/i },
  { key: "thanks",    rx: /\b(thank|thanks|thx|appreciate)\b/i },
  { key: "bye",       rx: /\b(bye|goodbye|see you|exit|close|quit)\b/i },
];

const detect = (text) => {
  const t = text.toLowerCase().trim();
  for (const { key, rx } of INTENTS) if (rx.test(t)) return key;
  return "unknown";
};

const parseBudget = (text) => {
  const m = text.match(
    /(?:under|below|around|budget|within|upto|up to|max|less than)?\s*₹?\s*(\d{2,5})/i,
  );
  return m ? parseInt(m[1], 10) : null;
};

const parseCategory = (text) => {
  const t = text.toLowerCase();
  if (/bamboo|toothbrush|cutlery|straw|razor/.test(t)) return "Bamboo";
  if (/steel|bottle|lunch.?box|tumbler/.test(t)) return "Steel";
  if (/menstrual|cup|period/.test(t)) return "Menstrual";
  if (/zero.?waste|tote|bag|pad|makeup/.test(t)) return "Zero Waste";
  return null;
};

/* ─────────────── markdown renderer ─────────────── */
const Md = ({ text }) => {
  if (!text) return null;
  return (
    <div className="space-y-1 text-[13px] leading-[1.6]">
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*)/g).map((seg, j) =>
          seg.startsWith("**") && seg.endsWith("**") ? (
            <strong key={j} className="font-semibold">{seg.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{seg}</span>
          ),
        );
        return <p key={i} className="min-h-[1.1em]">{parts}</p>;
      })}
    </div>
  );
};

/* ─────────────── product card ─────────────── */
const ProductCard = ({ p, onView }) => (
  <div className="flex items-center gap-3 bg-gray-50/80 rounded-xl p-2.5 border border-gray-100/80 hover:border-gray-200 transition group">
    {p.image ? (
      <img
        src={p.image}
        alt={p.name}
        className="w-12 h-12 rounded-lg object-cover bg-white border border-gray-100 flex-shrink-0"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    ) : (
      <div className="w-12 h-12 rounded-lg bg-[#1A3329]/8 flex items-center justify-center text-base flex-shrink-0">
        🌿
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[12.5px] font-semibold text-gray-800 truncate">{p.name}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[12.5px] font-bold text-[#1A3329]">{money(p.price)}</span>
        {p.comparePrice > p.price && (
          <span className="text-[10.5px] text-gray-400 line-through">{money(p.comparePrice)}</span>
        )}
        <span className="text-[10px] text-gray-400">· {p.category}</span>
      </div>
    </div>
    <button
      onClick={onView}
      className="flex-shrink-0 text-[10.5px] font-semibold px-3 py-1.5 rounded-lg bg-[#1A3329] text-white hover:bg-[#2F6844] transition cursor-pointer opacity-80 group-hover:opacity-100"
    >
      View
    </button>
  </div>
);

/* ═══════════════════════════════════════════
   CHATBOT
   ═══════════════════════════════════════════ */
const Chatbot = () => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [products, setProducts] = useState([]);
  const [pulse, setPulse] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  /* ── fetch real products ── */
  useEffect(() => {
    axios
      .get(API() + "/api/products")
      .then((r) => setProducts(r.data.filter((p) => p.isActive)))
      .catch(() => {});
  }, []);

  /* ── welcome message ── */
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          role: "bot",
          text: `Namaste! 🙏 Welcome to **${COMPANY.name}**.\n\nI can help you with:\n• Browse our eco-friendly products\n• Shipping & returns info\n• Payment options\n• Eco tips & sustainability advice\n• Contact & support\n\nHow can I help you today?`,
          ts: Date.now(),
        },
      ]);
    }
  }, []);

  /* ── auto scroll ── */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* ── focus on open ── */
  useEffect(() => {
    if (open) {
      setPulse(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  /* ── response engine ── */
  const buildReply = useCallback(
    (text) => {
      const intent = detect(text);
      const budget = parseBudget(text);
      const cat = parseCategory(text);

      /* greeting */
      if (intent === "greeting") {
        return {
          text: `Hello! 👋 Welcome to **${COMPANY.name}** — India's trusted eco-friendly brand.\n\nWhat would you like to know about?`,
          followUp: [
            { label: "🛍️ Show Products", val: "Show me your products" },
            { label: "🌱 Eco Tips", val: "Give me eco tips" },
            { label: "ℹ️ About Us", val: "Tell me about Nisarg Maitri" },
          ],
        };
      }

      /* about */
      if (intent === "about") {
        return {
          text: `**${COMPANY.name}** is on a mission to make sustainable living accessible to every Indian household.\n\nWe offer carefully curated eco-friendly products across **Bamboo, Stainless Steel, Menstrual Care**, and **Zero Waste** categories — all tested for quality, safety, and minimal environmental impact.\n\n📍 Based in Greater Noida & Indore\n📞 ${COMPANY.phone}\n📧 ${COMPANY.email}`,
          followUp: [
            { label: "🛍️ Browse Products", val: "Show me your products" },
            { label: "📞 Contact Info", val: "How can I contact you?" },
            { label: "🚚 Shipping Info", val: "How does shipping work?" },
          ],
        };
      }

      /* FAQ lookups with follow-ups */
      if (intent === "shipping") {
        const faq = FAQ.find((f) => f.q === "shipping");
        return {
          text: faq.a,
          followUp: [
            { label: "🔄 Return Policy", val: "What is your return policy?" },
            { label: "💳 Payment Options", val: "What payment methods do you accept?" },
            { label: "🛍️ Browse Products", val: "Show me your products" },
          ],
        };
      }
      if (intent === "return") {
        const faq = FAQ.find((f) => f.q === "return");
        return {
          text: faq.a,
          followUp: [
            { label: "🚚 Shipping Info", val: "How does shipping work?" },
            { label: "📞 Contact Support", val: "How can I contact you?" },
            { label: "🛍️ Browse Products", val: "Show me your products" },
          ],
        };
      }
      if (intent === "contact") {
        const faq = FAQ.find((f) => f.q === "contact");
        return {
          text: faq.a,
          followUp: [
            { label: "🛍️ Browse Products", val: "Show me your products" },
            { label: "📦 Bulk Orders", val: "Do you offer bulk discounts?" },
            { label: "🚚 Shipping Info", val: "How does shipping work?" },
          ],
        };
      }
      if (intent === "payment") {
        const faq = FAQ.find((f) => f.q === "payment");
        return {
          text: faq.a,
          followUp: [
            { label: "🚚 Shipping Info", val: "How does shipping work?" },
            { label: "🔄 Return Policy", val: "What is your return policy?" },
            { label: "🛍️ Shop Now", val: "Show me your products" },
          ],
        };
      }
      if (intent === "clean") {
        const faq = FAQ.find((f) => f.q === "clean");
        return {
          text: faq.a,
          followUp: [
            { label: "✅ Safety & Quality", val: "Are your products safe?" },
            { label: "🎋 Bamboo Products", val: "Show me bamboo products" },
            { label: "🥤 Steel Products", val: "Show me steel products" },
          ],
        };
      }
      if (intent === "bulk") {
        const faq = FAQ.find((f) => f.q === "bulk");
        return {
          text: faq.a,
          followUp: [
            { label: "📞 Contact Us", val: "How can I contact you?" },
            { label: "💳 Payment Options", val: "What payment methods do you accept?" },
            { label: "🛍️ Browse Products", val: "Show me your products" },
          ],
        };
      }
      if (intent === "safe") {
        const faq = FAQ.find((f) => f.q === "safe");
        return {
          text: faq.a,
          followUp: [
            { label: "🧼 How to Clean", val: "How do I clean these products?" },
            { label: "🌸 Menstrual Care", val: "Tell me about menstrual products" },
            { label: "🛍️ Shop Now", val: "Show me your products" },
          ],
        };
      }

      /* eco tips */
      if (intent === "eco") {
        const picks = [...ECO_TIPS].sort(() => 0.5 - Math.random()).slice(0, 3);
        return {
          text: `Here are some eco-friendly tips for you:\n\n${picks.join("\n\n")}\n\nWant to see products that help you live sustainably? Just ask!`,
          followUp: [
            { label: "🛍️ Browse Products", val: "Show me your products" },
            { label: "🎋 Bamboo Items", val: "Show me bamboo products" },
            { label: "🌱 More Eco Tips", val: "Give me more eco tips" },
          ],
        };
      }

      /* ── products / price / category ── */
      if (intent === "products" || intent === "price" || intent === "category" || budget || cat) {
        let list = products.filter((p) => p.stock > 0);

        /* category-specific info */
        if (cat && !budget && intent === "category") {
          const infoMap = {
            Bamboo: FAQ.find((f) => f.q === "bamboo_info"),
            Steel: FAQ.find((f) => f.q === "steel_info"),
            Menstrual: FAQ.find((f) => f.q === "menstrual_info"),
          };
          const info = infoMap[cat];
          const catProducts = list.filter((p) => p.category === cat).slice(0, 4);
          if (catProducts.length > 0) {
            const otherCategories = COMPANY.categories.filter((c) => c !== cat);
            const catFollowUp = otherCategories.slice(0, 2).map((c) => ({
              label: `${c === "Bamboo" ? "🎋" : c === "Steel" ? "🥤" : c === "Menstrual" ? "🌸" : "♻️"} ${c} Products`,
              val: `Show me ${c.toLowerCase()} products`,
            }));
            catFollowUp.push({ label: "🚚 Shipping Info", val: "How does shipping work?" });
            return {
              text: info
                ? `${info.a}\n\nHere are our **${cat}** products:`
                : `Here are our **${cat}** products:`,
              products: catProducts,
              followUp: catFollowUp,
            };
          }
        }

        if (cat) list = list.filter((p) => p.category === cat);
        if (budget) list = list.filter((p) => p.price <= budget);

        if (budget) list.sort((a, b) => a.price - b.price);
        else list.sort((a, b) => b.stock - a.stock);

        const top = list.slice(0, 4);

        if (top.length === 0) {
          const hint = budget
            ? ` under ${money(budget)}`
            : cat
            ? ` in ${cat}`
            : "";
          return {
            text: `Sorry, I couldn't find products${hint} right now. Try browsing our full collection in the shop!`,
            action: "shop",
            followUp: [
              { label: "🛍️ All Products", val: "Show me your products" },
              { label: "🌱 Eco Tips", val: "Give me eco tips" },
              { label: "📞 Contact Us", val: "How can I contact you?" },
            ],
          };
        }

        const label =
          cat && budget
            ? `**${cat}** products under **${money(budget)}**`
            : cat
            ? `**${cat}** products`
            : budget
            ? `Products under **${money(budget)}**`
            : "Here are some of our popular products";

        return {
          text: `${label}:`,
          products: top,
          followUp: [
            { label: "🎋 Bamboo", val: "Show me bamboo products" },
            { label: "🥤 Steel", val: "Show me steel products" },
            { label: "🌸 Menstrual", val: "Show me menstrual products" },
            { label: "💳 Payments", val: "What payment methods do you accept?" },
          ],
        };
      }

      /* thanks */
      if (intent === "thanks") {
        return {
          text: "You're welcome! 😊 Happy to help. What else would you like to know?",
          followUp: [
            { label: "🛍️ Products", val: "Show me your products" },
            { label: "🌱 Eco Tips", val: "Give me eco tips" },
            { label: "📞 Contact", val: "How can I contact you?" },
          ],
        };
      }

      /* bye */
      if (intent === "bye") {
        return {
          text: `Thank you for visiting **${COMPANY.name}**! 🌱\n\nHave a great day and keep making eco-friendly choices. We're here whenever you need us!`,
          followUp: [
            { label: "🛍️ Quick Shop", val: "Show me your products" },
            { label: "📞 Contact", val: "How can I contact you?" },
          ],
        };
      }

      /* ── fallback ── */
      return {
        text: `I can help you with anything related to **${COMPANY.name}** — our products, shipping, payments, returns, or eco tips.\n\nCould you rephrase your question? Or try one of the options below!`,
        followUp: [
          { label: "🛍️ Products", val: "Show me your products" },
          { label: "🚚 Shipping", val: "How does shipping work?" },
          { label: "🌱 Eco Tips", val: "Give me eco tips" },
          { label: "📞 Contact", val: "How can I contact you?" },
        ],
      };
    },
    [products],
  );

  /* ── send handler ── */
  const send = useCallback(
    (text) => {
      if (!text.trim() || typing) return;
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", text: text.trim(), ts: Date.now() },
      ]);
      setInput("");
      setTyping(true);

      setTimeout(() => {
        const reply = buildReply(text.trim());
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "bot", ...reply, ts: Date.now() },
        ]);
        setTyping(false);
      }, 500 + Math.random() * 600);
    },
    [typing, buildReply],
  );

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([
        {
          id: Date.now(),
          role: "bot",
          text: `Chat cleared! How can I help you with **${COMPANY.name}** products today?`,
          ts: Date.now(),
        },
      ]);
    }, 80);
  };

  /* ── quick chips (always visible main menu) ── */
  const CHIPS = useMemo(
    () => [
      { label: "🛍️ Products", val: "Show me your products" },
      { label: "🚚 Shipping", val: "How does shipping work?" },
      { label: "🌱 Eco Tips", val: "Give me eco tips" },
      { label: "💳 Payments", val: "What payment methods do you accept?" },
      { label: "📞 Contact", val: "How can I contact you?" },
      { label: "🔄 Returns", val: "What is your return policy?" },
      { label: "📦 Bulk Order", val: "Do you offer bulk discounts?" },
      { label: "ℹ️ About Us", val: "Tell me about Nisarg Maitri" },
    ],
    [],
  );

  /* should we show chips below a message */
  const alwaysShowMenu = true;

  /* ═══════════ RENDER ═══════════ */
  return (
    <>
      {/* ── backdrop for mobile (tap to close) ── */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex flex-col items-end gap-3">
        {/* ── chat window ── */}
        <div
          id="chatbot-window"
          className={`
            bg-white flex flex-col overflow-hidden
            transition-all duration-300 ease-out origin-bottom-right
            
            /* Mobile: full screen overlay */
            fixed inset-0 z-50 rounded-none border-0
            
            /* Tablet and up: floating card */
            sm:relative sm:inset-auto sm:mb-3
            sm:w-[380px] sm:max-w-[calc(100vw-40px)] sm:rounded-2xl sm:shadow-2xl sm:shadow-black/10 sm:border sm:border-gray-200/60
            sm:h-[min(600px,calc(100dvh-100px))]
            
            /* Animation */
            ${open
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto h-[100dvh] sm:h-[min(600px,calc(100dvh-100px))]"
              : "opacity-0 translate-y-4 sm:translate-y-3 scale-100 sm:scale-[0.92] pointer-events-none !h-0 absolute sm:relative"
            }
          `}
        >
          {/* header */}
          <div className="bg-[#1A3329] px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0" style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 flex items-center justify-center text-sm sm:text-[15px]">
                🌿
              </div>
              <div>
                <p className="text-[13px] sm:text-[13.5px] font-semibold text-white leading-tight tracking-wide">
                  {COMPANY.name}
                </p>
                <p className="text-[10px] sm:text-[10.5px] text-white/50 flex items-center gap-1.5 mt-0.5">
                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 inline-block" />
                  Typically replies instantly
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={reset}
                className="p-2 rounded-lg hover:bg-white/10 active:bg-white/15 transition text-white/50 hover:text-white cursor-pointer"
                title="Clear chat"
              >
                <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 active:bg-white/15 transition text-white/50 hover:text-white cursor-pointer"
                title="Close chat"
              >
                <svg className="w-[15px] h-[15px] sm:block hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {/* X icon for mobile - easier to understand */}
                <svg className="w-[15px] h-[15px] sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* messages area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 bg-[#fafafa] scrollbar-thin overscroll-contain">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "bot" ? "justify-start" : "justify-end"} animate-[fadeSlideIn_0.25s_ease-out]`}
              >
                {m.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-[#1A3329] flex items-center justify-center text-[10px] text-white flex-shrink-0 mt-1 mr-2">
                    🌿
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-3.5 py-2 sm:py-2.5 ${
                    m.role === "bot"
                      ? "bg-white text-gray-700 rounded-2xl rounded-tl-md shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-gray-100/80"
                      : "bg-[#1A3329] text-white rounded-2xl rounded-tr-md"
                  }`}
                >
                  <Md text={m.text} />

                  {/* product cards */}
                  {m.products?.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {m.products.map((p) => (
                        <ProductCard
                          key={p._id || p.name}
                          p={p}
                          onView={() => { setOpen(false); navigate("/shop"); }}
                        />
                      ))}
                      <button
                        onClick={() => { setOpen(false); navigate("/shop"); }}
                        className="w-full text-center text-[11px] font-semibold text-[#1A3329] hover:text-[#2F6844] py-1.5 transition cursor-pointer active:scale-95"
                      >
                        View all in Shop →
                      </button>
                    </div>
                  )}

                  {m.action === "shop" && (
                    <button
                      onClick={() => { setOpen(false); navigate("/shop"); }}
                      className="mt-2 text-[11.5px] font-semibold text-[#1A3329] hover:text-[#2F6844] underline underline-offset-2 transition cursor-pointer active:scale-95"
                    >
                      Browse Shop →
                    </button>
                  )}

                  {/* inline follow-up suggestions */}
                  {m.followUp?.length > 0 && m.id === messages[messages.length - 1]?.id && !typing && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.followUp.map((f) => (
                        <button
                          key={f.label}
                          onClick={() => send(f.val)}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#1A3329]/[0.07] text-[#1A3329] hover:bg-[#1A3329]/[0.15] active:bg-[#1A3329]/[0.2] border border-[#1A3329]/10 hover:border-[#1A3329]/25 transition cursor-pointer active:scale-95"
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] sm:text-[9.5px] opacity-40 mt-1.5 text-right">
                    {new Date(m.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* typing */}
            {typing && (
              <div className="flex justify-start animate-[fadeSlideIn_0.2s_ease-out]">
                <div className="w-6 h-6 rounded-full bg-[#1A3329] flex items-center justify-center text-[10px] text-white flex-shrink-0 mt-1 mr-2">
                  🌿
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-md shadow-sm border border-gray-100/80">
                  <div className="flex items-center gap-1">
                    <span className="w-[6px] h-[6px] rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-[6px] h-[6px] rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-[6px] h-[6px] rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* ── persistent main menu chips ── */}
          {alwaysShowMenu && !typing && (
            <div className="px-3 sm:px-4 pb-2 pt-2 bg-white border-t border-gray-100/80 flex-shrink-0">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Quick Menu</p>
              <div className="flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => send(c.val)}
                    className="text-[10px] sm:text-[10.5px] font-medium px-2.5 sm:px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#1A3329] hover:text-[#1A3329] hover:bg-[#1A3329]/[0.04] active:bg-[#1A3329]/[0.1] active:scale-95 transition cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* input bar */}
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-t border-gray-100/80 flex-shrink-0" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about products, shipping, tips…"
                disabled={typing}
                maxLength={300}
                className="flex-1 text-[14px] sm:text-[13px] h-11 sm:h-10 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#1A3329]/20 transition placeholder:text-gray-400 disabled:opacity-40"
              />
              <button
                onClick={() => send(input)}
                disabled={typing || !input.trim()}
                className="h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl bg-[#1A3329] text-white hover:bg-[#2F6844] active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              >
                <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[9px] sm:text-[9.5px] text-gray-400 mt-1.5 text-center">
              Powered by {COMPANY.name} ·{" "}
              <span
                className="text-gray-500 cursor-pointer hover:underline active:text-[#1A3329]"
                onClick={() => { setOpen(false); navigate("/contact"); }}
              >
                Talk to a human
              </span>
            </p>
          </div>
        </div>

        {/* ── FAB (floating action button) ── */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative w-14 h-14 rounded-full bg-[#1A3329] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200 flex items-center justify-center cursor-pointer flex-shrink-0 z-[51]"
          aria-label="Chat with us"
        >
          {/* X icon when open */}
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
          {/* Pulse indicator */}
          {pulse && !open && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
            </span>
          )}
        </button>

        {/* CSS keyframes & safe area insets */}
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .safe-area-top {
            padding-top: max(0.75rem, env(safe-area-inset-top));
          }
          .safe-area-bottom {
            padding-bottom: max(0.625rem, env(safe-area-inset-bottom));
          }
          /* Hide scrollbar but keep functionality */
          .scrollbar-thin::-webkit-scrollbar {
            width: 4px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.15);
            border-radius: 4px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.25);
          }
        `}</style>
      </div>
    </>
  );
};

export default Chatbot;
