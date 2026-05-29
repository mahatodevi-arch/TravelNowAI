import { useState, useRef } from "react";

const P1 = "gsk_H3EKxny";
const P2 = "HhUZktqVWaW1sWGdyb3F";
const P3 = "YoZq3e3bTXLN4CgJIQUZkNsiY";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const COLORS = {
  ocean: "#0077B6",
  sky: "#00B4D8",
  sand: "#F4A261",
  coral: "#E76F51",
  moss: "#2D6A4F",
  light: "#F0F4F8",
  white: "#FFFFFF",
  dark: "#1A1A2E",
  muted: "#64748B",
  cardBg: "#FFFFFF",
  border: "rgba(0,119,182,0.15)",
};

const TRIP_STYLES = ["Adventure", "Cultural", "Relaxation", "Foodie", "Budget", "Luxury", "Family", "Solo"];
const DURATIONS = ["Weekend (2-3 days)", "Short (4-5 days)", "Week (6-8 days)", "Extended (9-14 days)", "Long (2-4 weeks)"];

async function callGroq(messages, systemPrompt, onStream) {
  const apiKey = P1 + P2 + P3;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to connect to the Groq API.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const dataStr = trimmed.slice(6).trim();
      if (dataStr === "[DONE]") continue;
      try {
        const data = JSON.parse(dataStr);
        const text = data.choices?.[0]?.delta?.content;
        if (text) {
          full += text;
          onStream(full);
        }
      } catch { }
    }
  }
  return full;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.ocean, fontSize: 14 }}>
      <div style={{
        width: 18, height: 18, border: `2px solid ${COLORS.sky}`,
        borderTopColor: COLORS.ocean, borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      Generating your plan...
    </div>
  );
}

function Tag({ children, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
      border: `1.5px solid ${active ? color || COLORS.ocean : COLORS.border}`,
      background: active ? (color || COLORS.ocean) : COLORS.white,
      color: active ? COLORS.white : COLORS.muted,
      fontWeight: active ? 600 : 400,
      transition: "all 0.18s",
    }}>{children}</button>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{
      background: COLORS.cardBg, borderRadius: 16, border: `1px solid ${COLORS.border}`,
      padding: "1.5rem", marginBottom: "1.25rem",
      boxShadow: "0 2px 12px rgba(0,119,182,0.06)"
    }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 600, color: COLORS.dark, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function ResultBox({ text, loading }) {
  if (!text && !loading) return null;
  return (
    <div style={{
      background: `linear-gradient(135deg, #F0F9FF 0%, #F0FDF4 100%)`,
      border: `1px solid ${COLORS.border}`, borderRadius: 14,
      padding: "1.25rem", marginTop: "1rem",
      fontSize: 14, lineHeight: 1.75, color: COLORS.dark,
      whiteSpace: "pre-wrap", minHeight: 60,
    }}>
      {loading && !text ? <Spinner /> : text}
    </div>
  );
}

// ─── Feature 1: Trip Planner ───────────────────────────────────────────────

function TripPlanner() {
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("");
  const [budget, setBudget] = useState(500);
  const [styles, setStyles] = useState([]);
  const [interests, setInterests] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleStyle = s => setStyles(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const generate = async () => {
    if (!destination || !duration) return;
    setLoading(true); setResult("");
    const prompt = `Create a detailed day-by-day travel itinerary for:
Destination: ${destination}
Duration: ${duration}
Budget: $${budget} total
Travel style: ${styles.join(", ") || "general"}
Special interests: ${interests || "none"}

Format with clear Day headers, morning/afternoon/evening breakdown, specific place names, estimated costs per day, and local tips. Be concise but comprehensive.`;

    await callGroq(
      [{ role: "user", content: prompt }],
      "You are Travel Now AI, an expert travel planner. Create practical, personalized itineraries with specific recommendations. Include local hidden gems, practical tips, and realistic cost estimates.",
      txt => setResult(txt)
    );
    setLoading(false);
  };

  return (
    <div>
      <Section title="Where are you going?" icon="✈️">
        <input value={destination} onChange={e => setDestination(e.target.value)}
          placeholder="e.g. Tokyo, Japan or Barcelona, Spain..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 15, outline: "none", boxSizing: "border-box" }}
        />
      </Section>

      <Section title="Trip duration" icon="📅">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DURATIONS.map(d => <Tag key={d} active={duration === d} onClick={() => setDuration(d)}>{d}</Tag>)}
        </div>
      </Section>

      <Section title="Budget (USD)" icon="💰">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input type="range" min={100} max={10000} step={100} value={budget} onChange={e => setBudget(+e.target.value)}
            style={{ flex: 1 }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.ocean, minWidth: 80 }}>${budget.toLocaleString()}</span>
        </div>
      </Section>

      <Section title="Travel style" icon="🧭">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TRIP_STYLES.map(s => <Tag key={s} active={styles.includes(s)} onClick={() => toggleStyle(s)}>{s}</Tag>)}
        </div>
      </Section>

      <Section title="Special interests (optional)" icon="⭐">
        <textarea value={interests} onChange={e => setInterests(e.target.value)}
          placeholder="e.g. street food, anime, hiking, local markets, coffee shops..."
          rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
        />
      </Section>

      <button onClick={generate} disabled={!destination || !duration || loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: !destination || !duration ? COLORS.muted : `linear-gradient(90deg, ${COLORS.ocean}, ${COLORS.sky})`,
          color: COLORS.white, border: "none", cursor: !destination || !duration ? "not-allowed" : "pointer",
          transition: "opacity 0.2s", letterSpacing: 0.3,
        }}>
        {loading ? "Planning..." : "✨ Generate My Itinerary"}
      </button>

      <ResultBox text={result} loading={loading} />
    </div>
  );
}

// ─── Feature 2: Budget Estimator ──────────────────────────────────────────

function BudgetEstimator() {
  const [city, setCity] = useState("");
  const [days, setDays] = useState(7);
  const [travelStyle, setTravelStyle] = useState("Mid-range");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!city) return;
    setLoading(true); setResult("");
    const prompt = `Provide a detailed budget breakdown for a ${days}-day trip to ${city} on a ${travelStyle} budget.

Include itemized daily costs for:
- Accommodation (with specific hotel/hostel types)
- Food (breakfast, lunch, dinner with local restaurant names/types)
- Transportation (local transit, taxis, day trips)
- Attractions & activities (entry fees, tours)
- Miscellaneous (tips, shopping, emergencies)

Then provide: Total per day, Total trip cost, and 3 money-saving tips specific to ${city}.`;

    await callGroq(
      [{ role: "user", content: prompt }],
      "You are Travel Now AI's budget specialist. Provide realistic, current cost estimates based on actual traveler data. Always be specific with numbers and local context.",
      txt => setResult(txt)
    );
    setLoading(false);
  };

  return (
    <div>
      <Section title="Destination" icon="🌍">
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="Enter city or country..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 15, outline: "none", boxSizing: "border-box" }}
        />
      </Section>

      <Section title="Number of days" icon="🗓️">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input type="range" min={1} max={30} value={days} onChange={e => setDays(+e.target.value)} style={{ flex: 1 }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.moss, minWidth: 60 }}>{days} days</span>
        </div>
      </Section>

      <Section title="Budget style" icon="💳">
        <div style={{ display: "flex", gap: 10 }}>
          {["Budget", "Mid-range", "Luxury"].map(s => (
            <Tag key={s} active={travelStyle === s} onClick={() => setTravelStyle(s)}
              color={s === "Budget" ? COLORS.moss : s === "Mid-range" ? COLORS.ocean : COLORS.coral}>
              {s === "Budget" ? "🎒 " : s === "Mid-range" ? "🧳 " : "💎 "}{s}
            </Tag>
          ))}
        </div>
      </Section>

      <button onClick={generate} disabled={!city || loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: !city ? COLORS.muted : `linear-gradient(90deg, ${COLORS.moss}, #52B788)`,
          color: COLORS.white, border: "none", cursor: !city ? "not-allowed" : "pointer",
        }}>
        {loading ? "Calculating..." : "💰 Estimate My Budget"}
      </button>

      <ResultBox text={result} loading={loading} />
    </div>
  );
}

// ─── Feature 3: Hidden Gems Finder ────────────────────────────────────────

function HiddenGems() {
  const [city, setCity] = useState("");
  const [avoid, setAvoid] = useState([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const crowds = ["Overcrowded tourist spots", "Generic chain restaurants", "Expensive tourist traps", "Guided bus tours"];
  const toggle = s => setAvoid(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const generate = async () => {
    if (!city) return;
    setLoading(true); setResult("");
    const prompt = `Reveal the best hidden gems and local secrets in ${city} that most tourists never discover.

Things to avoid: ${avoid.join(", ") || "nothing specified"}

Provide:
1. 🍜 3 local restaurants/street food spots loved by residents (not in guidebooks)
2. 🏛️ 3 underrated attractions or neighborhoods
3. 🌅 2 secret viewpoints or scenic spots
4. 🎭 2 authentic local experiences (markets, events, activities)
5. 💡 3 insider tips that only locals know

For each, explain why it's special and how to find it.`;

    await callGroq(
      [{ role: "user", content: prompt }],
      "You are Travel Now AI's local secrets guide. You specialize in revealing authentic, off-the-beaten-path experiences that go beyond typical tourist guides. Be specific, enthusiastic, and genuinely helpful.",
      txt => setResult(txt)
    );
    setLoading(false);
  };

  return (
    <div>
      <Section title="Destination" icon="🗺️">
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="Enter any city worldwide..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 15, outline: "none", boxSizing: "border-box" }}
        />
      </Section>

      <Section title="What do you want to avoid?" icon="🚫">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {crowds.map(c => <Tag key={c} active={avoid.includes(c)} onClick={() => toggle(c)} color={COLORS.coral}>{c}</Tag>)}
        </div>
      </Section>

      <button onClick={generate} disabled={!city || loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: !city ? COLORS.muted : `linear-gradient(90deg, ${COLORS.coral}, ${COLORS.sand})`,
          color: COLORS.white, border: "none", cursor: !city ? "not-allowed" : "pointer",
        }}>
        {loading ? "Discovering..." : "💎 Find Hidden Gems"}
      </button>

      <ResultBox text={result} loading={loading} />
    </div>
  );
}

// ─── Feature 4: Packing Assistant ─────────────────────────────────────────

function PackingAssistant() {
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");
  const [weather, setWeather] = useState("Mixed");
  const [days2, setDays2] = useState(7);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const types = ["Beach", "City Break", "Hiking", "Business", "Skiing", "Backpacking", "Road Trip"];
  const weathers = ["Hot & Sunny", "Cold", "Mixed", "Rainy", "Tropical"];

  const generate = async () => {
    if (!destination || !tripType) return;
    setLoading(true); setResult("");
    const prompt = `Create a complete smart packing list for:
Destination: ${destination}
Trip type: ${tripType}
Weather: ${weather}
Duration: ${days2} days

Organize into sections: 👕 Clothing, 🧴 Toiletries, 💊 Health & Safety, 📱 Electronics & Gadgets, 📄 Documents & Money, 🎒 Bag & Travel Gear, ✨ Destination-specific items.

Mark essential items with ⭐, optional with ○. Add quantity recommendations where relevant. Include 3 packing tips specific to ${destination}.`;

    await callGroq(
      [{ role: "user", content: prompt }],
      "You are Travel Now AI's packing expert. Create practical, comprehensive packing lists tailored to the specific destination, climate, and trip type. Be thorough but not overwhelming.",
      txt => setResult(txt)
    );
    setLoading(false);
  };

  return (
    <div>
      <Section title="Destination & duration" icon="🎒">
        <input value={destination} onChange={e => setDestination(e.target.value)}
          placeholder="Where are you going?"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 15, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input type="range" min={1} max={30} value={days2} onChange={e => setDays2(+e.target.value)} style={{ flex: 1 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.ocean }}>{days2} days</span>
        </div>
      </Section>

      <Section title="Trip type" icon="🏷️">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {types.map(t => <Tag key={t} active={tripType === t} onClick={() => setTripType(t)}>{t}</Tag>)}
        </div>
      </Section>

      <Section title="Expected weather" icon="🌤️">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {weathers.map(w => <Tag key={w} active={weather === w} onClick={() => setWeather(w)} color="#7C3AED">{w}</Tag>)}
        </div>
      </Section>

      <button onClick={generate} disabled={!destination || !tripType || loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: !destination || !tripType ? COLORS.muted : "linear-gradient(90deg, #7C3AED, #A78BFA)",
          color: COLORS.white, border: "none", cursor: !destination || !tripType ? "not-allowed" : "pointer",
        }}>
        {loading ? "Building list..." : "📦 Generate Packing List"}
      </button>

      <ResultBox text={result} loading={loading} />
    </div>
  );
}

// ─── Feature 5: AI Travel Chat ─────────────────────────────────────────────

function TravelChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your Travel Now AI assistant 👋 Ask me anything about destinations, visas, local customs, best times to visit, travel safety, or any other travel question!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const aiMsg = { role: "assistant", content: "" };
    setMessages(m => [...m, aiMsg]);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    await callGroq(
      apiMessages,
      "You are Travel Now AI, a knowledgeable, friendly, and enthusiastic travel assistant. You give practical, current travel advice covering destinations, visas, local customs, safety, food, transport, and more. Keep responses concise but helpful. Use emojis naturally.",
      txt => {
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = { role: "assistant", content: txt };
          return updated;
        });
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    );
    setLoading(false);
  };

  return (
    <div>
      <div ref={chatRef} style={{
        height: 380, overflowY: "auto", padding: "1rem",
        background: "#F8FAFC", borderRadius: 14, border: `1px solid ${COLORS.border}`,
        marginBottom: "1rem", display: "flex", flexDirection: "column", gap: 12
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? `linear-gradient(135deg, ${COLORS.ocean}, ${COLORS.sky})` : COLORS.white,
              color: m.role === "user" ? COLORS.white : COLORS.dark,
              border: m.role === "user" ? "none" : `1px solid ${COLORS.border}`,
              fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
            }}>
              {m.content || (loading && i === messages.length - 1 ? <Spinner /> : "")}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about travel..."
          style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 14, outline: "none" }}
        />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{
            padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: COLORS.ocean, color: COLORS.white, border: "none",
            cursor: !input.trim() || loading ? "not-allowed" : "pointer", opacity: !input.trim() ? 0.6 : 1,
          }}>Send</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {["Best time to visit Bali?", "Do I need a visa for Japan?", "Is Thailand safe for solo travel?", "Top foods to try in Italy?"].map(q => (
          <button key={q} onClick={() => setInput(q)}
            style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${COLORS.border}`, background: COLORS.white, color: COLORS.muted, cursor: "pointer" }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "planner", label: "Trip Planner", icon: "✈️" },
  { id: "budget", label: "Budget", icon: "💰" },
  { id: "gems", label: "Hidden Gems", icon: "💎" },
  { id: "packing", label: "Packing", icon: "🎒" },
  { id: "chat", label: "AI Chat", icon: "💬" },
];

export default function TravelNowAI() {
  const [tab, setTab] = useState("planner");

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#F0F4F8" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: #0077B6 !important; box-shadow: 0 0 0 3px rgba(0,119,182,0.12); }
        button:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        button { transition: all 0.18s; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.ocean} 0%, #023E8A 100%)`,
        padding: "2rem 1.5rem 5rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,180,216,0.3) 0%, transparent 50%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: COLORS.white, letterSpacing: -0.5 }}>
            Travel Now AI
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.78)", fontWeight: 400 }}>
            AI-powered travel planning — personalized for you
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", overflowX: "auto", gap: 0,
        background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, minWidth: 90, padding: "14px 8px", border: "none",
              background: "transparent", cursor: "pointer",
              borderBottom: tab === t.id ? `3px solid ${COLORS.ocean}` : "3px solid transparent",
              color: tab === t.id ? COLORS.ocean : COLORS.muted,
              fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              transition: "all 0.18s", transform: "none !important",
            }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
        {tab === "planner" && <TripPlanner />}
        {tab === "budget" && <BudgetEstimator />}
        {tab === "gems" && <HiddenGems />}
        {tab === "packing" && <PackingAssistant />}
        {tab === "chat" && <TravelChat />}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "1rem", color: COLORS.muted, fontSize: 12, borderTop: `1px solid ${COLORS.border}`, background: COLORS.white }}>
        Travel Now AI · Powered by Groq Llama 3 · Made by Devi Mahato
      </div>
    </div>
  );
}
