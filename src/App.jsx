import { useState, useEffect, useRef } from "react";

const API_MODEL = "claude-sonnet-4-20250514";

// ══════════════════════════════════════════
// FOOD CHECKER
// ══════════════════════════════════════════


const CHK_COLORS = {
  bg: "#0f1a14",
  surface: "#162010",
  card: "#1c2b18",
  border: "#2a3d24",
  accent: "#7ec850",
  accentDim: "#4a8a28",
  danger: "#e05252",
  warn: "#e0a452",
  safe: "#7ec850",
  text: "#d4e8c2",
  muted: "#7a9a68",
  white: "#f0f7ea",
};

const chkBadgeStyle = (level) => {
  const map = {
    safe: { bg: "#1a3d1a", color: CHK_COLORS.safe, label: "✓ CKD Safe" },
    caution: { bg: "#3d2e0a", color: CHK_COLORS.warn, label: "⚠ Use Caution" },
    avoid: { bg: "#3d1010", color: CHK_COLORS.danger, label: "✗ Avoid" },
  };
  const s = map[level] || map["caution"];
  return { ...s };
};

function ChkNutrientBar({ label, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: CHK_COLORS.muted, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{label}</span>
        <span style={{ color: CHK_COLORS.text, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ background: "#1a2a14", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function ChkLoadingDots() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: CHK_COLORS.accent,
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function FoodChecker() {
  const [food, setFood] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const checkFood = async () => {
    if (!food.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const prompt = `You are a renal dietitian specializing in vegetarian diets for CKD (Chronic Kidney Disease) patients. Analyze the following food: "${food}"

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "foodName": "proper food name",
  "safetyLevel": "safe" | "caution" | "avoid",
  "potassium": { "per100g": number_in_mg, "risk": "low"|"medium"|"high" },
  "sodium": { "per100g": number_in_mg, "risk": "low"|"medium"|"high" },
  "phosphorus": { "per100g": number_in_mg, "risk": "low"|"medium"|"high" },
  "protein": { "per100g": number_in_g, "risk": "low"|"medium"|"high" },
  "ckdNote": "1-2 sentence plain-English summary of why this food is safe/caution/avoid for CKD patients",
  "tip": "One practical tip for CKD vegetarians regarding this food (e.g. leaching technique, portion size, alternatives)",
  "vegetarianStatus": "vegan" | "vegetarian" | "not-vegetarian"
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: API_MODEL,
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setHistory((h) => [{ food: parsed.foodName, level: parsed.safetyLevel }, ...h.slice(0, 4)]);
    } catch (e) {
      setError("Couldn't analyze that food. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") checkFood();
  };

  const badge = result ? chkBadgeStyle(result.safetyLevel) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: CHK_COLORS.bg,
      fontFamily: "'DM Sans', sans-serif",
      color: CHK_COLORS.text,
      padding: "0 0 60px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: `linear-gradient(180deg, #0a1209 0%, ${CHK_COLORS.bg} 100%)`,
        borderBottom: `1px solid ${CHK_COLORS.border}`,
        padding: "40px 24px 32px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          background: CHK_COLORS.accentDim,
          color: CHK_COLORS.white,
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: 2,
          padding: "4px 12px",
          borderRadius: 20,
          marginBottom: 16,
          textTransform: "uppercase",
        }}>
          CKD · Vegetarian · Nutrition
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(28px, 6vw, 48px)",
          fontWeight: 700,
          color: CHK_COLORS.white,
          margin: "0 0 8px",
          lineHeight: 1.2,
        }}>
          Is This Food Safe<br />
          <span style={{ color: CHK_COLORS.accent }}>for My Kidneys?</span>
        </h1>
        <p style={{ color: CHK_COLORS.muted, fontSize: 15, margin: 0, maxWidth: 400, marginInline: "auto" }}>
          Instant potassium, phosphorus, sodium & protein analysis for CKD vegetarians
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 0" }}>

        {/* Search */}
        <div style={{
          background: CHK_COLORS.card,
          border: `1px solid ${CHK_COLORS.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}>
          <label style={{ display: "block", fontSize: 12, color: CHK_COLORS.muted, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
            Enter a food
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={food}
              onChange={(e) => setFood(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. spinach, lentils, tofu..."
              style={{
                flex: 1,
                background: CHK_COLORS.surface,
                border: `1px solid ${CHK_COLORS.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                color: CHK_COLORS.white,
                fontSize: 15,
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={checkFood}
              disabled={loading || !food.trim()}
              style={{
                background: loading ? CHK_COLORS.accentDim : CHK_COLORS.accent,
                color: "#0a1a08",
                border: "none",
                borderRadius: 10,
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Checking..." : "Check →"}
            </button>
          </div>

          {/* Quick picks */}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Spinach", "Tofu", "White Rice", "Lentils", "Cauliflower", "Banana"].map((f) => (
              <button
                key={f}
                onClick={() => { setFood(f); }}
                style={{
                  background: "transparent",
                  border: `1px solid ${CHK_COLORS.border}`,
                  borderRadius: 20,
                  padding: "4px 12px",
                  color: CHK_COLORS.muted,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && <ChkLoadingDots />}

        {/* Error */}
        {error && (
          <div style={{ background: "#2d1010", border: `1px solid #5a2020`, borderRadius: 12, padding: 16, color: CHK_COLORS.danger, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {/* Safety badge */}
            <div style={{
              background: CHK_COLORS.card,
              border: `1px solid ${CHK_COLORS.border}`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, color: CHK_COLORS.white, fontFamily: "'Playfair Display', serif" }}>
                    {result.foodName}
                  </h2>
                  <span style={{ fontSize: 11, color: CHK_COLORS.muted, fontFamily: "'DM Mono', monospace" }}>
                    {result.vegetarianStatus === "vegan" ? "🌱 Vegan" : result.vegetarianStatus === "vegetarian" ? "🥚 Vegetarian" : "⚠ Not Vegetarian"}
                  </span>
                </div>
                <div style={{
                  background: badge.bg,
                  color: badge.color,
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'DM Mono', monospace",
                  border: `1px solid ${badge.color}33`,
                }}>
                  {badge.label}
                </div>
              </div>

              <p style={{ color: CHK_COLORS.text, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px", background: CHK_COLORS.surface, borderRadius: 10, padding: 14 }}>
                {result.ckdNote}
              </p>

              {/* Nutrient bars */}
              <div>
                <div style={{ fontSize: 11, color: CHK_COLORS.muted, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                  Per 100g
                </div>
                <ChkNutrientBar label="Potassium" value={result.potassium.per100g} max={500} unit="mg"
                  color={result.potassium.risk === "high" ? CHK_COLORS.danger : result.potassium.risk === "medium" ? CHK_COLORS.warn : CHK_COLORS.safe} />
                <ChkNutrientBar label="Sodium" value={result.sodium.per100g} max={400} unit="mg"
                  color={result.sodium.risk === "high" ? CHK_COLORS.danger : result.sodium.risk === "medium" ? CHK_COLORS.warn : CHK_COLORS.safe} />
                <ChkNutrientBar label="Phosphorus" value={result.phosphorus.per100g} max={300} unit="mg"
                  color={result.phosphorus.risk === "high" ? CHK_COLORS.danger : result.phosphorus.risk === "medium" ? CHK_COLORS.warn : CHK_COLORS.safe} />
                <ChkNutrientBar label="Protein" value={result.protein.per100g} max={30} unit="g"
                  color={result.protein.risk === "high" ? CHK_COLORS.danger : result.protein.risk === "medium" ? CHK_COLORS.warn : CHK_COLORS.safe} />
              </div>
            </div>

            {/* Tip */}
            <div style={{
              background: "#162310",
              border: `1px solid ${CHK_COLORS.accentDim}`,
              borderRadius: 12,
              padding: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <div>
                <div style={{ fontSize: 11, color: CHK_COLORS.accent, fontFamily: "'DM Mono', monospace", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Dietitian Tip</div>
                <p style={{ margin: 0, fontSize: 14, color: CHK_COLORS.text, lineHeight: 1.6 }}>{result.tip}</p>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, color: CHK_COLORS.muted, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Recent Checks
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {history.map((h, i) => {
                const b = chkBadgeStyle(h.level);
                return (
                  <button
                    key={i}
                    onClick={() => setFood(h.food)}
                    style={{
                      background: CHK_COLORS.card,
                      border: `1px solid ${b.color}55`,
                      borderRadius: 20,
                      padding: "6px 14px",
                      color: b.color,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {h.food}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p style={{ marginTop: 40, fontSize: 11, color: CHK_COLORS.muted, textAlign: "center", lineHeight: 1.6, fontFamily: "'DM Mono', monospace" }}>
          For informational purposes only. Always consult your renal dietitian<br />before making dietary changes.
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
// FOOD TRACKER
// ══════════════════════════════════════════


const TC = {
  bg: "#0e0e18",
  surface: "#14141f",
  card: "#1a1a2e",
  border: "#2a2a45",
  accent: "#e8a838",
  accentDim: "#a07020",
  safe: "#4ecb7a",
  warn: "#e8a838",
  danger: "#e85252",
  text: "#d8d4f0",
  muted: "#7870a0",
  white: "#f4f0ff",
};

const TRACKER_CUISINES = {
  "🇮🇳 Indian": ["Dal", "Idli", "Chapati", "Paneer", "Aloo Gobi", "Khichdi", "Poha", "Upma", "Sambar", "Raita"],
  "🇮🇹 Italian": ["Pasta Marinara", "Margherita Pizza", "Risotto", "Minestrone", "Bruschetta", "Caprese Salad", "Focaccia", "Gnocchi"],
  "🇲🇽 Mexican": ["Bean Tacos", "Guacamole", "Veggie Burrito", "Salsa", "Cheese Quesadilla", "Elote", "Refried Beans", "Tortilla Soup"],
  "🇨🇳 Chinese": ["Steamed Rice", "Mapo Tofu", "Spring Rolls", "Bok Choy Stir Fry", "Egg Fried Rice", "Congee", "Steamed Dumplings", "Hot & Sour Soup"],
  "🌍 Other": ["Hummus", "Falafel", "Greek Salad", "Miso Soup", "Veggie Sushi", "Pad Thai (veg)", "Shakshuka", "Tabbouleh"],
};

const TRACKER_DAILY_LIMITS = { potassium: 2000, sodium: 1500, phosphorus: 800, protein: 50 };

function trkRiskColor(risk) {
  return risk === "high" ? TC.danger : risk === "medium" ? TC.warn : TC.safe;
}

function TrkMiniBar({ value, max, risk }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ background: "#1a1a30", borderRadius: 3, height: 4, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: trkRiskColor(risk), borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

function TrkTotalBar({ label, current, max, unit }) {
  const pct = Math.min((current / max) * 100, 100);
  const over = current > max;
  const color = over ? TC.danger : pct > 75 ? TC.warn : TC.safe;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: TC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontFamily: "monospace", fontWeight: 600 }}>
          {Math.round(current)}{unit} / {max}{unit} {over ? "⚠ OVER" : ""}
        </span>
      </div>
      <div style={{ background: "#1a1a30", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow: over ? `0 0 8px ${TC.danger}88` : "none" }} />
      </div>
    </div>
  );
}

function TrkLoadingPulse() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: TC.accent, animation: `pulse 1s ${i*0.15}s infinite ease-in-out` }} />
        ))}
      </div>
      <span style={{ color: TC.muted, fontSize: 12, fontFamily: "monospace" }}>Analyzing...</span>
      <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(0.5);opacity:0.3} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

function FoodTracker() {
  const [tab, setTab] = useState("track");
  const [food, setFood] = useState("");
  const [portion, setPortion] = useState("100");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [activeCuisine, setActiveCuisine] = useState("🇮🇳 Indian");
  const [pendingFood, setPendingFood] = useState(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [quickFood, setQuickFood] = useState("");

  const totals = log.reduce((acc, item) => {
    const scale = item.portion / 100;
    return {
      potassium: acc.potassium + item.potassium * scale,
      sodium: acc.sodium + item.sodium * scale,
      phosphorus: acc.phosphorus + item.phosphorus * scale,
      protein: acc.protein + item.protein * scale,
    };
  }, { potassium: 0, sodium: 0, phosphorus: 0, protein: 0 });

  const analyzeFood = async (foodName, portionG) => {
    setLoading(true);
    const prompt = `You are a renal dietitian. Analyze: "${foodName}" for a CKD vegetarian patient.
Return ONLY valid JSON, no markdown:
{
  "foodName": "proper name",
  "safetyLevel": "safe"|"caution"|"avoid",
  "potassium": number (mg per 100g),
  "sodium": number (mg per 100g),
  "phosphorus": number (mg per 100g),
  "protein": number (g per 100g),
  "potassiumRisk": "low"|"medium"|"high",
  "sodiumRisk": "low"|"medium"|"high",
  "phosphorusRisk": "low"|"medium"|"high",
  "proteinRisk": "low"|"medium"|"high",
  "tip": "one short CKD tip for this food"
}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: API_MODEL,
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const entry = { ...parsed, portion: parseInt(portionG) || 100, id: Date.now() };
      setLog(l => [...l, entry]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!food.trim()) return;
    analyzeFood(food, portion);
    setFood("");
    setPortion("100");
  };

  const handleQuickPick = (f) => {
    setQuickFood(f);
    setPendingFood(f);
    setShowPortionModal(true);
  };

  const confirmQuickPick = (portionG) => {
    analyzeFood(pendingFood, portionG);
    setShowPortionModal(false);
    setPendingFood(null);
  };

  const removeItem = (id) => setLog(l => l.filter(x => x.id !== id));
  const clearLog = () => setLog([]);

  const safetyColor = (s) => s === "safe" ? TC.safe : s === "caution" ? TC.warn : TC.danger;
  const safetyLabel = (s) => s === "safe" ? "✓ Safe" : s === "caution" ? "⚠ Caution" : "✗ Avoid";

  return (
    <div style={{ minHeight: "100vh", background: TC.bg, color: TC.text, fontFamily: "'Sora', sans-serif", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #0e0e18 0%, #1a1030 100%)`, borderBottom: `1px solid ${TC.border}`, padding: "28px 20px 20px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1a1a35", border: `1px solid ${TC.border}`, borderRadius: 20, padding: "4px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: TC.accent, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>Daily Food Tracker · CKD Safe</span>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "clamp(22px,5vw,36px)", fontWeight: 700, color: TC.white, lineHeight: 1.2 }}>
          Track Your <span style={{ color: TC.accent }}>Kidney-Safe</span> Meals
        </h1>
        <p style={{ color: TC.muted, fontSize: 13, margin: 0 }}>Global vegetarian foods · Potassium · Sodium · Phosphorus · Protein</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${TC.border}`, background: TC.surface }}>
        {[["track", "➕ Add Food"], ["log", `📋 Today's Log (${log.length})`], ["totals", "📊 Daily Totals"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "14px 8px", border: "none", background: "transparent",
            color: tab === key ? TC.accent : TC.muted, fontSize: 12, fontWeight: tab === key ? 700 : 400,
            fontFamily: "monospace", cursor: "pointer", letterSpacing: 0.5,
            borderBottom: tab === key ? `2px solid ${TC.accent}` : "2px solid transparent",
            transition: "all 0.2s",
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>

        {/* ADD FOOD TAB */}
        {tab === "track" && (
          <div>
            {/* Manual entry */}
            <div style={{ background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: TC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Manual Entry</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={food} onChange={e => setFood(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="Type any vegetarian food..."
                  style={{ flex: 1, background: TC.surface, border: `1px solid ${TC.border}`, borderRadius: 8, padding: "10px 14px", color: TC.white, fontSize: 14, outline: "none", fontFamily: "'Sora', sans-serif" }} />
                <input value={portion} onChange={e => setPortion(e.target.value)} placeholder="g"
                  style={{ width: 64, background: TC.surface, border: `1px solid ${TC.border}`, borderRadius: 8, padding: "10px 10px", color: TC.white, fontSize: 14, outline: "none", textAlign: "center", fontFamily: "monospace" }} />
                <button onClick={handleAdd} disabled={loading || !food.trim()}
                  style={{ background: TC.accent, color: "#1a0e00", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap" }}>
                  + Add
                </button>
              </div>
              <div style={{ fontSize: 11, color: TC.muted, fontFamily: "monospace" }}>Portion size in grams (default: 100g)</div>
              {loading && <TrkLoadingPulse />}
            </div>

            {/* Cuisine tabs */}
            <div style={{ background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, color: TC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Quick Pick by Cuisine</div>

              {/* Cuisine selector */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 14 }}>
                {Object.keys(TRACKER_CUISINES).map(c => (
                  <button key={c} onClick={() => setActiveCuisine(c)}
                    style={{ background: activeCuisine === c ? TC.accent : TC.surface, color: activeCuisine === c ? "#1a0e00" : TC.muted, border: `1px solid ${activeCuisine === c ? TC.accent : TC.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "monospace", fontWeight: activeCuisine === c ? 700 : 400 }}>
                    {c}
                  </button>
                ))}
              </div>

              {/* Food grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {TRACKER_CUISINES[activeCuisine].map(f => (
                  <button key={f} onClick={() => handleQuickPick(f)}
                    style={{ background: TC.surface, border: `1px solid ${TC.border}`, borderRadius: 10, padding: "10px 14px", color: TC.text, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = TC.accent; e.currentTarget.style.color = TC.white; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = TC.border; e.currentTarget.style.color = TC.text; }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOG TAB */}
        {tab === "log" && (
          <div>
            {log.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: TC.muted }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🥗</div>
                <div style={{ fontFamily: "monospace", fontSize: 14 }}>No foods logged yet.</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Go to "Add Food" to get started.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: TC.muted, fontFamily: "monospace" }}>{log.length} item{log.length !== 1 ? "s" : ""} logged today</span>
                  <button onClick={clearLog} style={{ background: "transparent", border: `1px solid ${TC.danger}55`, borderRadius: 8, padding: "4px 12px", color: TC.danger, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>Clear All</button>
                </div>
                {log.map(item => {
                  const scale = item.portion / 100;
                  return (
                    <div key={item.id} style={{ background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 14, padding: 16, marginBottom: 12, position: "relative", animation: "slideIn 0.3s ease" }}>
                      <style>{`@keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: TC.white, marginBottom: 3 }}>{item.foodName}</div>
                          <div style={{ fontSize: 11, color: TC.muted, fontFamily: "monospace" }}>{item.portion}g portion</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: safetyColor(item.safetyLevel), fontFamily: "monospace", background: `${safetyColor(item.safetyLevel)}22`, padding: "3px 8px", borderRadius: 10 }}>
                            {safetyLabel(item.safetyLevel)}
                          </span>
                          <button onClick={() => removeItem(item.id)} style={{ background: "transparent", border: "none", color: TC.muted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                        {[
                          { label: "Potassium", val: item.potassium * scale, unit: "mg", risk: item.potassiumRisk, max: 500 },
                          { label: "Sodium", val: item.sodium * scale, unit: "mg", risk: item.sodiumRisk, max: 400 },
                          { label: "Phosphorus", val: item.phosphorus * scale, unit: "mg", risk: item.phosphorusRisk, max: 300 },
                          { label: "Protein", val: item.protein * scale, unit: "g", risk: item.proteinRisk, max: 15 },
                        ].map(({ label, val, unit, risk, max }) => (
                          <div key={label}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: TC.muted, fontFamily: "monospace" }}>{label}</span>
                              <span style={{ fontSize: 10, color: trkRiskColor(risk), fontFamily: "monospace" }}>{Math.round(val)}{unit}</span>
                            </div>
                            <TrkMiniBar value={val} max={max} risk={risk} />
                          </div>
                        ))}
                      </div>
                      {item.tip && (
                        <div style={{ marginTop: 12, fontSize: 11, color: TC.accent, fontFamily: "monospace", background: "#1e1800", borderRadius: 8, padding: "8px 10px" }}>
                          💡 {item.tip}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* TOTALS TAB */}
        {tab === "totals" && (
          <div>
            <div style={{ background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: TC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 18 }}>Daily Totals vs CKD Limits</div>
              <TrkTotalBar label="Potassium" current={totals.potassium} max={TRACKER_DAILY_LIMITS.potassium} unit="mg" />
              <TrkTotalBar label="Sodium" current={totals.sodium} max={TRACKER_DAILY_LIMITS.sodium} unit="mg" />
              <TrkTotalBar label="Phosphorus" current={totals.phosphorus} max={TRACKER_DAILY_LIMITS.phosphorus} unit="mg" />
              <TrkTotalBar label="Protein" current={totals.protein} max={TRACKER_DAILY_LIMITS.protein} unit="g" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Potassium", val: totals.potassium, limit: TRACKER_DAILY_LIMITS.potassium, unit: "mg" },
                { label: "Sodium", val: totals.sodium, limit: TRACKER_DAILY_LIMITS.sodium, unit: "mg" },
                { label: "Phosphorus", val: totals.phosphorus, limit: TRACKER_DAILY_LIMITS.phosphorus, unit: "mg" },
                { label: "Protein", val: totals.protein, limit: TRACKER_DAILY_LIMITS.protein, unit: "g" },
              ].map(({ label, val, limit, unit }) => {
                const pct = Math.round((val / limit) * 100);
                const color = pct > 100 ? TC.danger : pct > 75 ? TC.warn : TC.safe;
                return (
                  <div key={label} style={{ background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "monospace" }}>{pct}%</div>
                    <div style={{ fontSize: 11, color: TC.muted, fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 10, color: TC.muted, fontFamily: "monospace" }}>{Math.round(val)}/{limit}{unit}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#1a1500", border: `1px solid ${TC.accentDim}`, borderRadius: 12, padding: 16, fontSize: 12, color: TC.muted, fontFamily: "monospace", lineHeight: 1.7 }}>
              <div style={{ color: TC.accent, marginBottom: 6, fontWeight: 700 }}>📋 CKD Daily Limits Used</div>
              Potassium: 2,000mg · Sodium: 1,500mg<br />
              Phosphorus: 800mg · Protein: 50g<br />
              <span style={{ fontSize: 10, color: TC.muted, marginTop: 6, display: "block" }}>Limits vary by CKD stage — consult your renal dietitian.</span>
            </div>
          </div>
        )}
      </div>

      {/* Portion modal */}
      {showPortionModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 320 }}>
            <div style={{ fontWeight: 600, color: TC.white, fontSize: 16, marginBottom: 6 }}>{pendingFood}</div>
            <div style={{ fontSize: 12, color: TC.muted, fontFamily: "monospace", marginBottom: 18 }}>How much are you eating?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
              {[50, 100, 150, 200, 250, 300].map(g => (
                <button key={g} onClick={() => confirmQuickPick(g)}
                  style={{ background: TC.surface, border: `1px solid ${TC.border}`, borderRadius: 10, padding: "12px 8px", color: TC.text, fontSize: 14, cursor: "pointer", fontFamily: "monospace", fontWeight: 600 }}>
                  {g}g
                </button>
              ))}
            </div>
            <button onClick={() => setShowPortionModal(false)}
              style={{ width: "100%", background: "transparent", border: `1px solid ${TC.border}`, borderRadius: 10, padding: "10px", color: TC.muted, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════
// RECIPE CONVERTER
// ══════════════════════════════════════════


const CC = {
  bg: "#0f0c1a",
  surface: "#16122a",
  card: "#1e1835",
  border: "#2e2850",
  accent: "#c084fc",
  accentDim: "#7c3aed",
  safe: "#4ade80",
  warn: "#fbbf24",
  danger: "#f87171",
  text: "#e2d9f3",
  muted: "#7c6fa0",
  white: "#f8f4ff",
};

const CONV_SAMPLE_RECIPES = [
  { label: "🥔 Aloo Gobi", value: "Aloo Gobi" },
  { label: "🍅 Dal Makhani", value: "Dal Makhani" },
  { label: "🧆 Rajma", value: "Rajma (Kidney Bean Curry)" },
  { label: "🍕 Margherita Pizza", value: "Margherita Pizza" },
  { label: "🌮 Bean Tacos", value: "Black Bean Tacos with salsa and tomato" },
  { label: "🍜 Pasta Primavera", value: "Pasta Primavera with tomato sauce and spinach" },
];

function ConvRiskPill({ risk }) {
  const map = { high: { color: CC.danger, label: "High Risk", bg: "#2d1010" }, medium: { color: CC.warn, label: "Med Risk", bg: "#2d2010" }, low: { color: CC.safe, label: "Low Risk", bg: "#0d2d1a" } };
  const s = map[risk] || map.low;
  return <span style={{ fontSize: 10, color: s.color, background: s.bg, border: `1px solid ${s.color}44`, borderRadius: 10, padding: "2px 8px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ConvNutrientCompare({ label, before, after, unit, limit }) {
  const pctB = Math.min((before / limit) * 100, 100);
  const pctA = Math.min((after / limit) * 100, 100);
  const improved = after < before;
  const colorA = after > limit ? CC.danger : pctA > 75 ? CC.warn : CC.safe;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: CC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: CC.muted, fontFamily: "monospace", textDecoration: "line-through" }}>{Math.round(before)}{unit}</span>
          <span style={{ fontSize: 11, color: improved ? CC.safe : CC.danger, fontFamily: "monospace" }}>→</span>
          <span style={{ fontSize: 12, color: colorA, fontFamily: "monospace", fontWeight: 700 }}>{Math.round(after)}{unit}</span>
          {improved && <span style={{ fontSize: 10, color: CC.safe, fontFamily: "monospace" }}>↓{Math.round(((before - after) / before) * 100)}%</span>}
        </div>
      </div>
      <div style={{ position: "relative", height: 8, background: "#1a1530", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: `${pctB}%`, height: "100%", background: `${CC.danger}44`, borderRadius: 6 }} />
        <div style={{ position: "absolute", width: `${pctA}%`, height: "100%", background: colorA, borderRadius: 6, transition: "width 0.8s ease" }} />
      </div>
      <div style={{ fontSize: 10, color: CC.muted, fontFamily: "monospace", marginTop: 3, textAlign: "right" }}>Limit: {limit}{unit}</div>
    </div>
  );
}

function ConvLoadingDots() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: CC.accent, animation: `blink 1.2s ${i * 0.15}s infinite ease-in-out` }} />
        ))}
      </div>
      <span style={{ color: CC.muted, fontSize: 13, fontFamily: "monospace" }}>Analyzing ingredients & finding safe swaps...</span>
      <style>{`@keyframes blink{0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function RecipeConverter() {
  const [mode, setMode] = useState("name"); // "name" | "paste"
  const [dishName, setDishName] = useState("");
  const [pastedRecipe, setPastedRecipe] = useState("");
  const [servings, setServings] = useState("4");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState({});

  const toggleSub = (idx) => {
    setAccepted(a => ({ ...a, [idx]: !a[idx] }));
  };

  const analyzeRecipe = async () => {
    const input = mode === "name" ? dishName : pastedRecipe;
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setAccepted({});

    const prompt = `You are a renal dietitian specializing in CKD (Chronic Kidney Disease) vegetarian diets. 

${mode === "name" ? `The user wants to make: "${input}" (serves ${servings})` : `The user has this recipe (serves ${servings}):\n${input}`}

Analyze this recipe for CKD safety and provide kidney-friendly substitutions to reduce potassium, sodium, phosphorus and protein.

Return ONLY valid JSON (no markdown, no explanation):
{
  "dishName": "string",
  "servings": number,
  "originalIngredients": [
    {
      "name": "ingredient name",
      "amount": "e.g. 2 cups",
      "ckdRisk": "low"|"medium"|"high",
      "riskReason": "brief reason why risky or safe",
      "mainNutrientConcern": "potassium"|"sodium"|"phosphorus"|"protein"|"none"
    }
  ],
  "substitutions": [
    {
      "original": "ingredient to replace",
      "substitute": "CKD-safe replacement",
      "amount": "amount of substitute",
      "reason": "why this swap helps kidneys",
      "nutrientSaved": "what nutrient is reduced",
      "reduction": "e.g. reduces potassium by ~60%"
    }
  ],
  "cookingTips": ["tip1", "tip2"],
  "nutritionBefore": {
    "potassium": number (mg per serving),
    "sodium": number (mg per serving),
    "phosphorus": number (mg per serving),
    "protein": number (g per serving)
  },
  "nutritionAfter": {
    "potassium": number (mg per serving),
    "sodium": number (mg per serving),
    "phosphorus": number (mg per serving),
    "protein": number (g per serving)
  },
  "overallSafetyBefore": "safe"|"caution"|"avoid",
  "overallSafetyAfter": "safe"|"caution"|"avoid",
  "modifiedRecipeSummary": "2-3 sentence description of the modified CKD-safe version"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: API_MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
      // Auto-accept all substitutions
      const auto = {};
      parsed.substitutions.forEach((_, i) => { auto[i] = true; });
      setAccepted(auto);
    } catch (e) {
      setError("Couldn't analyze that recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const safetyColor = s => s === "safe" ? CC.safe : s === "caution" ? CC.warn : CC.danger;
  const safetyLabel = s => s === "safe" ? "✓ CKD Safe" : s === "caution" ? "⚠ Use Caution" : "✗ Avoid";

  // Compute adjusted nutrition based on accepted subs
  const acceptedCount = Object.values(accepted).filter(Boolean).length;
  const totalSubs = result?.substitutions?.length || 0;
  const adjustedNutrition = result ? {
    potassium: result.nutritionBefore.potassium - ((result.nutritionBefore.potassium - result.nutritionAfter.potassium) * (acceptedCount / Math.max(totalSubs, 1))),
    sodium: result.nutritionBefore.sodium - ((result.nutritionBefore.sodium - result.nutritionAfter.sodium) * (acceptedCount / Math.max(totalSubs, 1))),
    phosphorus: result.nutritionBefore.phosphorus - ((result.nutritionBefore.phosphorus - result.nutritionAfter.phosphorus) * (acceptedCount / Math.max(totalSubs, 1))),
    protein: result.nutritionBefore.protein - ((result.nutritionBefore.protein - result.nutritionAfter.protein) * (acceptedCount / Math.max(totalSubs, 1))),
  } : null;

  return (
    <div style={{ minHeight: "100vh", background: CC.bg, color: CC.text, fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #0f0c1a 0%, #1a1030 50%, #0f0c1a 100%)`, borderBottom: `1px solid ${CC.border}`, padding: "32px 20px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#2d1a4a", border: `1px solid ${CC.accentDim}`, borderRadius: 20, padding: "4px 16px", marginBottom: 14, fontSize: 10, color: CC.accent, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>
          CKD Recipe Converter
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,5vw,40px)", fontWeight: 700, color: CC.white, lineHeight: 1.2 }}>
          Make Any Recipe<br /><span style={{ color: CC.accent }}>Kidney-Safe</span>
        </h1>
        <p style={{ color: CC.muted, fontSize: 14, margin: 0, maxWidth: 420, marginInline: "auto" }}>
          Get smart ingredient swaps to cut potassium, sodium & phosphorus — without sacrificing flavor
        </p>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px" }}>

        {/* Input card */}
        <div style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: CC.surface, borderRadius: 10, padding: 4, marginBottom: 18, gap: 4 }}>
            {[["name", "🍽 Dish Name"], ["paste", "📋 Paste Recipe"]].map(([key, label]) => (
              <button key={key} onClick={() => setMode(key)} style={{ flex: 1, padding: "9px 12px", border: "none", borderRadius: 8, background: mode === key ? CC.accent : "transparent", color: mode === key ? "#0f0c1a" : CC.muted, fontSize: 13, fontWeight: mode === key ? 700 : 400, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>

          {mode === "name" ? (
            <>
              <label style={{ display: "block", fontSize: 11, color: CC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Dish Name</label>
              <input value={dishName} onChange={e => setDishName(e.target.value)} onKeyDown={e => e.key === "Enter" && analyzeRecipe()}
                placeholder="e.g. Aloo Gobi, Pasta Arrabiata, Dal Tadka..."
                style={{ width: "100%", background: CC.surface, border: `1px solid ${CC.border}`, borderRadius: 10, padding: "12px 16px", color: CC.white, fontSize: 15, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: "border-box", marginBottom: 12 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {CONV_SAMPLE_RECIPES.map(r => (
                  <button key={r.value} onClick={() => setDishName(r.value)}
                    style={{ background: "transparent", border: `1px solid ${CC.border}`, borderRadius: 20, padding: "5px 12px", color: CC.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = CC.accent; e.currentTarget.style.color = CC.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = CC.border; e.currentTarget.style.color = CC.muted; }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label style={{ display: "block", fontSize: 11, color: CC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Paste Your Recipe</label>
              <textarea value={pastedRecipe} onChange={e => setPastedRecipe(e.target.value)}
                placeholder={"e.g.\n2 large potatoes\n1 cup tomatoes\n1 tsp salt\n2 cups spinach\n..."}
                rows={6}
                style={{ width: "100%", background: CC.surface, border: `1px solid ${CC.border}`, borderRadius: 10, padding: "12px 16px", color: CC.white, fontSize: 14, outline: "none", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
            </>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: CC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Serves</label>
              <input value={servings} onChange={e => setServings(e.target.value)} type="number" min="1" max="20"
                style={{ width: "100%", background: CC.surface, border: `1px solid ${CC.border}`, borderRadius: 10, padding: "10px 14px", color: CC.white, fontSize: 14, outline: "none", fontFamily: "monospace" }} />
            </div>
            <button onClick={analyzeRecipe} disabled={loading || !(mode === "name" ? dishName : pastedRecipe).trim()}
              style={{ flex: 3, marginTop: 22, background: loading ? CC.accentDim : CC.accent, color: "#0f0c1a", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {loading ? "Analyzing..." : "🔄 Convert Recipe →"}
            </button>
          </div>
        </div>

        {loading && <ConvLoadingDots />}
        {error && <div style={{ background: "#2d1010", border: `1px solid ${CC.danger}55`, borderRadius: 12, padding: 16, color: CC.danger, fontSize: 14, marginBottom: 16 }}>{error}</div>}

        {result && !loading && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Before/After safety */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, marginBottom: 16, alignItems: "center" }}>
              <div style={{ background: CC.card, border: `1px solid ${safetyColor(result.overallSafetyBefore)}44`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: CC.muted, fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Original</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: safetyColor(result.overallSafetyBefore) }}>{safetyLabel(result.overallSafetyBefore)}</div>
              </div>
              <div style={{ fontSize: 20, textAlign: "center" }}>→</div>
              <div style={{ background: CC.card, border: `1px solid ${safetyColor(result.overallSafetyAfter)}44`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: CC.muted, fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Modified</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: safetyColor(result.overallSafetyAfter) }}>{safetyLabel(result.overallSafetyAfter)}</div>
              </div>
            </div>

            {/* Ingredients */}
            <div style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: CC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Original Ingredients — Risk Analysis</div>
              {result.originalIngredients.map((ing, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: i < result.originalIngredients.length - 1 ? `1px solid ${CC.border}` : "none", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: CC.white, fontWeight: 500, marginBottom: 2 }}>{ing.amount} {ing.name}</div>
                    <div style={{ fontSize: 11, color: CC.muted, fontFamily: "monospace" }}>{ing.riskReason}</div>
                  </div>
                  <ConvRiskPill risk={ing.ckdRisk} />
                </div>
              ))}
            </div>

            {/* Substitutions */}
            {result.substitutions.length > 0 && (
              <div style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: CC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>Smart Substitutions</div>
                  <div style={{ fontSize: 11, color: CC.accent, fontFamily: "monospace" }}>{acceptedCount}/{totalSubs} accepted</div>
                </div>
                {result.substitutions.map((sub, i) => (
                  <div key={i} style={{ background: accepted[i] ? "#1a0f2e" : CC.surface, border: `1px solid ${accepted[i] ? CC.accentDim : CC.border}`, borderRadius: 12, padding: 14, marginBottom: 10, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, color: CC.danger, fontFamily: "monospace", textDecoration: accepted[i] ? "line-through" : "none" }}>{sub.original}</span>
                          <span style={{ color: CC.muted }}>→</span>
                          <span style={{ fontSize: 13, color: CC.safe, fontFamily: "monospace", fontWeight: 600 }}>{sub.amount} {sub.substitute}</span>
                        </div>
                        <div style={{ fontSize: 12, color: CC.muted, marginBottom: 4 }}>{sub.reason}</div>
                        <div style={{ fontSize: 11, color: CC.accent, fontFamily: "monospace", background: "#1e1040", borderRadius: 6, padding: "3px 8px", display: "inline-block" }}>
                          💜 {sub.reduction}
                        </div>
                      </div>
                      <button onClick={() => toggleSub(i)}
                        style={{ background: accepted[i] ? CC.accent : "transparent", border: `1px solid ${accepted[i] ? CC.accent : CC.border}`, borderRadius: 8, padding: "6px 12px", color: accepted[i] ? "#0f0c1a" : CC.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {accepted[i] ? "✓ On" : "Off"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Nutrition comparison */}
            <div style={{ background: CC.card, border: `1px solid ${CC.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: CC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
                Nutrition Per Serving — Before vs After ({acceptedCount} swaps active)
              </div>
              <ConvNutrientCompare label="Potassium" before={result.nutritionBefore.potassium} after={adjustedNutrition.potassium} unit="mg" limit={667} />
              <ConvNutrientCompare label="Sodium" before={result.nutritionBefore.sodium} after={adjustedNutrition.sodium} unit="mg" limit={500} />
              <ConvNutrientCompare label="Phosphorus" before={result.nutritionBefore.phosphorus} after={adjustedNutrition.phosphorus} unit="mg" limit={267} />
              <ConvNutrientCompare label="Protein" before={result.nutritionBefore.protein} after={adjustedNutrition.protein} unit="g" limit={17} />
            </div>

            {/* Cooking tips */}
            {result.cookingTips?.length > 0 && (
              <div style={{ background: "#140e28", border: `1px solid ${CC.accentDim}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: CC.accent, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>👩‍⚕️ Dietitian Cooking Tips</div>
                {result.cookingTips.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < result.cookingTips.length - 1 ? 10 : 0 }}>
                    <span style={{ color: CC.accent, fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 13, color: CC.text, lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modified recipe summary */}
            <div style={{ background: "#0d1a12", border: `1px solid #2a4a30`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: CC.safe, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>✓ Your CKD-Safe Version</div>
              <p style={{ margin: 0, fontSize: 14, color: CC.text, lineHeight: 1.7 }}>{result.modifiedRecipeSummary}</p>
            </div>

            <p style={{ marginTop: 24, fontSize: 11, color: CC.muted, textAlign: "center", fontFamily: "monospace", lineHeight: 1.6 }}>
              Nutritional values are estimates. Always consult your renal dietitian.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
// RECIPE LIBRARY
// ══════════════════════════════════════════


const LC = {
  bg: "#0a0f0d",
  surface: "#111a15",
  card: "#162019",
  cardHover: "#1d2b22",
  border: "#243528",
  accent: "#34d47a",
  accentDim: "#1a7a42",
  warn: "#f0b429",
  danger: "#f06060",
  text: "#cce8d4",
  muted: "#5a7a62",
  white: "#edfaf2",
  tag: "#1a3d24",
};

const LIB_CUISINES = ["All", "🇮🇳 Indian", "🇮🇹 Italian", "🇲🇽 Mexican", "🇨🇳 Chinese", "🌍 Other"];

const LIB_DEFAULT_RECIPES = [
  { id:1, savedAt:"Default", cuisine:"🇮🇳 Indian", dishName:"Khichdi", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"Khichdi is one of the best CKD-friendly Indian meals — easy on the kidneys with low potassium and moderate protein. Use less dal and more rice to further reduce protein if needed.",
    topTip:"Use a 3:1 rice-to-dal ratio and rinse both thoroughly to reduce phosphorus. Avoid adding too much salt.",
    ingredients:[{name:"White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Moong Dal",amount:"0.5 cup",ckdRisk:"low"},{name:"Ghee",amount:"1 tbsp",ckdRisk:"low"},{name:"Turmeric",amount:"0.5 tsp",ckdRisk:"low"},{name:"Ginger",amount:"1 tsp",ckdRisk:"low"}],
    substitutions:[],
    nutritionPerServing:{potassium:180,sodium:120,phosphorus:110,protein:7},
    nutritionAfterSwaps:{potassium:180,sodium:120,phosphorus:110,protein:7}},
  { id:2, savedAt:"Default", cuisine:"🇮🇳 Indian", dishName:"Aloo Gobi (CKD-Safe)", servings:4, safetyLevel:"caution", photo:null,
    dietitianNote:"Traditional Aloo Gobi has high potassium from potatoes. By leaching potatoes and reducing portion size, it becomes manageable. Cauliflower is a great kidney-friendly vegetable.",
    topTip:"Peel, dice and boil potatoes in large water twice (discard water both times) to remove up to 50% of potassium before cooking.",
    ingredients:[{name:"Potatoes (leached)",amount:"1 medium",ckdRisk:"medium"},{name:"Cauliflower",amount:"2 cups",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Tomato",amount:"0.5 small",ckdRisk:"medium"},{name:"Oil",amount:"1 tbsp",ckdRisk:"low"}],
    substitutions:[{original:"Regular potatoes",substitute:"Leached potatoes or turnip",reduction:"Reduces potassium by ~50%"},{original:"Tomato",substitute:"Red bell pepper (small)",reduction:"Reduces potassium by ~30%"}],
    nutritionPerServing:{potassium:340,sodium:140,phosphorus:90,protein:4},
    nutritionAfterSwaps:{potassium:220,sodium:140,phosphorus:80,protein:4}},
  { id:3, savedAt:"Default", cuisine:"🇮🇳 Indian", dishName:"Poha", servings:2, safetyLevel:"safe", photo:null,
    dietitianNote:"Poha (flattened rice) is an excellent CKD breakfast — low in potassium, phosphorus and protein. It is light, easy to digest and filling.",
    topTip:"Rinse poha well before cooking. Limit peanuts to a small garnish only — they are high in phosphorus.",
    ingredients:[{name:"Flattened Rice (Poha)",amount:"1.5 cups",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Green chili",amount:"1 small",ckdRisk:"low"},{name:"Mustard seeds",amount:"0.5 tsp",ckdRisk:"low"},{name:"Peanuts",amount:"1 tbsp",ckdRisk:"medium"}],
    substitutions:[{original:"Peanuts (large amount)",substitute:"Skip or use 1 tsp only",reduction:"Significantly reduces phosphorus"}],
    nutritionPerServing:{potassium:150,sodium:100,phosphorus:85,protein:4},
    nutritionAfterSwaps:{potassium:150,sodium:100,phosphorus:70,protein:3}},
  { id:4, savedAt:"Default", cuisine:"🇮🇳 Indian", dishName:"Upma", servings:3, safetyLevel:"safe", photo:null,
    dietitianNote:"Semolina-based upma is kidney-friendly when made with low-potassium vegetables. It is filling, easy to digest, and a great breakfast or light meal for CKD patients.",
    topTip:"Add only kidney-safe vegetables like cabbage, carrots and green peas (small amount). Avoid adding tomatoes or potatoes.",
    ingredients:[{name:"Semolina (Rava)",amount:"1 cup",ckdRisk:"low"},{name:"Cabbage",amount:"0.5 cup",ckdRisk:"low"},{name:"Carrot",amount:"0.25 cup",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Oil",amount:"1 tbsp",ckdRisk:"low"},{name:"Mustard seeds",amount:"0.5 tsp",ckdRisk:"low"}],
    substitutions:[{original:"Tomatoes",substitute:"Skip entirely",reduction:"Reduces potassium significantly"}],
    nutritionPerServing:{potassium:190,sodium:130,phosphorus:95,protein:5},
    nutritionAfterSwaps:{potassium:190,sodium:130,phosphorus:95,protein:5}},
  { id:5, savedAt:"Default", cuisine:"🇮🇳 Indian", dishName:"Chapati with Ghee", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"Plain chapati made with white flour (maida) is safer for CKD than whole wheat chapati, which is higher in phosphorus and potassium. A small amount of ghee adds energy without kidney stress.",
    topTip:"Use white flour (maida) instead of whole wheat atta to reduce phosphorus. Limit to 2 chapatis per meal.",
    ingredients:[{name:"White flour (Maida)",amount:"1 cup",ckdRisk:"low"},{name:"Water",amount:"as needed",ckdRisk:"low"},{name:"Ghee",amount:"1 tsp per chapati",ckdRisk:"low"}],
    substitutions:[{original:"Whole wheat atta",substitute:"White flour (maida)",reduction:"Reduces phosphorus by ~35%"}],
    nutritionPerServing:{potassium:90,sodium:5,phosphorus:70,protein:4},
    nutritionAfterSwaps:{potassium:60,sodium:5,phosphorus:45,protein:3}},
  { id:6, savedAt:"Default", cuisine:"🇮🇹 Italian", dishName:"Pasta Aglio e Olio", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"This simple garlic and olive oil pasta is one of the most kidney-friendly Italian dishes — no tomato sauce, low potassium, and easy to portion control.",
    topTip:"Use white pasta (not whole wheat) to keep phosphorus lower. Go easy on garlic if you have high potassium levels.",
    ingredients:[{name:"White Pasta",amount:"200g",ckdRisk:"low"},{name:"Olive Oil",amount:"3 tbsp",ckdRisk:"low"},{name:"Garlic",amount:"3 cloves",ckdRisk:"low"},{name:"Parsley",amount:"2 tbsp",ckdRisk:"low"},{name:"Red chili flakes",amount:"pinch",ckdRisk:"low"}],
    substitutions:[],
    nutritionPerServing:{potassium:130,sodium:80,phosphorus:90,protein:7},
    nutritionAfterSwaps:{potassium:130,sodium:80,phosphorus:90,protein:7}},
  { id:7, savedAt:"Default", cuisine:"🇮🇹 Italian", dishName:"Margherita Pizza (Modified)", servings:4, safetyLevel:"caution", photo:null,
    dietitianNote:"Pizza crust is fine for CKD but tomato sauce and cheese add potassium, sodium and phosphorus. Reduce cheese, use a thin spread of sauce, and load with kidney-friendly toppings.",
    topTip:"Use a thin crust, 2 tbsp of tomato sauce max, and only 1 oz of fresh mozzarella per slice. Add roasted bell peppers and zucchini as low-potassium toppings.",
    ingredients:[{name:"Pizza dough (white flour)",amount:"1 base",ckdRisk:"low"},{name:"Tomato sauce",amount:"3 tbsp",ckdRisk:"medium"},{name:"Mozzarella cheese",amount:"50g",ckdRisk:"medium"},{name:"Fresh basil",amount:"few leaves",ckdRisk:"low"},{name:"Olive oil",amount:"1 tsp",ckdRisk:"low"}],
    substitutions:[{original:"Heavy tomato sauce",substitute:"Thin spread (2 tbsp max)",reduction:"Reduces potassium by ~40%"},{original:"Large amount mozzarella",substitute:"Fresh mozzarella (small)",reduction:"Reduces sodium & phosphorus by ~35%"}],
    nutritionPerServing:{potassium:290,sodium:420,phosphorus:180,protein:10},
    nutritionAfterSwaps:{potassium:200,sodium:280,phosphorus:130,protein:8}},
  { id:8, savedAt:"Default", cuisine:"🇮🇹 Italian", dishName:"Risotto with Zucchini", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"Risotto made with white arborio rice and low-potassium zucchini is an excellent CKD-safe Italian meal. Avoid adding parmesan in large quantities due to its high phosphorus content.",
    topTip:"Use low-sodium vegetable broth or plain water. Add only 1 tbsp of parmesan as garnish — it is very high in phosphorus and sodium.",
    ingredients:[{name:"Arborio Rice",amount:"1 cup",ckdRisk:"low"},{name:"Zucchini",amount:"1 cup",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Olive oil",amount:"1 tbsp",ckdRisk:"low"},{name:"Parmesan",amount:"1 tbsp only",ckdRisk:"medium"},{name:"Low-sodium broth",amount:"3 cups",ckdRisk:"low"}],
    substitutions:[{original:"Regular broth",substitute:"Low-sodium broth or water",reduction:"Reduces sodium by ~50%"},{original:"Parmesan (large amount)",substitute:"1 tbsp garnish only",reduction:"Reduces phosphorus by ~60%"}],
    nutritionPerServing:{potassium:210,sodium:180,phosphorus:110,protein:6},
    nutritionAfterSwaps:{potassium:210,sodium:120,phosphorus:95,protein:6}},
  { id:9, savedAt:"Default", cuisine:"🇲🇽 Mexican", dishName:"Cauliflower Tacos", servings:3, safetyLevel:"safe", photo:null,
    dietitianNote:"Cauliflower tacos are an excellent CKD-friendly alternative to bean tacos. Cauliflower is low in potassium and phosphorus and takes on Mexican spices beautifully.",
    topTip:"Roast cauliflower with cumin, paprika and a drizzle of oil. Serve in corn tortillas with shredded cabbage and a squeeze of lime — all kidney-friendly.",
    ingredients:[{name:"Cauliflower",amount:"2 cups",ckdRisk:"low"},{name:"Corn tortillas",amount:"6 small",ckdRisk:"low"},{name:"Cabbage (shredded)",amount:"0.5 cup",ckdRisk:"low"},{name:"Lime juice",amount:"1 tbsp",ckdRisk:"low"},{name:"Cumin, paprika",amount:"1 tsp each",ckdRisk:"low"}],
    substitutions:[],
    nutritionPerServing:{potassium:200,sodium:90,phosphorus:80,protein:4},
    nutritionAfterSwaps:{potassium:200,sodium:90,phosphorus:80,protein:4}},
  { id:10, savedAt:"Default", cuisine:"🇲🇽 Mexican", dishName:"Veggie Quesadilla", servings:2, safetyLevel:"safe", photo:null,
    dietitianNote:"A simple cheese quesadilla with low-potassium vegetables is a great CKD-friendly Mexican option. Avoid beans and large amounts of salsa.",
    topTip:"Fill with bell peppers, zucchini and a small amount of cheese. Skip sour cream or use just 1 tsp. Avoid black beans which are high in potassium and phosphorus.",
    ingredients:[{name:"White flour tortilla",amount:"2 large",ckdRisk:"low"},{name:"Mozzarella",amount:"40g",ckdRisk:"medium"},{name:"Bell pepper",amount:"0.5 cup",ckdRisk:"low"},{name:"Zucchini",amount:"0.5 cup",ckdRisk:"low"},{name:"Oil",amount:"1 tsp",ckdRisk:"low"}],
    substitutions:[{original:"Black beans",substitute:"Skip or use only 2 tbsp",reduction:"Major reduction in potassium & phosphorus"}],
    nutritionPerServing:{potassium:220,sodium:260,phosphorus:140,protein:9},
    nutritionAfterSwaps:{potassium:220,sodium:260,phosphorus:140,protein:9}},
  { id:11, savedAt:"Default", cuisine:"🇲🇽 Mexican", dishName:"Mexican Rice", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"Plain Mexican-style white rice is very CKD-friendly. The key is to use minimal tomato and no beans, and season lightly to keep sodium in check.",
    topTip:"Use just 2 tbsp of tomato paste for color and flavor. Cook in water rather than canned broth to control sodium.",
    ingredients:[{name:"White rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Tomato paste",amount:"2 tbsp",ckdRisk:"low"},{name:"Onion",amount:"0.25 cup",ckdRisk:"low"},{name:"Garlic",amount:"1 clove",ckdRisk:"low"},{name:"Oil",amount:"1 tbsp",ckdRisk:"low"},{name:"Cumin",amount:"0.5 tsp",ckdRisk:"low"}],
    substitutions:[],
    nutritionPerServing:{potassium:140,sodium:85,phosphorus:70,protein:3},
    nutritionAfterSwaps:{potassium:140,sodium:85,phosphorus:70,protein:3}},
  { id:12, savedAt:"Default", cuisine:"🇨🇳 Chinese", dishName:"Steamed Rice with Bok Choy", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"Plain steamed white rice with lightly stir-fried bok choy is one of the safest CKD meals. Low in all four nutrients of concern and very easy to prepare.",
    topTip:"Blanch bok choy briefly and discard water to further reduce potassium. Season lightly with a few drops of low-sodium soy sauce only.",
    ingredients:[{name:"White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Bok Choy",amount:"2 cups",ckdRisk:"low"},{name:"Garlic",amount:"1 clove",ckdRisk:"low"},{name:"Sesame oil",amount:"1 tsp",ckdRisk:"low"},{name:"Low-sodium soy sauce",amount:"1 tsp",ckdRisk:"medium"}],
    substitutions:[{original:"Regular soy sauce",substitute:"Low-sodium soy sauce (1 tsp max)",reduction:"Reduces sodium by ~50%"}],
    nutritionPerServing:{potassium:170,sodium:160,phosphorus:85,protein:5},
    nutritionAfterSwaps:{potassium:170,sodium:110,phosphorus:85,protein:5}},
  { id:13, savedAt:"Default", cuisine:"🇨🇳 Chinese", dishName:"Egg Fried Rice (Veg)", servings:3, safetyLevel:"caution", photo:null,
    dietitianNote:"Egg fried rice can work for CKD if sodium is carefully managed. Eggs add some phosphorus and protein so limit to one egg per serving. Avoid frozen mixed vegetables which are high in potassium.",
    topTip:"Use fresh day-old white rice for best texture. Cook with minimal low-sodium soy sauce and add only kidney-safe vegetables like cabbage and carrots.",
    ingredients:[{name:"Cooked White Rice",amount:"2 cups",ckdRisk:"low"},{name:"Eggs",amount:"2",ckdRisk:"medium"},{name:"Cabbage",amount:"0.5 cup",ckdRisk:"low"},{name:"Carrot",amount:"0.25 cup",ckdRisk:"low"},{name:"Low-sodium soy sauce",amount:"1 tsp",ckdRisk:"medium"},{name:"Sesame oil",amount:"1 tsp",ckdRisk:"low"}],
    substitutions:[{original:"Frozen mixed vegetables",substitute:"Fresh cabbage & carrots",reduction:"Reduces potassium by ~40%"},{original:"Regular soy sauce",substitute:"Low-sodium soy sauce (1 tsp)",reduction:"Reduces sodium by ~50%"}],
    nutritionPerServing:{potassium:260,sodium:320,phosphorus:160,protein:9},
    nutritionAfterSwaps:{potassium:200,sodium:200,phosphorus:140,protein:9}},
  { id:14, savedAt:"Default", cuisine:"🇨🇳 Chinese", dishName:"Congee (Rice Porridge)", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"Congee is one of the most kidney-friendly Chinese foods. The high water content dilutes nutrients and it is extremely gentle on the digestive system — ideal for CKD patients.",
    topTip:"Cook 1 part rice to 8 parts water for a silky congee. Season with a small piece of ginger and a few drops of sesame oil. Avoid salty toppings.",
    ingredients:[{name:"White Rice",amount:"0.5 cup",ckdRisk:"low"},{name:"Water",amount:"4 cups",ckdRisk:"low"},{name:"Ginger",amount:"1 slice",ckdRisk:"low"},{name:"Sesame oil",amount:"0.5 tsp",ckdRisk:"low"},{name:"Green onion (garnish)",amount:"1 tsp",ckdRisk:"low"}],
    substitutions:[],
    nutritionPerServing:{potassium:60,sodium:15,phosphorus:30,protein:2},
    nutritionAfterSwaps:{potassium:60,sodium:15,phosphorus:30,protein:2}},
  { id:15, savedAt:"Default", cuisine:"🌍 Other", dishName:"Greek Salad (Modified)", servings:2, safetyLevel:"caution", photo:null,
    dietitianNote:"Traditional Greek salad has tomatoes and olives which are high in potassium and sodium. A modified version with cucumber, lettuce and minimal feta is much more CKD-friendly.",
    topTip:"Rinse olives thoroughly to remove excess sodium. Use only 3-4 olives per serving and limit feta to 15g. Skip tomatoes or use just 2-3 cherry tomatoes.",
    ingredients:[{name:"Cucumber",amount:"1 cup",ckdRisk:"low"},{name:"Lettuce",amount:"1 cup",ckdRisk:"low"},{name:"Feta cheese",amount:"15g",ckdRisk:"medium"},{name:"Olives (rinsed)",amount:"4 pieces",ckdRisk:"medium"},{name:"Olive oil",amount:"1 tbsp",ckdRisk:"low"},{name:"Cherry tomatoes",amount:"3 small",ckdRisk:"medium"}],
    substitutions:[{original:"Large tomatoes",substitute:"3 cherry tomatoes only",reduction:"Reduces potassium by ~60%"},{original:"Feta (large amount)",substitute:"15g only",reduction:"Reduces sodium & phosphorus by ~50%"}],
    nutritionPerServing:{potassium:250,sodium:310,phosphorus:110,protein:5},
    nutritionAfterSwaps:{potassium:180,sodium:220,phosphorus:85,protein:4}},
  { id:17, savedAt:"Default", cuisine:"🇮🇳 Indian", dishName:"CKD Pulav (No Potato, No Tomato)", servings:4, safetyLevel:"safe", photo:null,
    dietitianNote:"This kidney-safe pulav skips high-potassium potatoes and tomatoes entirely. Cabbage, small carrot portions, cauliflower florets and aromatic spices create a flavorful one-pot rice dish that is very gentle on the kidneys.",
    topTip:"Rinse basmati rice 2-3 times before cooking to reduce starch. Use only a small portion of carrot (2-3 thin slices per serving) as carrots are moderate in potassium. Mint adds wonderful aroma without any kidney risk.",
    ingredients:[
      {name:"Basmati White Rice",amount:"1.5 cups",ckdRisk:"low"},
      {name:"Cabbage (shredded)",amount:"0.75 cup",ckdRisk:"low"},
      {name:"Carrot (small portion)",amount:"0.25 cup sliced thin",ckdRisk:"low"},
      {name:"Cauliflower florets",amount:"0.5 cup",ckdRisk:"low"},
      {name:"Onion",amount:"1 medium sliced",ckdRisk:"low"},
      {name:"Garlic",amount:"3 cloves minced",ckdRisk:"low"},
      {name:"Ginger",amount:"1 tsp grated",ckdRisk:"low"},
      {name:"Green chillies",amount:"1-2 slit",ckdRisk:"low"},
      {name:"Fresh mint leaves",amount:"2 tbsp",ckdRisk:"low"},
      {name:"Turmeric",amount:"0.5 tsp",ckdRisk:"low"},
      {name:"Jeera (cumin seeds)",amount:"1 tsp",ckdRisk:"low"},
      {name:"Coriander powder",amount:"1 tsp",ckdRisk:"low"},
      {name:"Chilli powder",amount:"0.5 tsp",ckdRisk:"low"},
      {name:"Oil or Ghee",amount:"1.5 tbsp",ckdRisk:"low"},
      {name:"Water",amount:"3 cups",ckdRisk:"low"},
    ],
    substitutions:[
      {original:"Potatoes",substitute:"Cauliflower florets",reduction:"Eliminates high-potassium ingredient entirely"},
      {original:"Tomatoes",substitute:"Mint + spices for depth of flavor",reduction:"Removes potassium and acidity risk completely"},
      {original:"Large carrot portion",substitute:"Small 0.25 cup portion only",reduction:"Keeps potassium contribution low"},
      {original:"Frozen mixed vegetables",substitute:"Fresh cabbage and cauliflower only",reduction:"Reduces potassium by ~45%"},
    ],
    nutritionPerServing:{potassium:185,sodium:90,phosphorus:95,protein:5},
    nutritionAfterSwaps:{potassium:185,sodium:90,phosphorus:95,protein:5}},
  { id:16, savedAt:"Default", cuisine:"🌍 Other", dishName:"Veggie Sushi Rolls", servings:3, safetyLevel:"safe", photo:null,
    dietitianNote:"Vegetarian sushi rolls with cucumber and avocado are reasonably kidney-friendly. Avocado is moderate in potassium so limit to 2-3 slices. The biggest risk is sodium from soy sauce.",
    topTip:"Always use low-sodium soy sauce and limit to 1 tsp dipping. Avoid rolls with cream cheese which adds phosphorus. Cucumber rolls are the safest choice.",
    ingredients:[{name:"Sushi Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Nori sheets",amount:"4",ckdRisk:"low"},{name:"Cucumber",amount:"0.5 cup",ckdRisk:"low"},{name:"Avocado",amount:"0.25 (small)",ckdRisk:"medium"},{name:"Rice vinegar",amount:"1 tbsp",ckdRisk:"low"},{name:"Low-sodium soy sauce",amount:"1 tsp",ckdRisk:"medium"}],
    substitutions:[{original:"Regular soy sauce",substitute:"Low-sodium soy sauce (1 tsp only)",reduction:"Reduces sodium by ~50%"},{original:"Large avocado portion",substitute:"2-3 thin slices only",reduction:"Reduces potassium by ~40%"}],
    nutritionPerServing:{potassium:220,sodium:180,phosphorus:80,protein:4},
    nutritionAfterSwaps:{potassium:180,sodium:120,phosphorus:80,protein:4}},
];

const LIB_SAFETY_MAP = {
  safe: { color: LC.accent, bg: "#0d2d1a", label: "✓ Safe" },
  caution: { color: LC.warn, bg: "#2d2010", label: "⚠ Caution" },
  avoid: { color: LC.danger, bg: "#2d1010", label: "✗ Avoid" },
};

function LibSafetyBadge({ level }) {
  const s = LIB_SAFETY_MAP[level] || LIB_SAFETY_MAP.caution;
  return (
    <span style={{ fontSize: 11, color: s.color, background: s.bg, border: `1px solid ${s.color}44`, borderRadius: 10, padding: "3px 10px", fontFamily: "monospace", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function LibNutrientDots({ potassium, sodium, phosphorus, protein }) {
  const nutrients = [
    { label: "K", val: potassium, max: 667 },
    { label: "Na", val: sodium, max: 500 },
    { label: "P", val: phosphorus, max: 267 },
    { label: "Pro", val: protein, max: 17 },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {nutrients.map(({ label, val, max }) => {
        const pct = val / max;
        const color = pct > 1 ? LC.danger : pct > 0.75 ? LC.warn : LC.accent;
        return (
          <div key={label} title={`${label}: ${Math.round(val)}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 28, height: 4, background: "#1a2d20", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 9, color: LC.muted, fontFamily: "monospace" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LibLoadingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: LC.accent, animation: `bl 1.1s ${i * 0.18}s infinite ease-in-out` }} />
        ))}
      </div>
      <span style={{ color: LC.muted, fontSize: 12, fontFamily: "monospace" }}>Analyzing & saving to library...</span>
      <style>{`@keyframes bl{0%,80%,100%{transform:scale(0.45);opacity:0.25}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function RecipeLibrary() {
  const [view, setView] = useState("library"); // library | add | detail
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [safetyFilter, setSafetyFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [storageLoading, setStorageLoading] = useState(true);
  const [mode, setMode] = useState("name");
  const [dishInput, setDishInput] = useState("");
  const [recipeInput, setRecipeInput] = useState("");
  const [cuisine, setCuisine] = useState("🇮🇳 Indian");
  const [servings, setServings] = useState("4");
  const [photo, setPhoto] = useState(null); // base64
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();

  // Load from persistent storage on mount, seed defaults if empty
  useEffect(() => {
    (async () => {
      try {
        if (typeof window.storage !== "undefined") {
          const result = await window.storage.get("ckd-recipe-library");
          if (result?.value) {
            const saved = JSON.parse(result.value);
            setRecipes(saved.length > 0 ? saved : LIB_DEFAULT_RECIPES);
          } else {
            setRecipes(LIB_DEFAULT_RECIPES);
          }
        } else {
          setRecipes(LIB_DEFAULT_RECIPES);
        }
      } catch (e) {
        setRecipes(LIB_DEFAULT_RECIPES);
      } finally {
        setStorageLoading(false);
      }
    })();
    const t = setTimeout(() => { setStorageLoading(false); setRecipes(r => r.length === 0 ? LIB_DEFAULT_RECIPES : r); }, 2000);
    return () => clearTimeout(t);
  }, []);

  // Save to persistent storage whenever recipes change
  const saveRecipes = async (updated) => {
    try {
      if (typeof window.storage !== "undefined") {
        await window.storage.set("ckd-recipe-library", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target.result.split(",")[1]);
      setPhotoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const analyzeAndSave = async () => {
    const input = mode === "name" ? dishInput : recipeInput;
    if (!input.trim()) return;
    setLoading(true);

    const messages = [];
    if (photo) {
      messages.push({
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photo } },
          {
            type: "text", text: `You are a renal dietitian. The user has uploaded a photo of a dish${mode === "name" ? ` called "${input}"` : ""}.
${mode === "paste" ? `Recipe ingredients:\n${input}` : ""}
Cuisine: ${cuisine}. Serves: ${servings}.

Analyze for CKD vegetarian safety. Return ONLY valid JSON:
{
  "dishName": "string",
  "cuisine": "${cuisine}",
  "servings": ${servings},
  "safetyLevel": "safe"|"caution"|"avoid",
  "ingredients": [{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high"}],
  "substitutions": [{"original":"string","substitute":"string","reduction":"string"}],
  "nutritionPerServing": {"potassium":number,"sodium":number,"phosphorus":number,"protein":number},
  "nutritionAfterSwaps": {"potassium":number,"sodium":number,"phosphorus":number,"protein":number},
  "dietitianNote": "2 sentence CKD summary",
  "topTip": "one key cooking tip"
}`
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `You are a renal dietitian. Analyze this for CKD vegetarian safety:
${mode === "name" ? `Dish: "${input}"` : `Recipe:\n${input}`}
Cuisine: ${cuisine}. Serves: ${servings}.

Return ONLY valid JSON:
{
  "dishName": "string",
  "cuisine": "${cuisine}",
  "servings": ${servings},
  "safetyLevel": "safe"|"caution"|"avoid",
  "ingredients": [{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high"}],
  "substitutions": [{"original":"string","substitute":"string","reduction":"string"}],
  "nutritionPerServing": {"potassium":number,"sodium":number,"phosphorus":number,"protein":number},
  "nutritionAfterSwaps": {"potassium":number,"sodium":number,"phosphorus":number,"protein":number},
  "dietitianNote": "2 sentence CKD summary",
  "topTip": "one key cooking tip"
}`
      });
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: API_MODEL, max_tokens: 1200, messages }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const newRecipe = {
        ...parsed,
        id: Date.now(),
        savedAt: new Date().toLocaleDateString(),
        photo: photoPreview || null,
      };
      const updated = [newRecipe, ...recipes];
      setRecipes(updated);
      await saveRecipes(updated);
      setSelected(newRecipe);
      setView("detail");
      setDishInput(""); setRecipeInput(""); setPhoto(null); setPhotoPreview(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id) => {
    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    await saveRecipes(updated);
    setView("library");
  };

  const filtered = recipes.filter(r => {
    const matchSearch = r.dishName?.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === "All" || r.cuisine === cuisineFilter;
    const matchSafety = safetyFilter === "All" || r.safetyLevel === safetyFilter;
    return matchSearch && matchCuisine && matchSafety;
  });

  if (storageLoading) {
    return (
      <div style={{ minHeight: "100vh", background: LC.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: LC.muted, fontFamily: "monospace", fontSize: 14 }}>Loading your recipe library...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: LC.bg, color: LC.text, fontFamily: "'Nunito', sans-serif", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, #0a1a10 0%, #0a0f0d 100%)`, borderBottom: `1px solid ${LC.border}`, padding: "24px 20px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: LC.accentDim, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>CKD Vegetarian</div>
              <h1 style={{ margin: 0, fontSize: "clamp(20px,4vw,30px)", fontWeight: 800, color: LC.white, lineHeight: 1.2 }}>
                My Recipe <span style={{ color: LC.accent }}>Library</span>
              </h1>
            </div>
            <button onClick={() => setView("add")}
              style={{ background: LC.accent, color: "#061008", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
              + Add Recipe
            </button>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", gap: 0 }}>
            {[["library", `📚 Library (${recipes.length})`], ["add", "➕ Add New"]].map(([key, label]) => (
              <button key={key} onClick={() => setView(key)}
                style={{ padding: "10px 20px", border: "none", background: "transparent", color: view === key ? LC.accent : LC.muted, fontSize: 13, fontWeight: view === key ? 700 : 400, cursor: "pointer", fontFamily: "'Nunito', sans-serif", borderBottom: `2px solid ${view === key ? LC.accent : "transparent"}`, transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>

        {/* LIBRARY VIEW */}
        {view === "library" && (
          <div>
            {/* Search & filters */}
            <div style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search recipes..."
                style={{ width: "100%", background: LC.surface, border: `1px solid ${LC.border}`, borderRadius: 10, padding: "10px 14px", color: LC.white, fontSize: 14, outline: "none", fontFamily: "'Nunito', sans-serif", boxSizing: "border-box", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>
                {LIB_CUISINES.map(c => (
                  <button key={c} onClick={() => setCuisineFilter(c)}
                    style={{ background: cuisineFilter === c ? LC.accent : "transparent", color: cuisineFilter === c ? "#061008" : LC.muted, border: `1px solid ${cuisineFilter === c ? LC.accent : LC.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 11, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "monospace", fontWeight: cuisineFilter === c ? 700 : 400 }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "safe", "caution", "avoid"].map(s => {
                  const sm = LIB_SAFETY_MAP[s];
                  return (
                    <button key={s} onClick={() => setSafetyFilter(s)}
                      style={{ background: safetyFilter === s ? (sm?.bg || LC.surface) : "transparent", color: safetyFilter === s ? (sm?.color || LC.accent) : LC.muted, border: `1px solid ${safetyFilter === s ? (sm?.color || LC.accent) : LC.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", textTransform: "capitalize" }}>
                      {s === "All" ? "All Safety" : sm?.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
                <div style={{ color: LC.muted, fontFamily: "monospace", fontSize: 14, marginBottom: 8 }}>
                  {recipes.length === 0 ? "Your library is empty" : "No recipes match your filters"}
                </div>
                <div style={{ fontSize: 12, color: LC.muted }}>
                  {recipes.length === 0 ? "Add your first recipe to get started!" : "Try adjusting your search or filters"}
                </div>
                {recipes.length === 0 && (
                  <button onClick={() => setView("add")}
                    style={{ marginTop: 20, background: LC.accent, color: "#061008", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                    + Add First Recipe
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {filtered.map(recipe => (
                  <div key={recipe.id} onClick={() => { setSelected(recipe); setView("detail"); }}
                    style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all 0.2s", animation: "fadeIn 0.3s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.background = LC.cardHover; e.currentTarget.style.borderColor = LC.accentDim; }}
                    onMouseLeave={e => { e.currentTarget.style.background = LC.card; e.currentTarget.style.borderColor = LC.border; }}>
                    <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

                    {/* Photo or placeholder */}
                    <div style={{ height: 140, background: recipe.photo ? "transparent" : `linear-gradient(135deg, #1a3020, #0a1a10)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                      {recipe.photo
                        ? <img src={recipe.photo} alt={recipe.dishName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ fontSize: 48, opacity: 0.4 }}>🍽</div>
                      }
                      <div style={{ position: "absolute", top: 10, right: 10 }}>
                        <LibSafetyBadge level={recipe.safetyLevel} />
                      </div>
                    </div>

                    <div style={{ padding: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: LC.white, marginBottom: 4, lineHeight: 1.3 }}>{recipe.dishName}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: LC.muted, fontFamily: "monospace" }}>{recipe.cuisine}</span>
                        <span style={{ fontSize: 10, color: LC.muted, fontFamily: "monospace" }}>Saved {recipe.savedAt}</span>
                      </div>
                      <LibNutrientDots
                        potassium={recipe.nutritionAfterSwaps?.potassium || recipe.nutritionPerServing?.potassium || 0}
                        sodium={recipe.nutritionAfterSwaps?.sodium || recipe.nutritionPerServing?.sodium || 0}
                        phosphorus={recipe.nutritionAfterSwaps?.phosphorus || recipe.nutritionPerServing?.phosphorus || 0}
                        protein={recipe.nutritionAfterSwaps?.protein || recipe.nutritionPerServing?.protein || 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD VIEW */}
        {view === "add" && (
          <div>
            <div style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: LC.muted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Add to Library</div>

              {/* Mode toggle */}
              <div style={{ display: "flex", background: LC.surface, borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 }}>
                {[["name", "🍽 Dish Name"], ["paste", "📋 Paste Recipe"]].map(([key, label]) => (
                  <button key={key} onClick={() => setMode(key)}
                    style={{ flex: 1, padding: "9px 12px", border: "none", borderRadius: 8, background: mode === key ? LC.accent : "transparent", color: mode === key ? "#061008" : LC.muted, fontSize: 13, fontWeight: mode === key ? 700 : 400, cursor: "pointer", fontFamily: "'Nunito', sans-serif", transition: "all 0.2s" }}>
                    {label}
                  </button>
                ))}
              </div>

              {mode === "name" ? (
                <input value={dishInput} onChange={e => setDishInput(e.target.value)}
                  placeholder="e.g. Aloo Gobi, Pasta Arrabiata, Bean Tacos..."
                  style={{ width: "100%", background: LC.surface, border: `1px solid ${LC.border}`, borderRadius: 10, padding: "12px 16px", color: LC.white, fontSize: 14, outline: "none", fontFamily: "'Nunito', sans-serif", boxSizing: "border-box", marginBottom: 12 }} />
              ) : (
                <textarea value={recipeInput} onChange={e => setRecipeInput(e.target.value)}
                  placeholder={"Paste your ingredients list or full recipe...\n\ne.g.\n2 potatoes\n1 cup tomatoes\n1 tsp salt\n..."}
                  rows={6}
                  style={{ width: "100%", background: LC.surface, border: `1px solid ${LC.border}`, borderRadius: 10, padding: "12px 16px", color: LC.white, fontSize: 14, outline: "none", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
              )}

              {/* Cuisine + servings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Cuisine</label>
                  <select value={cuisine} onChange={e => setCuisine(e.target.value)}
                    style={{ width: "100%", background: LC.surface, border: `1px solid ${LC.border}`, borderRadius: 10, padding: "10px 14px", color: LC.white, fontSize: 14, outline: "none", fontFamily: "'Nunito', sans-serif" }}>
                    {LIB_CUISINES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Serves</label>
                  <input value={servings} onChange={e => setServings(e.target.value)} type="number" min="1" max="20"
                    style={{ width: 70, background: LC.surface, border: `1px solid ${LC.border}`, borderRadius: 10, padding: "10px 14px", color: LC.white, fontSize: 14, outline: "none", fontFamily: "monospace" }} />
                </div>
              </div>

              {/* Photo upload */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Photo (optional)</label>
                <div onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${LC.border}`, borderRadius: 12, padding: "20px", textAlign: "center", cursor: "pointer", background: LC.surface, transition: "all 0.2s", overflow: "hidden" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = LC.accentDim}
                  onMouseLeave={e => e.currentTarget.style.borderColor = LC.border}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" style={{ maxHeight: 160, borderRadius: 8, objectFit: "cover", width: "100%" }} />
                    : <div>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                        <div style={{ fontSize: 13, color: LC.muted }}>Tap to upload a photo of your dish</div>
                        <div style={{ fontSize: 11, color: LC.muted, marginTop: 4, fontFamily: "monospace" }}>JPG, PNG supported</div>
                      </div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
                {photoPreview && <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{ marginTop: 8, background: "transparent", border: `1px solid ${LC.border}`, borderRadius: 8, padding: "4px 12px", color: LC.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>Remove photo</button>}
              </div>

              <button onClick={analyzeAndSave} disabled={loading || !(mode === "name" ? dishInput : recipeInput).trim()}
                style={{ width: "100%", background: loading ? LC.accentDim : LC.accent, color: "#061008", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif", transition: "background 0.2s" }}>
                {loading ? "Analyzing & Saving..." : "✓ Analyze & Save to Library"}
              </button>
              {loading && <LibLoadingDots />}
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && selected && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <button onClick={() => setView("library")}
              style={{ background: "transparent", border: `1px solid ${LC.border}`, borderRadius: 10, padding: "8px 16px", color: LC.muted, fontSize: 13, cursor: "pointer", fontFamily: "monospace", marginBottom: 16 }}>
              ← Back to Library
            </button>

            {/* Photo */}
            {selected.photo && (
              <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16, maxHeight: 240 }}>
                <img src={selected.photo} alt={selected.dishName} style={{ width: "100%", height: 240, objectFit: "cover" }} />
              </div>
            )}

            {/* Title + meta */}
            <div style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: LC.white }}>{selected.dishName}</h2>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: LC.muted, fontFamily: "monospace" }}>{selected.cuisine}</span>
                    <span style={{ fontSize: 12, color: LC.muted, fontFamily: "monospace" }}>· Serves {selected.servings}</span>
                    <span style={{ fontSize: 12, color: LC.muted, fontFamily: "monospace" }}>· Saved {selected.savedAt}</span>
                  </div>
                </div>
                <LibSafetyBadge level={selected.safetyLevel} />
              </div>
              <p style={{ margin: 0, fontSize: 14, color: LC.text, lineHeight: 1.7, background: LC.surface, borderRadius: 10, padding: 14 }}>{selected.dietitianNote}</p>
            </div>

            {/* Nutrition before/after */}
            <div style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Per Serving Nutrition</div>
              {[
                { label: "Potassium", before: selected.nutritionPerServing?.potassium, after: selected.nutritionAfterSwaps?.potassium, unit: "mg", limit: 667 },
                { label: "Sodium", before: selected.nutritionPerServing?.sodium, after: selected.nutritionAfterSwaps?.sodium, unit: "mg", limit: 500 },
                { label: "Phosphorus", before: selected.nutritionPerServing?.phosphorus, after: selected.nutritionAfterSwaps?.phosphorus, unit: "mg", limit: 267 },
                { label: "Protein", before: selected.nutritionPerServing?.protein, after: selected.nutritionAfterSwaps?.protein, unit: "g", limit: 17 },
              ].map(({ label, before, after, unit, limit }) => {
                const pct = Math.min(((after || before) / limit) * 100, 100);
                const color = (after || before) > limit ? LC.danger : pct > 75 ? LC.warn : LC.accent;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {before !== after && <span style={{ fontSize: 11, color: LC.muted, fontFamily: "monospace", textDecoration: "line-through" }}>{Math.round(before)}{unit}</span>}
                        <span style={{ fontSize: 12, color, fontFamily: "monospace", fontWeight: 700 }}>{Math.round(after || before)}{unit}</span>
                      </div>
                    </div>
                    <div style={{ background: "#0d1a10", borderRadius: 6, height: 7, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ingredients */}
            {selected.ingredients?.length > 0 && (
              <div style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Ingredients</div>
                {selected.ingredients.map((ing, i) => {
                  const riskColor = ing.ckdRisk === "high" ? LC.danger : ing.ckdRisk === "medium" ? LC.warn : LC.accent;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < selected.ingredients.length - 1 ? `1px solid ${LC.border}` : "none" }}>
                      <span style={{ fontSize: 14, color: LC.text }}>{ing.amount} {ing.name}</span>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor, flexShrink: 0 }} />
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  {[["low", LC.accent], ["medium", LC.warn], ["high", LC.danger]].map(([label, color]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 10, color: LC.muted, fontFamily: "monospace", textTransform: "capitalize" }}>{label} risk</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Substitutions */}
            {selected.substitutions?.length > 0 && (
              <div style={{ background: LC.card, border: `1px solid ${LC.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: LC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>CKD-Safe Swaps</div>
                {selected.substitutions.map((sub, i) => (
                  <div key={i} style={{ background: LC.surface, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, color: LC.danger, fontFamily: "monospace", textDecoration: "line-through" }}>{sub.original}</span>
                      <span style={{ color: LC.muted }}>→</span>
                      <span style={{ fontSize: 13, color: LC.accent, fontFamily: "monospace", fontWeight: 600 }}>{sub.substitute}</span>
                    </div>
                    <div style={{ fontSize: 11, color: LC.warn, fontFamily: "monospace" }}>💜 {sub.reduction}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Top tip */}
            {selected.topTip && (
              <div style={{ background: "#0d1a10", border: `1px solid ${LC.accentDim}`, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 12 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <div>
                  <div style={{ fontSize: 11, color: LC.accent, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Dietitian Tip</div>
                  <p style={{ margin: 0, fontSize: 14, color: LC.text, lineHeight: 1.6 }}>{selected.topTip}</p>
                </div>
              </div>
            )}

            <button onClick={() => deleteRecipe(selected.id)}
              style={{ width: "100%", background: "transparent", border: `1px solid ${LC.danger}55`, borderRadius: 12, padding: "12px", color: LC.danger, fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              🗑 Delete from Library
            </button>

            <p style={{ marginTop: 20, fontSize: 11, color: LC.muted, textAlign: "center", fontFamily: "monospace", lineHeight: 1.6 }}>
              Always consult your renal dietitian before making dietary changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════

const HC = {
  bg: "#07100a",
  surface: "#0d1a10",
  card: "#112115",
  cardHover: "#172d1c",
  border: "#1e3324",
  accent: "#3ddc72",
  accentGlow: "#3ddc7244",
  accentDim: "#1a6e38",
  gold: "#f0c040",
  sky: "#40c8f0",
  rose: "#f06080",
  lavender: "#a080f0",
  text: "#c8e8d0",
  muted: "#527860",
  white: "#edfaf2",
  dim: "#0a1a0e",
};

const HOME_FEATURES = [
  {
    id: "checker",
    icon: "🔍",
    title: "Food Safety\nChecker",
    desc: "Is this food safe for my kidneys? Instant analysis.",
    color: HC.accent,
    glow: "#3ddc7230",
    tag: "Quick Check",
  },
  {
    id: "tracker",
    icon: "📋",
    title: "Daily Food\nTracker",
    desc: "Log meals and track potassium, sodium, phosphorus & protein.",
    color: HC.sky,
    glow: "#40c8f030",
    tag: "Track Today",
  },
  {
    id: "converter",
    icon: "🔄",
    title: "Recipe\nConverter",
    desc: "Paste any recipe and get CKD-safe swaps automatically.",
    color: HC.lavender,
    glow: "#a080f030",
    tag: "Modify Recipe",
  },
  {
    id: "library",
    icon: "📚",
    title: "Recipe\nLibrary",
    desc: "Browse & save your personal collection of kidney-safe dishes.",
    color: HC.gold,
    glow: "#f0c04030",
    tag: "17 Recipes",
  },
  {
    id: "planner",
    icon: "🗓",
    title: "Meal\nPlanner",
    desc: "Generate a full week of CKD-safe vegetarian meal plans.",
    color: HC.rose,
    glow: "#f0608030",
    tag: "Coming Soon",
    soon: true,
  },
  {
    id: "labs",
    icon: "🧪",
    title: "Lab\nTracker",
    desc: "Log bloodwork and visualize how diet affects your results.",
    color: "#60e8c0",
    glow: "#60e8c030",
    tag: "Coming Soon",
    soon: true,
  },
];

const HOME_TIPS = [
  "💧 Double-boil potatoes and discard water to cut potassium by up to 50%",
  "🥦 Cauliflower is one of the safest vegetables for CKD — use it freely",
  "🍚 White rice is safer than brown rice for CKD — lower in phosphorus",
  "🌿 Fresh mint adds flavor to pulav without any kidney risk",
  "🧂 Use lemon juice instead of salt to add flavor with less sodium",
  "🫙 Rinse canned vegetables thoroughly to reduce sodium by ~40%",
  "🍋 Leaching vegetables in water reduces potassium significantly",
  "🫚 Ghee and olive oil are both kidney-safe fats in small amounts",
];

function HomeFeatureCard({ feature, onClick, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => !feature.soon && onClick(feature.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && !feature.soon ? HC.cardHover : HC.card,
        border: `1px solid ${hovered && !feature.soon ? feature.color + "66" : HC.border}`,
        borderRadius: 18,
        padding: "20px 18px",
        cursor: feature.soon ? "default" : "pointer",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: hovered && !feature.soon ? `0 0 24px ${feature.glow}` : "none",
        opacity: feature.soon ? 0.6 : 1,
        animation: `cardIn 0.5s ${index * 0.07}s both ease-out`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Glow orb */}
      {hovered && !feature.soon && (
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: feature.glow, filter: "blur(20px)", pointerEvents: "none" }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{feature.icon}</span>
        <span style={{
          fontSize: 10, fontFamily: "monospace", letterSpacing: 1,
          color: feature.soon ? HC.muted : feature.color,
          background: feature.soon ? HC.surface : `${feature.color}18`,
          border: `1px solid ${feature.soon ? HC.border : feature.color + "44"}`,
          borderRadius: 10, padding: "3px 8px", textTransform: "uppercase",
        }}>
          {feature.tag}
        </span>
      </div>

      <div style={{
        fontSize: 15, fontWeight: 700, color: feature.soon ? HC.muted : HC.white,
        lineHeight: 1.3, marginBottom: 8, whiteSpace: "pre-line",
        fontFamily: "'Outfit', sans-serif",
      }}>
        {feature.title}
      </div>
      <div style={{ fontSize: 12, color: HC.muted, lineHeight: 1.6 }}>
        {feature.desc}
      </div>

      {!feature.soon && (
        <div style={{
          marginTop: 14, fontSize: 12, color: feature.color,
          fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4,
          opacity: hovered ? 1 : 0, transition: "opacity 0.2s",
        }}>
          Open → 
        </div>
      )}
    </div>
  );
}

function HomeQuickStats() {
  const stats = [
    { label: "Potassium limit", val: "2,000mg", sub: "daily" },
    { label: "Sodium limit", val: "1,500mg", sub: "daily" },
    { label: "Phosphorus limit", val: "800mg", sub: "daily" },
    { label: "Protein limit", val: "50g", sub: "daily" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 24 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: HC.accent, fontFamily: "monospace" }}>{s.val}</div>
          <div style={{ fontSize: 10, color: HC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Inline Mini-Apps ──────────────────────────────────────────────────────────

function HomeQuickChecker({ onBack }) {
  const [food, setFood] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const check = async () => {
    if (!food.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 800,
          messages: [{ role: "user", content: `You are a renal dietitian. Analyze "${food}" for CKD vegetarian patients. Return ONLY valid JSON:
{"foodName":"string","safetyLevel":"safe"|"caution"|"avoid","potassium":number,"sodium":number,"phosphorus":number,"protein":number,"potassiumRisk":"low"|"medium"|"high","sodiumRisk":"low"|"medium"|"high","phosphorusRisk":"low"|"medium"|"high","proteinRisk":"low"|"medium"|"high","ckdNote":"2 sentence summary","tip":"one practical tip"}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sc = result ? ({ safe: HC.accent, caution: HC.gold, avoid: HC.rose }[result.safetyLevel] || HC.gold) : HC.accent;
  const sl = result ? ({ safe: "✓ CKD Safe", caution: "⚠ Use Caution", avoid: "✗ Avoid" }[result.safetyLevel]) : "";

  return (
    <div>
      <HomeBackBtn onBack={onBack} label="Food Safety Checker" />
      <div style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={food} onChange={e => setFood(e.target.value)} onKeyDown={e => e.key === "Enter" && check()}
            placeholder="e.g. spinach, tofu, khichdi..." autoFocus
            style={{ flex: 1, background: HC.surface, border: `1px solid ${HC.border}`, borderRadius: 10, padding: "11px 14px", color: HC.white, fontSize: 14, outline: "none", fontFamily: "'Outfit', sans-serif" }} />
          <button onClick={check} disabled={loading || !food.trim()}
            style={{ background: HC.accent, color: "#04100a", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "..." : "Check"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {["Khichdi","Poha","Tofu","Cauliflower","Banana","Spinach"].map(f => (
            <button key={f} onClick={() => setFood(f)}
              style={{ background: "transparent", border: `1px solid ${HC.border}`, borderRadius: 20, padding: "4px 10px", color: HC.muted, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {loading && <div style={{ textAlign: "center", padding: "24px", color: HC.muted, fontFamily: "monospace", fontSize: 13 }}>Analyzing...</div>}
      {result && (
        <div style={{ background: HC.card, border: `1px solid ${sc}44`, borderRadius: 16, padding: 20, animation: "cardIn 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: HC.white, fontFamily: "'Outfit', sans-serif" }}>{result.foodName}</div>
            <span style={{ fontSize: 12, color: sc, background: `${sc}18`, border: `1px solid ${sc}44`, borderRadius: 10, padding: "4px 12px", fontFamily: "monospace", fontWeight: 700 }}>{sl}</span>
          </div>
          <p style={{ fontSize: 13, color: HC.text, lineHeight: 1.7, margin: "0 0 16px", background: HC.surface, borderRadius: 10, padding: 12 }}>{result.ckdNote}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 14 }}>
            {[["Potassium", result.potassium, "mg", result.potassiumRisk], ["Sodium", result.sodium, "mg", result.sodiumRisk], ["Phosphorus", result.phosphorus, "mg", result.phosphorusRisk], ["Protein", result.protein, "g", result.proteinRisk]].map(([l, v, u, r]) => {
              const rc = r === "high" ? HC.rose : r === "medium" ? HC.gold : HC.accent;
              return (
                <div key={l} style={{ background: HC.surface, borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 10, color: HC.muted, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: rc, fontFamily: "monospace" }}>{Math.round(v)}{u}</div>
                </div>
              );
            })}
          </div>
          <div style={{ background: "#0d1a10", border: `1px solid ${HC.accentDim}`, borderRadius: 10, padding: 12, fontSize: 12, color: HC.text, lineHeight: 1.6 }}>
            💡 {result.tip}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeRecipeConverter({ onBack }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const convert = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1200,
          messages: [{ role: "user", content: `You are a renal dietitian. Convert this recipe/dish to CKD-safe vegetarian: "${input}". Return ONLY valid JSON:
{"dishName":"string","safetyBefore":"safe"|"caution"|"avoid","safetyAfter":"safe"|"caution"|"avoid","substitutions":[{"original":"string","substitute":"string","reduction":"string"}],"cookingTips":["string"],"summary":"2 sentence description of CKD-safe version"}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sc = (s) => ({ safe: HC.accent, caution: HC.gold, avoid: HC.rose }[s] || HC.gold);
  const sl = (s) => ({ safe: "✓ Safe", caution: "⚠ Caution", avoid: "✗ Avoid" }[s] || s);

  return (
    <div>
      <HomeBackBtn onBack={onBack} label="Recipe Converter" />
      <div style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder={"Type a dish name or paste ingredients:\ne.g. Aloo Gobi\nor:\n2 potatoes, 1 cup tomatoes, spices..."}
          style={{ width: "100%", background: HC.surface, border: `1px solid ${HC.border}`, borderRadius: 10, padding: "12px 14px", color: HC.white, fontSize: 14, outline: "none", fontFamily: "monospace", resize: "none", boxSizing: "border-box", marginBottom: 12 }} />
        <button onClick={convert} disabled={loading || !input.trim()}
          style={{ width: "100%", background: HC.lavender, color: "#1a0a2e", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
          {loading ? "Converting..." : "🔄 Convert to CKD-Safe →"}
        </button>
      </div>
      {loading && <div style={{ textAlign: "center", padding: "24px", color: HC.muted, fontFamily: "monospace", fontSize: 13 }}>Finding safe swaps...</div>}
      {result && (
        <div style={{ animation: "cardIn 0.4s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, marginBottom: 14, alignItems: "center" }}>
            <div style={{ background: HC.card, border: `1px solid ${sc(result.safetyBefore)}44`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: HC.muted, fontFamily: "monospace", marginBottom: 4 }}>BEFORE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sc(result.safetyBefore) }}>{sl(result.safetyBefore)}</div>
            </div>
            <div style={{ color: HC.muted, fontSize: 18, textAlign: "center" }}>→</div>
            <div style={{ background: HC.card, border: `1px solid ${sc(result.safetyAfter)}44`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: HC.muted, fontFamily: "monospace", marginBottom: 4 }}>AFTER</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sc(result.safetyAfter) }}>{sl(result.safetyAfter)}</div>
            </div>
          </div>
          {result.substitutions?.map((s, i) => (
            <div key={i} style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ color: HC.rose, fontFamily: "monospace", fontSize: 13, textDecoration: "line-through" }}>{s.original}</span>
                <span style={{ color: HC.muted }}>→</span>
                <span style={{ color: HC.accent, fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>{s.substitute}</span>
              </div>
              <div style={{ fontSize: 11, color: HC.lavender, fontFamily: "monospace" }}>💜 {s.reduction}</div>
            </div>
          ))}
          {result.cookingTips?.map((t, i) => (
            <div key={i} style={{ background: "#0d1a10", border: `1px solid ${HC.accentDim}`, borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 12, color: HC.text, lineHeight: 1.6 }}>
              → {t}
            </div>
          ))}
          <div style={{ background: HC.surface, borderRadius: 12, padding: 14, fontSize: 13, color: HC.text, lineHeight: 1.7 }}>{result.summary}</div>
        </div>
      )}
    </div>
  );
}

function HomeRecipeLibrary({ onBack }) {
  const DEFAULT_DISHES = [
    { name: "Khichdi", cuisine: "🇮🇳", safe: "safe" },
    { name: "Poha", cuisine: "🇮🇳", safe: "safe" },
    { name: "Upma", cuisine: "🇮🇳", safe: "safe" },
    { name: "CKD Pulav", cuisine: "🇮🇳", safe: "safe" },
    { name: "Chapati + Ghee", cuisine: "🇮🇳", safe: "safe" },
    { name: "Aloo Gobi (modified)", cuisine: "🇮🇳", safe: "caution" },
    { name: "Idli + Sambar (modified)", cuisine: "🇮🇳", safe: "caution" },
    { name: "Pasta Aglio e Olio", cuisine: "🇮🇹", safe: "safe" },
    { name: "Zucchini Risotto", cuisine: "🇮🇹", safe: "safe" },
    { name: "Margherita Pizza (modified)", cuisine: "🇮🇹", safe: "caution" },
    { name: "Cauliflower Tacos", cuisine: "🇲🇽", safe: "safe" },
    { name: "Veggie Quesadilla", cuisine: "🇲🇽", safe: "safe" },
    { name: "Mexican Rice", cuisine: "🇲🇽", safe: "safe" },
    { name: "Steamed Rice + Bok Choy", cuisine: "🇨🇳", safe: "safe" },
    { name: "Congee", cuisine: "🇨🇳", safe: "safe" },
    { name: "Egg Fried Rice (modified)", cuisine: "🇨🇳", safe: "caution" },
    { name: "Greek Salad (modified)", cuisine: "🌍", safe: "caution" },
    { name: "Veggie Sushi Rolls", cuisine: "🌍", safe: "safe" },
  ];
  const sc = { safe: HC.accent, caution: HC.gold, avoid: HC.rose };
  const sl = { safe: "✓ Safe", caution: "⚠ Caution", avoid: "✗ Avoid" };
  return (
    <div>
      <HomeBackBtn onBack={onBack} label="Recipe Library" />
      <div style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: HC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          {DEFAULT_DISHES.length} CKD-Safe Recipes
        </div>
        {DEFAULT_DISHES.map((d, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < DEFAULT_DISHES.length - 1 ? `1px solid ${HC.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{d.cuisine}</span>
              <span style={{ fontSize: 14, color: HC.white, fontFamily: "'Outfit', sans-serif" }}>{d.name}</span>
            </div>
            <span style={{ fontSize: 10, color: sc[d.safe], background: `${sc[d.safe]}18`, border: `1px solid ${sc[d.safe]}44`, borderRadius: 10, padding: "3px 8px", fontFamily: "monospace" }}>
              {sl[d.safe]}
            </span>
          </div>
        ))}
      </div>
      <div style={{ background: "#0d1a10", border: `1px solid ${HC.accentDim}`, borderRadius: 12, padding: 14, fontSize: 12, color: HC.muted, fontFamily: "monospace", textAlign: "center" }}>
        Open the full Recipe Library app to view details, add photos & add your own recipes
      </div>
    </div>
  );
}

function HomeBackBtn({ onBack, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <button onClick={onBack} style={{ background: HC.surface, border: `1px solid ${HC.border}`, borderRadius: 10, padding: "7px 14px", color: HC.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>← Home</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: HC.white, fontFamily: "'Outfit', sans-serif" }}>{label}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function HomeScreen() {
  const [screen, setScreen] = useState("home");
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % HOME_TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const navigate = (id) => setScreen(id);

  return (
    <div style={{ minHeight: "100vh", background: HC.bg, color: HC.text, fontFamily: "'Outfit', sans-serif", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes cardIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes tipSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #527860; }
      `}</style>

      {/* ── HOME SCREEN ── */}
      {screen === "home" && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>

          {/* Hero */}
          <div style={{
            background: `radial-gradient(ellipse at 50% 0%, #1a3d22 0%, ${HC.bg} 70%)`,
            borderBottom: `1px solid ${HC.border}`,
            padding: "40px 20px 28px",
            textAlign: "center",
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0d2015", border: `1px solid ${HC.accentDim}`, borderRadius: 20, padding: "5px 16px", marginBottom: 18 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: HC.accent, boxShadow: `0 0 8px ${HC.accent}` }} />
              <span style={{ fontSize: 11, color: HC.accent, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>CKD · Vegetarian · Nutrition</span>
            </div>
            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px,7vw,52px)", fontWeight: 900, color: HC.white, lineHeight: 1.1, letterSpacing: -1 }}>
              Kidney<span style={{ color: HC.accent }}>Care</span>
            </h1>
            <p style={{ color: HC.muted, fontSize: 15, margin: "0 0 24px", maxWidth: 360, marginInline: "auto", lineHeight: 1.6 }}>
              Your personal guide to eating well with CKD — vegetarian, global cuisines, kidney-safe
            </p>

            {/* Rotating tip */}
            <div key={tipIdx} style={{ background: "#0d2015", border: `1px solid ${HC.border}`, borderRadius: 12, padding: "10px 16px", maxWidth: 420, marginInline: "auto", animation: "tipSlide 0.4s ease" }}>
              <span style={{ fontSize: 12, color: HC.text, lineHeight: 1.6, fontFamily: "monospace" }}>{HOME_TIPS[tipIdx]}</span>
            </div>
          </div>

          <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>

            {/* Daily limits */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: HC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Your CKD Daily Limits</div>
              <HomeQuickStats />
            </div>

            {/* Feature grid */}
            <div style={{ fontSize: 11, color: HC.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Tools & Features</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {HOME_FEATURES.map((f, i) => (
                <HomeFeatureCard key={f.id} feature={f} onClick={navigate} index={i} />
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: HC.muted, fontFamily: "monospace", lineHeight: 1.8 }}>
              🌿 Always consult your renal dietitian<br />
              before making dietary changes.<br />
              <span style={{ color: HC.accentDim }}>KidneyCare v1.0 · Built for CKD Warriors</span>
            </div>
          </div>
        </div>
      )}

      {/* ── INNER SCREENS ── */}
      {screen !== "home" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px", animation: "fadeIn 0.3s ease" }}>
          {screen === "checker" && <HomeQuickChecker onBack={() => setScreen("home")} />}
          {screen === "tracker" && (
            <div>
              <HomeBackBtn onBack={() => setScreen("home")} label="Daily Food Tracker" />
              <div style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: HC.white, marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Daily Food Tracker</div>
                <p style={{ fontSize: 13, color: HC.muted, lineHeight: 1.7, marginBottom: 20 }}>
                  Log your meals and track potassium, sodium, phosphorus & protein across global vegetarian cuisines. Available as a standalone app.
                </p>
                <div style={{ background: HC.surface, borderRadius: 12, padding: 14, fontSize: 12, color: HC.muted, fontFamily: "monospace" }}>
                  Open the <strong style={{ color: HC.sky }}>ckd-food-tracker</strong> artifact to use the full tracker with cuisine quick-picks and daily totals dashboard.
                </div>
              </div>
            </div>
          )}
          {screen === "converter" && <HomeRecipeConverter onBack={() => setScreen("home")} />}
          {screen === "library" && <HomeRecipeLibrary onBack={() => setScreen("home")} />}
          {screen === "planner" && (
            <div>
              <HomeBackBtn onBack={() => setScreen("home")} label="Meal Planner" />
              <div style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗓</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: HC.white, marginBottom: 8 }}>Meal Planner — Coming Soon</div>
                <p style={{ fontSize: 13, color: HC.muted, lineHeight: 1.7 }}>Generate a full week of CKD-safe vegetarian meal plans across Indian, Italian, Mexican and Chinese cuisines. This feature is coming next!</p>
              </div>
            </div>
          )}
          {screen === "labs" && (
            <div>
              <HomeBackBtn onBack={() => setScreen("home")} label="Lab Tracker" />
              <div style={{ background: HC.card, border: `1px solid ${HC.border}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: HC.white, marginBottom: 8 }}>Lab Tracker — Coming Soon</div>
                <p style={{ fontSize: 13, color: HC.muted, lineHeight: 1.7 }}>Log your monthly bloodwork (creatinine, potassium, GFR) and visualize how your diet choices affect your lab results over time.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════
// ROOT APP — NAVIGATION
// ══════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");
  return (
    <div>
      {screen === "home"      && <HomeScreen />}
      {screen === "checker"   && <FoodChecker   onBack={() => setScreen("home")} />}
      {screen === "tracker"   && <FoodTracker   onBack={() => setScreen("home")} />}
      {screen === "converter" && <RecipeConverter onBack={() => setScreen("home")} />}
      {screen === "library"   && <RecipeLibrary  onBack={() => setScreen("home")} />}
    </div>
  );
}
