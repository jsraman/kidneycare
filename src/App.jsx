import { useState, useEffect, useRef } from "react";

const API_MODEL = "claude-sonnet-4-20250514";

// ══════════════════════════════════════════
// CKD STAGE LIMITS
// ══════════════════════════════════════════
const CKD_STAGES = {
  "Stage 1": { label:"Stage 1", gfr:"90+", potassium:3500, sodium:2300, phosphorus:1000, protein:60, color:"#3ddc72", note:"Kidney function near normal. Modest restrictions." },
  "Stage 2": { label:"Stage 2", gfr:"60–89", potassium:3000, sodium:2000, phosphorus:900, protein:55, color:"#80d060", note:"Mild loss of function. Begin monitoring intake." },
  "Stage 3": { label:"Stage 3", gfr:"30–59", potassium:2500, sodium:1800, phosphorus:800, protein:50, color:"#f0c040", note:"Moderate loss. Diet restrictions become important." },
  "Stage 4": { label:"Stage 4", gfr:"15–29", potassium:2000, sodium:1500, phosphorus:800, protein:45, color:"#f0903a", note:"Severe loss. Strict dietary management required." },
  "ESRD":    { label:"ESRD",    gfr:"<15",  potassium:1500, sodium:1000, phosphorus:700, protein:40, color:"#f06060", note:"Kidney failure. Most restrictive diet needed." },
};

// ══════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════
function getRiskColor(risk) {
  return risk === "high" ? "#f06060" : risk === "medium" ? "#f0b429" : "#3ddc72";
}

function callClaude(prompt, maxTokens) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: API_MODEL, max_tokens: maxTokens || 1000, messages: [{ role:"user", content:prompt }] }),
  }).then(r => r.json()).then(d => {
    const text = d.content?.map(b => b.text||"").join("")||"";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  });
}

function BounceDots({ color }) {
  return (
    <div style={{ display:"flex", gap:5, justifyContent:"center", padding:"24px 0" }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:color||"#3ddc72", animation:`ckdB 1.1s ${i*0.18}s infinite ease-in-out` }}/>
      ))}
      <style>{`@keyframes ckdB{0%,80%,100%{transform:scale(0.45);opacity:0.25}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function TopBar({ onBack, title }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:50, background:"#07100a", borderBottom:"1px solid #1e3324", padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
      <button onClick={onBack} style={{ background:"#112115", border:"1px solid #1e3324", borderRadius:10, padding:"8px 16px", color:"#3ddc72", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
        ← Home
      </button>
      <span style={{ fontSize:15, fontWeight:700, color:"#edfaf2", fontFamily:"'Outfit',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</span>
    </div>
  );
}

function StageBanner({ stage }) {
  const s = CKD_STAGES[stage];
  return (
    <div style={{ background:"#0d1a10", border:`1px solid ${s.color}44`, borderRadius:10, padding:"8px 14px", margin:"12px 16px 0", display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
      <span style={{ fontSize:12, color:s.color, fontFamily:"monospace", fontWeight:700 }}>{s.label} · GFR {s.gfr}</span>
      <span style={{ fontSize:11, color:"#527860", fontFamily:"monospace" }}>· K:{s.potassium}mg Na:{s.sodium}mg P:{s.phosphorus}mg Pro:{s.protein}g</span>
    </div>
  );
}

// ══════════════════════════════════════════
// FOOD CHECKER
// ══════════════════════════════════════════
function FoodChecker({ onBack, stage }) {
  const limits = CKD_STAGES[stage];
  const [food, setFood] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const check = async () => {
    if (!food.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const data = await callClaude(`You are a renal dietitian for CKD ${stage} patients (GFR ${limits.gfr}). Analyze: "${food}". Daily limits: K ${limits.potassium}mg, Na ${limits.sodium}mg, P ${limits.phosphorus}mg, Protein ${limits.protein}g. Return ONLY valid JSON:
{"foodName":"string","safetyLevel":"safe"|"caution"|"avoid","potassium":{"per100g":number,"risk":"low"|"medium"|"high"},"sodium":{"per100g":number,"risk":"low"|"medium"|"high"},"phosphorus":{"per100g":number,"risk":"low"|"medium"|"high"},"protein":{"per100g":number,"risk":"low"|"medium"|"high"},"ckdNote":"1-2 sentence summary for ${stage}","tip":"one practical tip","vegetarianStatus":"vegan"|"vegetarian"|"not-vegetarian"}`);
      setResult(data);
      setHistory(h=>[{food:data.foodName,level:data.safetyLevel},...h.slice(0,4)]);
    } catch(e) { setError("Could not analyze. Please try again."); }
    finally { setLoading(false); }
  };

  const sc = { safe:"#3ddc72", caution:"#f0b429", avoid:"#f06060" };
  const sl = { safe:"✓ CKD Safe", caution:"⚠ Use Caution", avoid:"✗ Avoid" };

  return (
    <div style={{ minHeight:"100vh", background:"#07100a", color:"#c8e8d0", fontFamily:"'Outfit',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="Food Safety Checker"/>
      <StageBanner stage={stage}/>
      <div style={{ maxWidth:560, margin:"0 auto", padding:"20px 16px" }}>
        <div style={{ background:"#112115", border:"1px solid #1e3324", borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input value={food} onChange={e=>setFood(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()}
              placeholder="e.g. spinach, tofu, khichdi..." autoFocus
              style={{ flex:1, background:"#0d1a10", border:"1px solid #1e3324", borderRadius:10, padding:"11px 14px", color:"#edfaf2", fontSize:14, outline:"none", fontFamily:"'Outfit',sans-serif" }}/>
            <button onClick={check} disabled={loading||!food.trim()}
              style={{ background:"#3ddc72", color:"#04100a", border:"none", borderRadius:10, padding:"11px 20px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              {loading?"...":"Check →"}
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {["Khichdi","Poha","Cauliflower","Tofu","Banana","Spinach","Dal","White Rice"].map(f=>(
              <button key={f} onClick={()=>setFood(f)} style={{ background:"transparent", border:"1px solid #1e3324", borderRadius:20, padding:"4px 12px", color:"#527860", fontSize:12, cursor:"pointer", fontFamily:"monospace" }}>{f}</button>
            ))}
          </div>
        </div>
        {loading && <BounceDots/>}
        {error && <div style={{ background:"#2d1010", borderRadius:12, padding:16, color:"#f06060", fontSize:14, marginBottom:16 }}>{error}</div>}
        {result && !loading && (
          <div style={{ animation:"ckdFade 0.4s ease" }}>
            <style>{`@keyframes ckdFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ background:"#112115", border:`1px solid ${(sc[result.safetyLevel]||"#3ddc72")}44`, borderRadius:16, padding:20, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:"#edfaf2" }}>{result.foodName}</div>
                  <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace" }}>{result.vegetarianStatus==="vegan"?"🌱 Vegan":result.vegetarianStatus==="vegetarian"?"🥚 Vegetarian":"⚠ Not Vegetarian"}</div>
                </div>
                <span style={{ fontSize:12, color:sc[result.safetyLevel], background:`${sc[result.safetyLevel]}18`, border:`1px solid ${sc[result.safetyLevel]}44`, borderRadius:10, padding:"5px 14px", fontFamily:"monospace", fontWeight:700 }}>{sl[result.safetyLevel]}</span>
              </div>
              <p style={{ fontSize:13, color:"#c8e8d0", lineHeight:1.7, margin:"0 0 16px", background:"#0d1a10", borderRadius:10, padding:12 }}>{result.ckdNote}</p>
              {[["Potassium",result.potassium?.per100g,limits.potassium/7,"mg",result.potassium?.risk],["Sodium",result.sodium?.per100g,limits.sodium/7,"mg",result.sodium?.risk],["Phosphorus",result.phosphorus?.per100g,limits.phosphorus/7,"mg",result.phosphorus?.risk],["Protein",result.protein?.per100g,limits.protein/7,"g",result.protein?.risk]].map(([l,v,max,u,r])=>(
                <div key={l} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:"#527860", fontFamily:"monospace" }}>{l}</span>
                    <span style={{ fontSize:11, color:getRiskColor(r), fontFamily:"monospace" }}>{Math.round(v||0)}{u}</span>
                  </div>
                  <div style={{ background:"#0d1a10", borderRadius:4, height:5, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(((v||0)/max)*100,100)}%`, height:"100%", background:getRiskColor(r), borderRadius:4, transition:"width 0.7s ease" }}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:"#0d1a10", border:"1px solid #1a6e38", borderRadius:12, padding:14, display:"flex", gap:10 }}>
              <span>💡</span>
              <p style={{ margin:0, fontSize:13, color:"#c8e8d0", lineHeight:1.6 }}>{result.tip}</p>
            </div>
          </div>
        )}
        {history.length>0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Recent</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {history.map((h,i)=><button key={i} onClick={()=>setFood(h.food)} style={{ background:"#112115", border:`1px solid ${({safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"}[h.level]||"#3ddc72")}55`, borderRadius:20, padding:"5px 14px", color:({safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"}[h.level]||"#3ddc72"), fontSize:12, cursor:"pointer", fontFamily:"monospace" }}>{h.food}</button>)}
            </div>
          </div>
        )}
        <p style={{ marginTop:32, fontSize:11, color:"#527860", textAlign:"center", fontFamily:"monospace", lineHeight:1.6 }}>For informational purposes only. Always consult your renal dietitian.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FOOD TRACKER
// ══════════════════════════════════════════
const TRK_CUISINES = {
  "🇮🇳 Indian":["Dal","Idli","Chapati","Paneer","Aloo Gobi","Khichdi","Poha","Upma","Sambar","Raita"],
  "🇮🇹 Italian":["Pasta Marinara","Margherita Pizza","Risotto","Minestrone","Bruschetta","Caprese Salad","Focaccia","Gnocchi"],
  "🇲🇽 Mexican":["Bean Tacos","Guacamole","Veggie Burrito","Salsa","Cheese Quesadilla","Elote","Refried Beans","Tortilla Soup"],
  "🇨🇳 Chinese":["Steamed Rice","Mapo Tofu","Spring Rolls","Bok Choy Stir Fry","Egg Fried Rice","Congee","Steamed Dumplings","Hot & Sour Soup"],
  "🌍 Other":["Hummus","Falafel","Greek Salad","Miso Soup","Veggie Sushi","Pad Thai (veg)","Shakshuka","Tabbouleh"],
};

function FoodTracker({ onBack, stage }) {
  const limits = CKD_STAGES[stage];
  const [tab, setTab] = useState("track");
  const [food, setFood] = useState("");
  const [portion, setPortion] = useState("100");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [activeCuisine, setActiveCuisine] = useState("🇮🇳 Indian");
  const [pendingFood, setPendingFood] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const totals = log.reduce((acc,item)=>{
    const s=item.portion/100;
    return { potassium:acc.potassium+item.potassium*s, sodium:acc.sodium+item.sodium*s, phosphorus:acc.phosphorus+item.phosphorus*s, protein:acc.protein+item.protein*s };
  },{potassium:0,sodium:0,phosphorus:0,protein:0});

  const analyze = async(name,portionG)=>{
    setLoading(true);
    try {
      const data = await callClaude(`Renal dietitian for CKD ${stage}: analyze "${name}" for vegetarian patient. Return ONLY JSON: {"foodName":"string","safetyLevel":"safe"|"caution"|"avoid","potassium":number,"sodium":number,"phosphorus":number,"protein":number,"potassiumRisk":"low"|"medium"|"high","sodiumRisk":"low"|"medium"|"high","phosphorusRisk":"low"|"medium"|"high","proteinRisk":"low"|"medium"|"high","tip":"string"}`,600);
      setLog(l=>[...l,{...data,portion:parseInt(portionG)||100,id:Date.now()}]);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const sc=s=>s==="safe"?"#3ddc72":s==="caution"?"#f0b429":"#f06060";
  const sl=s=>s==="safe"?"✓ Safe":s==="caution"?"⚠ Caution":"✗ Avoid";

  return (
    <div style={{ minHeight:"100vh", background:"#0e0e18", color:"#d8d4f0", fontFamily:"'Outfit',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="Daily Food Tracker"/>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <StageBanner stage={stage}/>
        <div style={{ display:"flex", borderBottom:"1px solid #2a2a45", background:"#14141f", marginTop:12 }}>
          {[["track","➕ Add"],["log",`📋 Log (${log.length})`],["totals","📊 Totals"]].map(([k,lbl])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:"12px 8px", border:"none", background:"transparent", color:tab===k?"#e8a838":"#7870a0", fontSize:12, fontWeight:tab===k?700:400, cursor:"pointer", fontFamily:"monospace", borderBottom:`2px solid ${tab===k?"#e8a838":"transparent"}` }}>{lbl}</button>
          ))}
        </div>
        <div style={{ padding:"16px" }}>
          {tab==="track" && (
            <div>
              <div style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input value={food} onChange={e=>setFood(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(analyze(food,portion),setFood(""),setPortion("100"))}
                    placeholder="Type any vegetarian food..."
                    style={{ flex:1, background:"#14141f", border:"1px solid #2a2a45", borderRadius:8, padding:"10px 14px", color:"#f4f0ff", fontSize:14, outline:"none", fontFamily:"'Outfit',sans-serif" }}/>
                  <input value={portion} onChange={e=>setPortion(e.target.value)} placeholder="g"
                    style={{ width:60, background:"#14141f", border:"1px solid #2a2a45", borderRadius:8, padding:"10px", color:"#f4f0ff", fontSize:14, outline:"none", textAlign:"center", fontFamily:"monospace" }}/>
                  <button onClick={()=>{if(food.trim()){analyze(food,portion);setFood("");setPortion("100");}}} disabled={loading||!food.trim()}
                    style={{ background:"#e8a838", color:"#1a0e00", border:"none", borderRadius:8, padding:"10px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Add</button>
                </div>
                {loading && <BounceDots color="#e8a838"/>}
              </div>
              <div style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:14, padding:16 }}>
                <div style={{ fontSize:11, color:"#7870a0", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Quick Pick by Cuisine</div>
                <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:12 }}>
                  {Object.keys(TRK_CUISINES).map(c=>(
                    <button key={c} onClick={()=>setActiveCuisine(c)} style={{ background:activeCuisine===c?"#e8a838":"#14141f", color:activeCuisine===c?"#1a0e00":"#7870a0", border:`1px solid ${activeCuisine===c?"#e8a838":"#2a2a45"}`, borderRadius:20, padding:"5px 12px", fontSize:11, whiteSpace:"nowrap", cursor:"pointer", fontFamily:"monospace", fontWeight:activeCuisine===c?700:400 }}>{c}</button>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                  {TRK_CUISINES[activeCuisine].map(f=>(
                    <button key={f} onClick={()=>{setPendingFood(f);setShowModal(true);}} style={{ background:"#14141f", border:"1px solid #2a2a45", borderRadius:10, padding:"10px 12px", color:"#d8d4f0", fontSize:13, cursor:"pointer", textAlign:"left", fontFamily:"'Outfit',sans-serif" }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab==="log" && (
            <div>
              {log.length===0 ? (
                <div style={{ textAlign:"center", padding:"50px 20px", color:"#7870a0" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🥗</div>
                  <div style={{ fontFamily:"monospace", fontSize:14 }}>No foods logged yet.</div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                    <span style={{ fontSize:12, color:"#7870a0", fontFamily:"monospace" }}>{log.length} items logged</span>
                    <button onClick={()=>setLog([])} style={{ background:"transparent", border:"1px solid #f0606055", borderRadius:8, padding:"4px 12px", color:"#f06060", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>Clear All</button>
                  </div>
                  {log.map(item=>{
                    const s=item.portion/100;
                    return (
                      <div key={item.id} style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:14, padding:16, marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                          <div>
                            <div style={{ fontWeight:600, fontSize:15, color:"#f4f0ff" }}>{item.foodName}</div>
                            <div style={{ fontSize:11, color:"#7870a0", fontFamily:"monospace" }}>{item.portion}g</div>
                          </div>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:sc(item.safetyLevel), fontFamily:"monospace", background:`${sc(item.safetyLevel)}22`, padding:"3px 8px", borderRadius:10 }}>{sl(item.safetyLevel)}</span>
                            <button onClick={()=>setLog(l=>l.filter(x=>x.id!==item.id))} style={{ background:"transparent", border:"none", color:"#7870a0", cursor:"pointer", fontSize:16, padding:2 }}>×</button>
                          </div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                          {[["K",item.potassium*s,"mg",item.potassiumRisk,limits.potassium/7],["Na",item.sodium*s,"mg",item.sodiumRisk,limits.sodium/7],["P",item.phosphorus*s,"mg",item.phosphorusRisk,limits.phosphorus/7],["Pro",item.protein*s,"g",item.proteinRisk,limits.protein/7]].map(([l,v,u,r,max])=>(
                            <div key={l}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                                <span style={{ fontSize:10, color:"#7870a0", fontFamily:"monospace" }}>{l}</span>
                                <span style={{ fontSize:10, color:getRiskColor(r), fontFamily:"monospace" }}>{Math.round(v)}{u}</span>
                              </div>
                              <div style={{ background:"#1a1a30", borderRadius:3, height:4, overflow:"hidden" }}>
                                <div style={{ width:`${Math.min((v/max)*100,100)}%`, height:"100%", background:getRiskColor(r), borderRadius:3 }}/>
                              </div>
                            </div>
                          ))}
                        </div>
                        {item.tip && <div style={{ marginTop:10, fontSize:11, color:"#e8a838", fontFamily:"monospace", background:"#1e1800", borderRadius:8, padding:"7px 10px" }}>💡 {item.tip}</div>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
          {tab==="totals" && (
            <div>
              <div style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:14, padding:20, marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#7870a0", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Daily Totals vs {stage} Limits</div>
                {[["Potassium",totals.potassium,limits.potassium,"mg"],["Sodium",totals.sodium,limits.sodium,"mg"],["Phosphorus",totals.phosphorus,limits.phosphorus,"mg"],["Protein",totals.protein,limits.protein,"g"]].map(([l,cur,max,u])=>{
                  const pct=Math.min((cur/max)*100,100);
                  const over=cur>max;
                  const col=over?"#f06060":pct>75?"#f0b429":"#3ddc72";
                  return (
                    <div key={l} style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <span style={{ fontSize:12, color:"#7870a0", fontFamily:"monospace", textTransform:"uppercase" }}>{l}</span>
                        <span style={{ fontSize:12, color:col, fontFamily:"monospace", fontWeight:600 }}>{Math.round(cur)}{u} / {max}{u}{over?" ⚠ OVER":""}</span>
                      </div>
                      <div style={{ background:"#1a1a30", borderRadius:6, height:8, overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:6, transition:"width 0.8s ease" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                {[["Potassium",totals.potassium,limits.potassium,"mg"],["Sodium",totals.sodium,limits.sodium,"mg"],["Phosphorus",totals.phosphorus,limits.phosphorus,"mg"],["Protein",totals.protein,limits.protein,"g"]].map(([l,v,lim,u])=>{
                  const pct=Math.round((v/lim)*100);
                  const col=pct>100?"#f06060":pct>75?"#f0b429":"#3ddc72";
                  return <div key={l} style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:12, padding:14, textAlign:"center" }}>
                    <div style={{ fontSize:26, fontWeight:700, color:col, fontFamily:"monospace" }}>{pct}%</div>
                    <div style={{ fontSize:11, color:"#7870a0", fontFamily:"monospace" }}>{l}</div>
                    <div style={{ fontSize:10, color:"#7870a0", fontFamily:"monospace" }}>{Math.round(v)}/{lim}{u}</div>
                  </div>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000000bb", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}>
          <div style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:16, padding:24, width:"100%", maxWidth:300 }}>
            <div style={{ fontWeight:600, color:"#f4f0ff", fontSize:16, marginBottom:6 }}>{pendingFood}</div>
            <div style={{ fontSize:12, color:"#7870a0", fontFamily:"monospace", marginBottom:16 }}>How much are you eating?</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
              {[50,100,150,200,250,300].map(g=>(
                <button key={g} onClick={()=>{analyze(pendingFood,g);setShowModal(false);setPendingFood(null);}} style={{ background:"#14141f", border:"1px solid #2a2a45", borderRadius:10, padding:"11px 8px", color:"#d8d4f0", fontSize:14, cursor:"pointer", fontFamily:"monospace", fontWeight:600 }}>{g}g</button>
              ))}
            </div>
            <button onClick={()=>setShowModal(false)} style={{ width:"100%", background:"transparent", border:"1px solid #2a2a45", borderRadius:10, padding:10, color:"#7870a0", fontSize:13, cursor:"pointer", fontFamily:"monospace" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// RECIPE CONVERTER
// ══════════════════════════════════════════
function RecipeConverter({ onBack, stage }) {
  const limits = CKD_STAGES[stage];
  const [mode, setMode] = useState("name");
  const [input, setInput] = useState("");
  const [servings, setServings] = useState("4");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [accepted, setAccepted] = useState({});

  const convert = async()=>{
    if (!input.trim()) return;
    setLoading(true); setResult(null); setAccepted({});
    try {
      const data = await callClaude(`Renal dietitian for CKD ${stage} (K limit ${limits.potassium}mg, Na ${limits.sodium}mg, P ${limits.phosphorus}mg, Protein ${limits.protein}g/day). ${mode==="name"?`Dish: "${input}"`:`Recipe:\n${input}`}. Serves ${servings}. Return ONLY valid JSON:
{"dishName":"string","safetyBefore":"safe"|"caution"|"avoid","safetyAfter":"safe"|"caution"|"avoid","originalIngredients":[{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high","riskReason":"string"}],"substitutions":[{"original":"string","substitute":"string","amount":"string","reason":"string","reduction":"string"}],"cookingTips":["string"],"nutritionBefore":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"nutritionAfter":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"modifiedRecipeSummary":"string"}`,1500);
      setResult(data);
      const auto={};
      data.substitutions?.forEach((_,i)=>{auto[i]=true;});
      setAccepted(auto);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const sc=s=>({safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"}[s]||"#f0b429");
  const sl=s=>({safe:"✓ Safe",caution:"⚠ Caution",avoid:"✗ Avoid"}[s]||s);
  const acceptedCount=Object.values(accepted).filter(Boolean).length;
  const totalSubs=result?.substitutions?.length||0;

  const adjNutrition = result ? {
    potassium: result.nutritionBefore.potassium - ((result.nutritionBefore.potassium-result.nutritionAfter.potassium)*(acceptedCount/Math.max(totalSubs,1))),
    sodium: result.nutritionBefore.sodium - ((result.nutritionBefore.sodium-result.nutritionAfter.sodium)*(acceptedCount/Math.max(totalSubs,1))),
    phosphorus: result.nutritionBefore.phosphorus - ((result.nutritionBefore.phosphorus-result.nutritionAfter.phosphorus)*(acceptedCount/Math.max(totalSubs,1))),
    protein: result.nutritionBefore.protein - ((result.nutritionBefore.protein-result.nutritionAfter.protein)*(acceptedCount/Math.max(totalSubs,1))),
  } : null;

  const CONV_SAMPLES = ["Aloo Gobi","Dal Makhani","Rajma","Margherita Pizza","Bean Tacos","Pasta Primavera"];

  return (
    <div style={{ minHeight:"100vh", background:"#0f0c1a", color:"#e2d9f3", fontFamily:"'Outfit',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="Recipe Converter"/>
      <StageBanner stage={stage}/>
      <div style={{ maxWidth:620, margin:"0 auto", padding:"20px 16px" }}>
        <div style={{ background:"#1e1835", border:"1px solid #2e2850", borderRadius:16, padding:20, marginBottom:16 }}>
          <div style={{ display:"flex", background:"#16122a", borderRadius:10, padding:4, marginBottom:16, gap:4 }}>
            {[["name","🍽 Dish Name"],["paste","📋 Paste Recipe"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setMode(k)} style={{ flex:1, padding:"9px 12px", border:"none", borderRadius:8, background:mode===k?"#c084fc":"transparent", color:mode===k?"#0f0c1a":"#7c6fa0", fontSize:13, fontWeight:mode===k?700:400, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>{lbl}</button>
            ))}
          </div>
          {mode==="name" ? (
            <>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&convert()} placeholder="e.g. Aloo Gobi, Dal Tadka, Pasta Arrabiata..."
                style={{ width:"100%", background:"#16122a", border:"1px solid #2e2850", borderRadius:10, padding:"12px 16px", color:"#f8f4ff", fontSize:14, outline:"none", fontFamily:"'Outfit',sans-serif", boxSizing:"border-box", marginBottom:10 }}/>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:4 }}>
                {CONV_SAMPLES.map(r=>(
                  <button key={r} onClick={()=>setInput(r)} style={{ background:"transparent", border:"1px solid #2e2850", borderRadius:20, padding:"4px 12px", color:"#7c6fa0", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>{r}</button>
                ))}
              </div>
            </>
          ) : (
            <textarea value={input} onChange={e=>setInput(e.target.value)} rows={5} placeholder={"Paste ingredients:\n2 potatoes\n1 cup tomatoes\n1 tsp salt..."}
              style={{ width:"100%", background:"#16122a", border:"1px solid #2e2850", borderRadius:10, padding:"12px 16px", color:"#f8f4ff", fontSize:14, outline:"none", fontFamily:"monospace", resize:"vertical", boxSizing:"border-box", marginBottom:10 }}/>
          )}
          <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:11, color:"#7c6fa0", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Serves</label>
              <input value={servings} onChange={e=>setServings(e.target.value)} type="number" min="1" max="20"
                style={{ width:"100%", background:"#16122a", border:"1px solid #2e2850", borderRadius:10, padding:"10px 14px", color:"#f8f4ff", fontSize:14, outline:"none", fontFamily:"monospace" }}/>
            </div>
            <button onClick={convert} disabled={loading||!input.trim()}
              style={{ flex:3, background:loading?"#7c3aed":"#c084fc", color:"#0f0c1a", border:"none", borderRadius:10, padding:"12px 20px", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"'Outfit',sans-serif" }}>
              {loading?"Converting...":"🔄 Convert to CKD-Safe →"}
            </button>
          </div>
        </div>
        {loading && <BounceDots color="#c084fc"/>}
        {result && !loading && (
          <div style={{ animation:"ckdFade 0.4s ease" }}>
            <style>{`@keyframes ckdFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, marginBottom:14, alignItems:"center" }}>
              {["safetyBefore","","safetyAfter"].map((k,i)=> i===1 ? <div key="arr" style={{ color:"#7c6fa0", textAlign:"center", fontSize:18 }}>→</div> : (
                <div key={k} style={{ background:"#1e1835", border:`1px solid ${sc(result[k])}44`, borderRadius:12, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#7c6fa0", fontFamily:"monospace", marginBottom:4 }}>{k==="safetyBefore"?"BEFORE":"AFTER"}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:sc(result[k]) }}>{sl(result[k])}</div>
                </div>
              ))}
            </div>
            {result.originalIngredients?.length>0 && (
              <div style={{ background:"#1e1835", border:"1px solid #2e2850", borderRadius:14, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#7c6fa0", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Ingredients — Risk</div>
                {result.originalIngredients.map((ing,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<result.originalIngredients.length-1?"1px solid #2e2850":"none", gap:10 }}>
                    <div>
                      <div style={{ fontSize:14, color:"#f8f4ff" }}>{ing.amount} {ing.name}</div>
                      <div style={{ fontSize:11, color:"#7c6fa0", fontFamily:"monospace" }}>{ing.riskReason}</div>
                    </div>
                    <span style={{ fontSize:10, color:getRiskColor(ing.ckdRisk), background:`${getRiskColor(ing.ckdRisk)}22`, border:`1px solid ${getRiskColor(ing.ckdRisk)}44`, borderRadius:10, padding:"2px 8px", fontFamily:"monospace", whiteSpace:"nowrap" }}>{ing.ckdRisk}</span>
                  </div>
                ))}
              </div>
            )}
            {result.substitutions?.length>0 && (
              <div style={{ background:"#1e1835", border:"1px solid #2e2850", borderRadius:14, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"#7c6fa0", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1 }}>Smart Swaps</div>
                  <div style={{ fontSize:11, color:"#c084fc", fontFamily:"monospace" }}>{acceptedCount}/{totalSubs} on</div>
                </div>
                {result.substitutions.map((sub,i)=>(
                  <div key={i} style={{ background:accepted[i]?"#1a0f2e":"#16122a", border:`1px solid ${accepted[i]?"#7c3aed":"#2e2850"}`, borderRadius:12, padding:12, marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                          <span style={{ color:"#f06060", fontFamily:"monospace", fontSize:13, textDecoration:accepted[i]?"line-through":"none" }}>{sub.original}</span>
                          <span style={{ color:"#7c6fa0" }}>→</span>
                          <span style={{ color:"#3ddc72", fontFamily:"monospace", fontSize:13, fontWeight:600 }}>{sub.amount} {sub.substitute}</span>
                        </div>
                        <div style={{ fontSize:11, color:"#c084fc", fontFamily:"monospace", background:"#1e1040", borderRadius:6, padding:"2px 8px", display:"inline-block" }}>💜 {sub.reduction}</div>
                      </div>
                      <button onClick={()=>setAccepted(a=>({...a,[i]:!a[i]}))}
                        style={{ background:accepted[i]?"#c084fc":"transparent", border:`1px solid ${accepted[i]?"#c084fc":"#2e2850"}`, borderRadius:8, padding:"5px 10px", color:accepted[i]?"#0f0c1a":"#7c6fa0", fontSize:12, cursor:"pointer", fontFamily:"monospace", fontWeight:600, flexShrink:0 }}>
                        {accepted[i]?"✓ On":"Off"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {adjNutrition && (
              <div style={{ background:"#1e1835", border:"1px solid #2e2850", borderRadius:14, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#7c6fa0", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>Nutrition Per Serving</div>
                {[["Potassium",result.nutritionBefore.potassium,adjNutrition.potassium,"mg",limits.potassium/3],["Sodium",result.nutritionBefore.sodium,adjNutrition.sodium,"mg",limits.sodium/3],["Phosphorus",result.nutritionBefore.phosphorus,adjNutrition.phosphorus,"mg",limits.phosphorus/3],["Protein",result.nutritionBefore.protein,adjNutrition.protein,"g",limits.protein/3]].map(([l,bef,aft,u,lim])=>{
                  const col=aft>lim?"#f06060":((aft/lim)>0.75)?"#f0b429":"#3ddc72";
                  return (
                    <div key={l} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, color:"#7c6fa0", fontFamily:"monospace", textTransform:"uppercase" }}>{l}</span>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:"#7c6fa0", fontFamily:"monospace", textDecoration:"line-through" }}>{Math.round(bef)}{u}</span>
                          <span style={{ fontSize:12, color:col, fontFamily:"monospace", fontWeight:700 }}>{Math.round(aft)}{u}</span>
                        </div>
                      </div>
                      <div style={{ background:"#1a1530", borderRadius:6, height:7, overflow:"hidden" }}>
                        <div style={{ width:`${Math.min((aft/lim)*100,100)}%`, height:"100%", background:col, borderRadius:6 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {result.cookingTips?.map((t,i)=>(
              <div key={i} style={{ background:"#140e28", border:"1px solid #7c3aed", borderRadius:10, padding:12, marginBottom:8, fontSize:13, color:"#e2d9f3", lineHeight:1.6 }}>→ {t}</div>
            ))}
            <div style={{ background:"#0d1a12", border:"1px solid #2a4a30", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:"#3ddc72", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>✓ CKD-Safe Version</div>
              <p style={{ margin:0, fontSize:14, color:"#e2d9f3", lineHeight:1.7 }}>{result.modifiedRecipeSummary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// RECIPE LIBRARY
// ══════════════════════════════════════════
const LIB_CUISINES = ["All","🇮🇳 Indian","🇮🇹 Italian","🇲🇽 Mexican","🇨🇳 Chinese","🌍 Other"];
const LIB_SAFETY = { safe:{color:"#3ddc72",bg:"#0d2d1a",label:"✓ Safe"}, caution:{color:"#f0b429",bg:"#2d2010",label:"⚠ Caution"}, avoid:{color:"#f06060",bg:"#2d1010",label:"✗ Avoid"} };

const LIB_RECIPES = [
  {id:1,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Khichdi",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Khichdi is one of the best CKD-friendly Indian meals — easy on the kidneys with low potassium and moderate protein. Use less dal and more rice to further reduce protein if needed.",topTip:"Use a 3:1 rice-to-dal ratio and rinse both thoroughly to reduce phosphorus. Avoid adding too much salt.",ingredients:[{name:"White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Moong Dal",amount:"0.5 cup",ckdRisk:"low"},{name:"Ghee",amount:"1 tbsp",ckdRisk:"low"},{name:"Turmeric",amount:"0.5 tsp",ckdRisk:"low"},{name:"Ginger",amount:"1 tsp",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:180,sodium:120,phosphorus:110,protein:7},nutritionAfterSwaps:{potassium:180,sodium:120,phosphorus:110,protein:7}},
  {id:2,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Aloo Gobi (CKD-Safe)",servings:4,safetyLevel:"caution",photo:null,dietitianNote:"Traditional Aloo Gobi has high potassium from potatoes. By leaching potatoes and reducing portion size, it becomes manageable. Cauliflower is a great kidney-friendly vegetable.",topTip:"Peel, dice and boil potatoes in large water twice (discard water both times) to remove up to 50% of potassium before cooking.",ingredients:[{name:"Potatoes (leached)",amount:"1 medium",ckdRisk:"medium"},{name:"Cauliflower",amount:"2 cups",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Tomato",amount:"0.5 small",ckdRisk:"medium"},{name:"Oil",amount:"1 tbsp",ckdRisk:"low"}],substitutions:[{original:"Regular potatoes",substitute:"Leached potatoes or turnip",reduction:"Reduces potassium by ~50%"},{original:"Tomato",substitute:"Red bell pepper (small)",reduction:"Reduces potassium by ~30%"}],nutritionPerServing:{potassium:340,sodium:140,phosphorus:90,protein:4},nutritionAfterSwaps:{potassium:220,sodium:140,phosphorus:80,protein:4}},
  {id:3,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Poha",servings:2,safetyLevel:"safe",photo:null,dietitianNote:"Poha is an excellent CKD breakfast — low in potassium, phosphorus and protein. It is light, easy to digest and filling.",topTip:"Rinse poha well before cooking. Limit peanuts to a small garnish only — they are high in phosphorus.",ingredients:[{name:"Flattened Rice (Poha)",amount:"1.5 cups",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Green chili",amount:"1 small",ckdRisk:"low"},{name:"Mustard seeds",amount:"0.5 tsp",ckdRisk:"low"},{name:"Peanuts",amount:"1 tbsp",ckdRisk:"medium"}],substitutions:[{original:"Peanuts (large amount)",substitute:"Skip or use 1 tsp only",reduction:"Significantly reduces phosphorus"}],nutritionPerServing:{potassium:150,sodium:100,phosphorus:85,protein:4},nutritionAfterSwaps:{potassium:150,sodium:100,phosphorus:70,protein:3}},
  {id:4,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Upma",servings:3,safetyLevel:"safe",photo:null,dietitianNote:"Semolina-based upma is kidney-friendly when made with low-potassium vegetables. It is filling and a great breakfast for CKD patients.",topTip:"Add only kidney-safe vegetables like cabbage, carrots and green peas (small amount). Avoid adding tomatoes or potatoes.",ingredients:[{name:"Semolina (Rava)",amount:"1 cup",ckdRisk:"low"},{name:"Cabbage",amount:"0.5 cup",ckdRisk:"low"},{name:"Carrot",amount:"0.25 cup",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Oil",amount:"1 tbsp",ckdRisk:"low"}],substitutions:[{original:"Tomatoes",substitute:"Skip entirely",reduction:"Reduces potassium significantly"}],nutritionPerServing:{potassium:190,sodium:130,phosphorus:95,protein:5},nutritionAfterSwaps:{potassium:190,sodium:130,phosphorus:95,protein:5}},
  {id:5,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"CKD Pulav (No Potato, No Tomato)",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"This kidney-safe pulav skips high-potassium potatoes and tomatoes entirely. Cabbage, small carrot portions, cauliflower florets and aromatic spices create a flavorful one-pot rice dish very gentle on the kidneys.",topTip:"Rinse basmati rice 2-3 times before cooking to reduce starch. Use only a small portion of carrot (2-3 thin slices per serving). Mint adds wonderful aroma without any kidney risk.",ingredients:[{name:"Basmati White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Cabbage (shredded)",amount:"0.75 cup",ckdRisk:"low"},{name:"Carrot (small portion)",amount:"0.25 cup sliced thin",ckdRisk:"low"},{name:"Cauliflower florets",amount:"0.5 cup",ckdRisk:"low"},{name:"Onion",amount:"1 medium sliced",ckdRisk:"low"},{name:"Garlic",amount:"3 cloves minced",ckdRisk:"low"},{name:"Ginger",amount:"1 tsp grated",ckdRisk:"low"},{name:"Green chillies",amount:"1-2 slit",ckdRisk:"low"},{name:"Fresh mint leaves",amount:"2 tbsp",ckdRisk:"low"},{name:"Turmeric",amount:"0.5 tsp",ckdRisk:"low"},{name:"Jeera (cumin seeds)",amount:"1 tsp",ckdRisk:"low"},{name:"Coriander powder",amount:"1 tsp",ckdRisk:"low"},{name:"Chilli powder",amount:"0.5 tsp",ckdRisk:"low"},{name:"Oil or Ghee",amount:"1.5 tbsp",ckdRisk:"low"}],substitutions:[{original:"Potatoes",substitute:"Cauliflower florets",reduction:"Eliminates high-potassium ingredient entirely"},{original:"Tomatoes",substitute:"Mint + spices for depth",reduction:"Removes potassium and acidity risk completely"}],nutritionPerServing:{potassium:280,sodium:90,phosphorus:100,protein:5},nutritionAfterSwaps:{potassium:185,sodium:90,phosphorus:95,protein:5}},
  {id:6,savedAt:"Default",cuisine:"🇮🇹 Italian",dishName:"Pasta Aglio e Olio",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"This simple garlic and olive oil pasta is one of the most kidney-friendly Italian dishes — no tomato sauce, low potassium, easy to portion control.",topTip:"Use white pasta (not whole wheat) to keep phosphorus lower. Go easy on garlic if you have high potassium levels.",ingredients:[{name:"White Pasta",amount:"200g",ckdRisk:"low"},{name:"Olive Oil",amount:"3 tbsp",ckdRisk:"low"},{name:"Garlic",amount:"3 cloves",ckdRisk:"low"},{name:"Parsley",amount:"2 tbsp",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:130,sodium:80,phosphorus:90,protein:7},nutritionAfterSwaps:{potassium:130,sodium:80,phosphorus:90,protein:7}},
  {id:7,savedAt:"Default",cuisine:"🇮🇹 Italian",dishName:"Margherita Pizza (Modified)",servings:4,safetyLevel:"caution",photo:null,dietitianNote:"Pizza crust is fine for CKD but tomato sauce and cheese add potassium, sodium and phosphorus. Reduce cheese and use a thin spread of sauce.",topTip:"Use a thin crust, 2 tbsp of tomato sauce max, and only 1 oz of fresh mozzarella per slice. Add roasted bell peppers and zucchini.",ingredients:[{name:"Pizza dough (white flour)",amount:"1 base",ckdRisk:"low"},{name:"Tomato sauce",amount:"3 tbsp",ckdRisk:"medium"},{name:"Mozzarella cheese",amount:"50g",ckdRisk:"medium"},{name:"Fresh basil",amount:"few leaves",ckdRisk:"low"}],substitutions:[{original:"Heavy tomato sauce",substitute:"Thin spread (2 tbsp max)",reduction:"Reduces potassium by ~40%"},{original:"Large amount mozzarella",substitute:"Fresh mozzarella (small)",reduction:"Reduces sodium & phosphorus by ~35%"}],nutritionPerServing:{potassium:290,sodium:420,phosphorus:180,protein:10},nutritionAfterSwaps:{potassium:200,sodium:280,phosphorus:130,protein:8}},
  {id:8,savedAt:"Default",cuisine:"🇮🇹 Italian",dishName:"Zucchini Risotto",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Risotto made with white arborio rice and low-potassium zucchini is an excellent CKD-safe Italian meal. Avoid adding parmesan in large quantities.",topTip:"Use low-sodium vegetable broth or plain water. Add only 1 tbsp of parmesan as garnish — it is very high in phosphorus and sodium.",ingredients:[{name:"Arborio Rice",amount:"1 cup",ckdRisk:"low"},{name:"Zucchini",amount:"1 cup",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Olive oil",amount:"1 tbsp",ckdRisk:"low"},{name:"Parmesan",amount:"1 tbsp only",ckdRisk:"medium"}],substitutions:[{original:"Regular broth",substitute:"Low-sodium broth or water",reduction:"Reduces sodium by ~50%"}],nutritionPerServing:{potassium:210,sodium:180,phosphorus:110,protein:6},nutritionAfterSwaps:{potassium:210,sodium:120,phosphorus:95,protein:6}},
  {id:9,savedAt:"Default",cuisine:"🇲🇽 Mexican",dishName:"Cauliflower Tacos",servings:3,safetyLevel:"safe",photo:null,dietitianNote:"Cauliflower tacos are an excellent CKD-friendly alternative to bean tacos. Cauliflower is low in potassium and phosphorus.",topTip:"Roast cauliflower with cumin, paprika and a drizzle of oil. Serve in corn tortillas with shredded cabbage and a squeeze of lime.",ingredients:[{name:"Cauliflower",amount:"2 cups",ckdRisk:"low"},{name:"Corn tortillas",amount:"6 small",ckdRisk:"low"},{name:"Cabbage (shredded)",amount:"0.5 cup",ckdRisk:"low"},{name:"Lime juice",amount:"1 tbsp",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:200,sodium:90,phosphorus:80,protein:4},nutritionAfterSwaps:{potassium:200,sodium:90,phosphorus:80,protein:4}},
  {id:10,savedAt:"Default",cuisine:"🇲🇽 Mexican",dishName:"Veggie Quesadilla",servings:2,safetyLevel:"safe",photo:null,dietitianNote:"A simple cheese quesadilla with low-potassium vegetables is a great CKD-friendly Mexican option. Avoid beans and large amounts of salsa.",topTip:"Fill with bell peppers, zucchini and a small amount of cheese. Skip sour cream or use just 1 tsp. Avoid black beans.",ingredients:[{name:"White flour tortilla",amount:"2 large",ckdRisk:"low"},{name:"Mozzarella",amount:"40g",ckdRisk:"medium"},{name:"Bell pepper",amount:"0.5 cup",ckdRisk:"low"},{name:"Zucchini",amount:"0.5 cup",ckdRisk:"low"}],substitutions:[{original:"Black beans",substitute:"Skip or use only 2 tbsp",reduction:"Major reduction in potassium & phosphorus"}],nutritionPerServing:{potassium:220,sodium:260,phosphorus:140,protein:9},nutritionAfterSwaps:{potassium:220,sodium:260,phosphorus:140,protein:9}},
  {id:11,savedAt:"Default",cuisine:"🇨🇳 Chinese",dishName:"Steamed Rice with Bok Choy",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Plain steamed white rice with lightly stir-fried bok choy is one of the safest CKD meals. Low in all four nutrients of concern.",topTip:"Blanch bok choy briefly and discard water to further reduce potassium. Season lightly with a few drops of low-sodium soy sauce only.",ingredients:[{name:"White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Bok Choy",amount:"2 cups",ckdRisk:"low"},{name:"Garlic",amount:"1 clove",ckdRisk:"low"},{name:"Low-sodium soy sauce",amount:"1 tsp",ckdRisk:"medium"}],substitutions:[{original:"Regular soy sauce",substitute:"Low-sodium soy sauce (1 tsp max)",reduction:"Reduces sodium by ~50%"}],nutritionPerServing:{potassium:170,sodium:160,phosphorus:85,protein:5},nutritionAfterSwaps:{potassium:170,sodium:110,phosphorus:85,protein:5}},
  {id:12,savedAt:"Default",cuisine:"🇨🇳 Chinese",dishName:"Congee (Rice Porridge)",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Congee is one of the most kidney-friendly Chinese foods. The high water content dilutes nutrients and it is extremely gentle on the digestive system.",topTip:"Cook 1 part rice to 8 parts water for a silky congee. Season with a small piece of ginger and a few drops of sesame oil. Avoid salty toppings.",ingredients:[{name:"White Rice",amount:"0.5 cup",ckdRisk:"low"},{name:"Water",amount:"4 cups",ckdRisk:"low"},{name:"Ginger",amount:"1 slice",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:60,sodium:15,phosphorus:30,protein:2},nutritionAfterSwaps:{potassium:60,sodium:15,phosphorus:30,protein:2}},
  {id:13,savedAt:"Default",cuisine:"🌍 Other",dishName:"Greek Salad (Modified)",servings:2,safetyLevel:"caution",photo:null,dietitianNote:"Traditional Greek salad has tomatoes and olives which are high in potassium and sodium. A modified version with cucumber and minimal feta is much more CKD-friendly.",topTip:"Rinse olives thoroughly to remove excess sodium. Use only 3-4 olives per serving and limit feta to 15g.",ingredients:[{name:"Cucumber",amount:"1 cup",ckdRisk:"low"},{name:"Lettuce",amount:"1 cup",ckdRisk:"low"},{name:"Feta cheese",amount:"15g",ckdRisk:"medium"},{name:"Olives (rinsed)",amount:"4 pieces",ckdRisk:"medium"},{name:"Cherry tomatoes",amount:"3 small",ckdRisk:"medium"}],substitutions:[{original:"Large tomatoes",substitute:"3 cherry tomatoes only",reduction:"Reduces potassium by ~60%"}],nutritionPerServing:{potassium:250,sodium:310,phosphorus:110,protein:5},nutritionAfterSwaps:{potassium:180,sodium:220,phosphorus:85,protein:4}},
  {id:14,savedAt:"Default",cuisine:"🌍 Other",dishName:"Veggie Sushi Rolls",servings:3,safetyLevel:"safe",photo:null,dietitianNote:"Vegetarian sushi rolls with cucumber and avocado are reasonably kidney-friendly. Avocado is moderate in potassium so limit to 2-3 slices.",topTip:"Always use low-sodium soy sauce and limit to 1 tsp dipping. Avoid rolls with cream cheese which adds phosphorus.",ingredients:[{name:"Sushi Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Nori sheets",amount:"4",ckdRisk:"low"},{name:"Cucumber",amount:"0.5 cup",ckdRisk:"low"},{name:"Avocado",amount:"0.25 small",ckdRisk:"medium"}],substitutions:[{original:"Regular soy sauce",substitute:"Low-sodium soy sauce (1 tsp only)",reduction:"Reduces sodium by ~50%"}],nutritionPerServing:{potassium:220,sodium:180,phosphorus:80,protein:4},nutritionAfterSwaps:{potassium:180,sodium:120,phosphorus:80,protein:4}},
];

function RecipeLibrary({ onBack }) {
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState(LIB_RECIPES);
  const [selected, setSelected] = useState(null);
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [safetyFilter, setSafetyFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newDish, setNewDish] = useState("");
  const [newCuisine, setNewCuisine] = useState("🇮🇳 Indian");
  const fileRef = useRef();
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhoto = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result.split(",")[1]); setPhotoPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const addRecipe = async () => {
    if (!newDish.trim()) return;
    setLoading(true);
    const msgs = photo
      ? [{ role:"user", content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:photo}},{type:"text",text:`Renal dietitian. Dish: "${newDish}", cuisine: ${newCuisine}. Return ONLY JSON: {"dishName":"string","safetyLevel":"safe"|"caution"|"avoid","ingredients":[{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high"}],"substitutions":[{"original":"string","substitute":"string","reduction":"string"}],"nutritionPerServing":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"nutritionAfterSwaps":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"dietitianNote":"string","topTip":"string"}`}]}]
      : [{ role:"user", content:`Renal dietitian. Dish: "${newDish}", cuisine: ${newCuisine}. Return ONLY JSON: {"dishName":"string","safetyLevel":"safe"|"caution"|"avoid","ingredients":[{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high"}],"substitutions":[{"original":"string","substitute":"string","reduction":"string"}],"nutritionPerServing":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"nutritionAfterSwaps":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"dietitianNote":"string","topTip":"string"}` }];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({model:API_MODEL,max_tokens:1200,messages:msgs}) });
      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("")||"";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      const entry = {...parsed, id:Date.now(), savedAt:new Date().toLocaleDateString(), cuisine:newCuisine, servings:4, photo:photoPreview||null};
      setRecipes(r=>[entry,...r]);
      setSelected(entry);
      setAddMode(false); setNewDish(""); setPhoto(null); setPhotoPreview(null);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const filtered = recipes.filter(r=>{
    const ms=r.dishName?.toLowerCase().includes(search.toLowerCase());
    const mc=cuisineFilter==="All"||r.cuisine===cuisineFilter;
    const msf=safetyFilter==="All"||r.safetyLevel===safetyFilter;
    return ms&&mc&&msf;
  });

  if (selected) return (
    <div style={{ minHeight:"100vh", background:"#0a0f0d", color:"#cce8d4", fontFamily:"'Outfit',sans-serif", paddingBottom:60 }}>
      <TopBar onBack={()=>setSelected(null)} title={selected.dishName}/>
      <div style={{ maxWidth:600, margin:"0 auto", padding:"16px" }}>
        {selected.photo && <div style={{ borderRadius:14, overflow:"hidden", marginBottom:14, maxHeight:220 }}><img src={selected.photo} alt={selected.dishName} style={{ width:"100%", height:220, objectFit:"cover" }}/></div>}
        <div style={{ background:"#162019", border:`1px solid ${LIB_SAFETY[selected.safetyLevel]?.color||"#3ddc72"}44`, borderRadius:14, padding:18, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#edfaf2" }}>{selected.dishName}</div>
              <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace" }}>{selected.cuisine} · Serves {selected.servings} · {selected.savedAt}</div>
            </div>
            <span style={{ fontSize:11, color:LIB_SAFETY[selected.safetyLevel]?.color, background:LIB_SAFETY[selected.safetyLevel]?.bg, border:`1px solid ${LIB_SAFETY[selected.safetyLevel]?.color}44`, borderRadius:10, padding:"4px 12px", fontFamily:"monospace", fontWeight:700 }}>{LIB_SAFETY[selected.safetyLevel]?.label}</span>
          </div>
          <p style={{ margin:"0 0 14px", fontSize:13, color:"#cce8d4", lineHeight:1.7, background:"#0d1a10", borderRadius:10, padding:12 }}>{selected.dietitianNote}</p>
          {[["Potassium",selected.nutritionAfterSwaps?.potassium||selected.nutritionPerServing?.potassium,667,"mg"],["Sodium",selected.nutritionAfterSwaps?.sodium||selected.nutritionPerServing?.sodium,500,"mg"],["Phosphorus",selected.nutritionAfterSwaps?.phosphorus||selected.nutritionPerServing?.phosphorus,267,"mg"],["Protein",selected.nutritionAfterSwaps?.protein||selected.nutritionPerServing?.protein,17,"g"]].map(([l,v,max,u])=>{
            const pct=Math.min((v/max)*100,100);
            const col=v>max?"#f06060":pct>75?"#f0b429":"#3ddc72";
            return <div key={l} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, color:"#527860", fontFamily:"monospace", textTransform:"uppercase" }}>{l}</span>
                <span style={{ fontSize:12, color:col, fontFamily:"monospace", fontWeight:700 }}>{Math.round(v)}{u}</span>
              </div>
              <div style={{ background:"#0d1a10", borderRadius:6, height:6, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:6 }}/></div>
            </div>;
          })}
        </div>
        {selected.ingredients?.length>0 && (
          <div style={{ background:"#162019", border:"1px solid #243528", borderRadius:14, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Ingredients</div>
            {selected.ingredients.map((ing,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<selected.ingredients.length-1?"1px solid #243528":"none" }}>
                <span style={{ fontSize:14, color:"#cce8d4" }}>{ing.amount} {ing.name}</span>
                <div style={{ width:8, height:8, borderRadius:"50%", background:getRiskColor(ing.ckdRisk) }}/>
              </div>
            ))}
          </div>
        )}
        {selected.substitutions?.length>0 && (
          <div style={{ background:"#162019", border:"1px solid #243528", borderRadius:14, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>CKD-Safe Swaps</div>
            {selected.substitutions.map((sub,i)=>(
              <div key={i} style={{ background:"#0d1a10", borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ color:"#f06060", fontFamily:"monospace", fontSize:13, textDecoration:"line-through" }}>{sub.original}</span>
                  <span style={{ color:"#527860" }}>→</span>
                  <span style={{ color:"#3ddc72", fontFamily:"monospace", fontSize:13, fontWeight:600 }}>{sub.substitute}</span>
                </div>
                <div style={{ fontSize:11, color:"#f0b429", fontFamily:"monospace" }}>💜 {sub.reduction}</div>
              </div>
            ))}
          </div>
        )}
        {selected.topTip && <div style={{ background:"#0d1a10", border:"1px solid #1a6e38", borderRadius:12, padding:14, marginBottom:14, display:"flex", gap:10 }}><span>💡</span><p style={{ margin:0, fontSize:13, color:"#cce8d4", lineHeight:1.6 }}>{selected.topTip}</p></div>}
        <button onClick={()=>setRecipes(r=>r.filter(x=>x.id!==selected.id))||setSelected(null)} style={{ width:"100%", background:"transparent", border:"1px solid #f0606055", borderRadius:12, padding:12, color:"#f06060", fontSize:14, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>🗑 Delete from Library</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0a0f0d", color:"#cce8d4", fontFamily:"'Outfit',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title={`Recipe Library (${recipes.length})`}/>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"16px" }}>
        {!addMode ? (
          <>
            <button onClick={()=>setAddMode(true)} style={{ width:"100%", background:"#3ddc72", color:"#061008", border:"none", borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif", marginBottom:14 }}>+ Add New Recipe</button>
            <div style={{ background:"#162019", border:"1px solid #243528", borderRadius:14, padding:14, marginBottom:16 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search recipes..."
                style={{ width:"100%", background:"#0d1a10", border:"1px solid #243528", borderRadius:10, padding:"10px 14px", color:"#edfaf2", fontSize:14, outline:"none", fontFamily:"'Outfit',sans-serif", boxSizing:"border-box", marginBottom:10 }}/>
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:8 }}>
                {LIB_CUISINES.map(c=>(
                  <button key={c} onClick={()=>setCuisineFilter(c)} style={{ background:cuisineFilter===c?"#3ddc72":"transparent", color:cuisineFilter===c?"#061008":"#527860", border:`1px solid ${cuisineFilter===c?"#3ddc72":"#243528"}`, borderRadius:20, padding:"4px 12px", fontSize:11, whiteSpace:"nowrap", cursor:"pointer", fontFamily:"monospace", fontWeight:cuisineFilter===c?700:400 }}>{c}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {["All","safe","caution","avoid"].map(s=>{
                  const sm=LIB_SAFETY[s];
                  return <button key={s} onClick={()=>setSafetyFilter(s)} style={{ background:safetyFilter===s?(sm?.bg||"#0d2015"):"transparent", color:safetyFilter===s?(sm?.color||"#3ddc72"):"#527860", border:`1px solid ${safetyFilter===s?(sm?.color||"#3ddc72"):"#243528"}`, borderRadius:20, padding:"4px 12px", fontSize:11, cursor:"pointer", fontFamily:"monospace", textTransform:"capitalize" }}>{s==="All"?"All Safety":sm?.label}</button>;
                })}
              </div>
            </div>
            {filtered.length===0 ? (
              <div style={{ textAlign:"center", padding:"50px 20px", color:"#527860" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🌿</div>
                <div style={{ fontFamily:"monospace", fontSize:14 }}>No recipes match your filters.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
                {filtered.map(r=>{
                  const sm=LIB_SAFETY[r.safetyLevel];
                  return (
                    <div key={r.id} onClick={()=>setSelected(r)} style={{ background:"#162019", border:"1px solid #243528", borderRadius:14, overflow:"hidden", cursor:"pointer" }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#3ddc7266";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#243528";}}>
                      <div style={{ height:120, background:r.photo?"transparent":"linear-gradient(135deg,#1a3020,#0a1a10)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
                        {r.photo?<img src={r.photo} alt={r.dishName} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ fontSize:40, opacity:0.4 }}>🍽</div>}
                        <div style={{ position:"absolute", top:8, right:8 }}><span style={{ fontSize:10, color:sm?.color, background:sm?.bg, border:`1px solid ${sm?.color}44`, borderRadius:10, padding:"2px 8px", fontFamily:"monospace" }}>{sm?.label}</span></div>
                      </div>
                      <div style={{ padding:12 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:"#edfaf2", marginBottom:4, lineHeight:1.3 }}>{r.dishName}</div>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontSize:11, color:"#527860", fontFamily:"monospace" }}>{r.cuisine}</span>
                          <span style={{ fontSize:10, color:"#527860", fontFamily:"monospace" }}>{r.savedAt}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ background:"#162019", border:"1px solid #243528", borderRadius:16, padding:20 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#edfaf2", marginBottom:16 }}>Add New Recipe</div>
            <input value={newDish} onChange={e=>setNewDish(e.target.value)} placeholder="Dish name e.g. Aloo Gobi, Pasta..."
              style={{ width:"100%", background:"#0d1a10", border:"1px solid #243528", borderRadius:10, padding:"12px 14px", color:"#edfaf2", fontSize:14, outline:"none", fontFamily:"'Outfit',sans-serif", boxSizing:"border-box", marginBottom:12 }}/>
            <select value={newCuisine} onChange={e=>setNewCuisine(e.target.value)} style={{ width:"100%", background:"#0d1a10", border:"1px solid #243528", borderRadius:10, padding:"10px 14px", color:"#edfaf2", fontSize:14, outline:"none", fontFamily:"'Outfit',sans-serif", marginBottom:12 }}>
              {LIB_CUISINES.filter(c=>c!=="All").map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <div onClick={()=>fileRef.current?.click()} style={{ border:"2px dashed #243528", borderRadius:12, padding:20, textAlign:"center", cursor:"pointer", background:"#0d1a10", marginBottom:14 }}>
              {photoPreview?<img src={photoPreview} alt="preview" style={{ maxHeight:140, borderRadius:8, objectFit:"cover", width:"100%" }}/>:<div><div style={{ fontSize:28, marginBottom:6 }}>📷</div><div style={{ fontSize:13, color:"#527860" }}>Tap to add a photo (optional)</div></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setAddMode(false)} style={{ flex:1, background:"transparent", border:"1px solid #243528", borderRadius:10, padding:"12px", color:"#527860", fontSize:14, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>Cancel</button>
              <button onClick={addRecipe} disabled={loading||!newDish.trim()} style={{ flex:2, background:loading?"#1a6e38":"#3ddc72", color:"#061008", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>{loading?"Analyzing...":"✓ Analyze & Save"}</button>
            </div>
            {loading && <BounceDots color="#3ddc72"/>}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════
const HOME_FEATURES = [
  {id:"checker",icon:"🔍",title:"Food Safety\nChecker",desc:"Is this food safe for my kidneys? Instant analysis.",color:"#3ddc72",glow:"#3ddc7230",tag:"Quick Check"},
  {id:"tracker",icon:"📋",title:"Daily Food\nTracker",desc:"Log meals and track K, Na, P & protein daily.",color:"#40c8f0",glow:"#40c8f030",tag:"Track Today"},
  {id:"converter",icon:"🔄",title:"Recipe\nConverter",desc:"Paste any recipe and get CKD-safe swaps.",color:"#a080f0",glow:"#a080f030",tag:"Modify Recipe"},
  {id:"library",icon:"📚",title:"Recipe\nLibrary",desc:"Browse your personal kidney-safe recipe collection.",color:"#f0c040",glow:"#f0c04030",tag:"14 Recipes"},
  {id:"planner",icon:"🗓",title:"Meal\nPlanner",desc:"Generate a full week of CKD-safe meal plans.",color:"#f06080",glow:"#f0608030",tag:"Coming Soon",soon:true},
  {id:"labs",icon:"🧪",title:"Lab\nTracker",desc:"Log bloodwork and track how diet affects results.",color:"#60e8c0",glow:"#60e8c030",tag:"Coming Soon",soon:true},
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

function HomeScreen({ onNavigate }) {
  const [tipIdx, setTipIdx] = useState(0);
  const [stage, setStage] = useState("Stage 3");

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % HOME_TIPS.length), 20000);
    return () => clearInterval(t);
  }, []);

  const limits = CKD_STAGES[stage];

  return (
    <div style={{ minHeight:"100vh", background:"#07100a", color:"#c8e8d0", fontFamily:"'Outfit',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`@keyframes ckdFadeIn{from{opacity:0}to{opacity:1}} @keyframes ckdCardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes ckdTip{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background:"radial-gradient(ellipse at 50% 0%,#1a3d22 0%,#07100a 70%)", borderBottom:"1px solid #1e3324", padding:"36px 20px 24px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#0d2015", border:"1px solid #1a6e38", borderRadius:20, padding:"5px 16px", marginBottom:16 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#3ddc72", boxShadow:"0 0 8px #3ddc72" }}/>
          <span style={{ fontSize:11, color:"#3ddc72", fontFamily:"monospace", letterSpacing:2, textTransform:"uppercase" }}>CKD · Vegetarian · Nutrition</span>
        </div>
        <h1 style={{ margin:"0 0 8px", fontSize:"clamp(32px,8vw,52px)", fontWeight:900, color:"#edfaf2", lineHeight:1.1, letterSpacing:-1 }}>
          Kidney<span style={{ color:"#3ddc72" }}>Care</span>
        </h1>
        <p style={{ color:"#527860", fontSize:14, margin:"0 0 20px", maxWidth:340, marginInline:"auto", lineHeight:1.6 }}>
          Your personal guide to eating well with CKD
        </p>
        <div key={tipIdx} style={{ background:"#0d2015", border:"1px solid #1e3324", borderRadius:12, padding:"10px 16px", maxWidth:420, marginInline:"auto", animation:"ckdTip 0.4s ease" }}>
          <span style={{ fontSize:12, color:"#c8e8d0", lineHeight:1.6, fontFamily:"monospace" }}>{HOME_TIPS[tipIdx]}</span>
        </div>
      </div>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"20px 16px" }}>

        {/* CKD Stage Selector */}
        <div style={{ background:"#112115", border:"1px solid #1e3324", borderRadius:14, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>My CKD Stage</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.keys(CKD_STAGES).map(s=>{
              const st=CKD_STAGES[s];
              const active=stage===s;
              return (
                <button key={s} onClick={()=>setStage(s)}
                  style={{ background:active?st.color:"transparent", color:active?"#061008":st.color, border:`2px solid ${st.color}`, borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:active?800:500, cursor:"pointer", fontFamily:"monospace", transition:"all 0.2s" }}>
                  {s}
                </button>
              );
            })}
          </div>
          {limits && (
            <div style={{ marginTop:12, background:"#0d1a10", borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:11, color:limits.color, fontFamily:"monospace", fontWeight:700, marginBottom:6 }}>{limits.label} · GFR {limits.gfr}</div>
              <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace", marginBottom:4 }}>{limits.note}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginTop:8 }}>
                {[["K",limits.potassium,"mg"],["Na",limits.sodium,"mg"],["P",limits.phosphorus,"mg"],["Pro",limits.protein,"g"]].map(([l,v,u])=>(
                  <div key={l} style={{ textAlign:"center", background:"#162019", borderRadius:8, padding:"6px 4px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:limits.color, fontFamily:"monospace" }}>{v}{u}</div>
                    <div style={{ fontSize:9, color:"#527860", fontFamily:"monospace", textTransform:"uppercase" }}>{l}/day</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div style={{ fontSize:11, color:"#527860", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Tools & Features</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
          {HOME_FEATURES.map((f,i)=>(
            <div key={f.id} onClick={()=>!f.soon&&onNavigate({screen:f.id,stage})}
              style={{ background:"#112115", border:"1px solid #1e3324", borderRadius:18, padding:"18px 16px", cursor:f.soon?"default":"pointer", opacity:f.soon?0.55:1, transition:"all 0.2s", animation:`ckdCardIn 0.5s ${i*0.07}s both ease-out` }}
              onMouseEnter={e=>{if(!f.soon){e.currentTarget.style.background="#172d1c";e.currentTarget.style.borderColor=f.color+"66";e.currentTarget.style.boxShadow=`0 0 20px ${f.glow}`;}}}
              onMouseLeave={e=>{e.currentTarget.style.background="#112115";e.currentTarget.style.borderColor="#1e3324";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <span style={{ fontSize:26 }}>{f.icon}</span>
                <span style={{ fontSize:10, fontFamily:"monospace", letterSpacing:1, color:f.soon?"#527860":f.color, background:f.soon?"transparent":`${f.color}18`, border:`1px solid ${f.soon?"#1e3324":f.color+"44"}`, borderRadius:10, padding:"3px 8px", textTransform:"uppercase" }}>{f.tag}</span>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:f.soon?"#527860":"#edfaf2", lineHeight:1.3, marginBottom:6, whiteSpace:"pre-line", fontFamily:"'Outfit',sans-serif" }}>{f.title}</div>
              <div style={{ fontSize:12, color:"#527860", lineHeight:1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:28, textAlign:"center", fontSize:11, color:"#527860", fontFamily:"monospace", lineHeight:1.8 }}>
          🌿 Always consult your renal dietitian before making dietary changes.<br/>
          <span style={{ color:"#1a6e38" }}>KidneyCare v1.0 · Built for CKD Warriors</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");
  const [stage, setStage] = useState("Stage 3");

  const navigate = ({ screen: s, stage: st }) => {
    if (st) setStage(st);
    setScreen(s);
  };

  return (
    <div>
      {screen === "home"      && <HomeScreen onNavigate={navigate} />}
      {screen === "checker"   && <FoodChecker   onBack={() => setScreen("home")} stage={stage} />}
      {screen === "tracker"   && <FoodTracker   onBack={() => setScreen("home")} stage={stage} />}
      {screen === "converter" && <RecipeConverter onBack={() => setScreen("home")} stage={stage} />}
      {screen === "library"   && <RecipeLibrary  onBack={() => setScreen("home")} />}
      {screen === "planner"   && (
        <div style={{ minHeight:"100vh", background:"#07100a", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:48 }}>🗓</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#edfaf2", fontFamily:"'Outfit',sans-serif" }}>Meal Planner — Coming Soon</div>
          <p style={{ fontSize:14, color:"#527860", maxWidth:300, lineHeight:1.7 }}>Generate a full week of CKD-safe vegetarian meal plans across all cuisines!</p>
          <button onClick={() => setScreen("home")} style={{ background:"#3ddc72", color:"#061008", border:"none", borderRadius:12, padding:"12px 28px", fontSize:14, fontWeight:700, cursor:"pointer" }}>← Back to Home</button>
        </div>
      )}
      {screen === "labs"      && (
        <div style={{ minHeight:"100vh", background:"#07100a", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:48 }}>🧪</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#edfaf2", fontFamily:"'Outfit',sans-serif" }}>Lab Tracker — Coming Soon</div>
          <p style={{ fontSize:14, color:"#527860", maxWidth:300, lineHeight:1.7 }}>Log your monthly bloodwork and visualize how your diet choices affect your results over time.</p>
          <button onClick={() => setScreen("home")} style={{ background:"#3ddc72", color:"#061008", border:"none", borderRadius:12, padding:"12px 28px", fontSize:14, fontWeight:700, cursor:"pointer" }}>← Back to Home</button>
        </div>
      )}
    </div>
  );
}
