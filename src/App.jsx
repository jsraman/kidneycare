import { useState, useEffect, useRef } from "react";

const API_MODEL = "claude-sonnet-4-20250514";

// ══════════════════════════════════════════
// CKD STAGE LIMITS
// ══════════════════════════════════════════
const CKD_STAGES = {
  "Stage 1":{ label:"Stage 1", gfr:"90+",  potassium:3500, sodium:2300, phosphorus:1000, protein:60, color:"#3ddc72", note:"Kidney function near normal. Modest restrictions." },
  "Stage 2":{ label:"Stage 2", gfr:"60–89", potassium:3000, sodium:2000, phosphorus:900,  protein:55, color:"#80d060", note:"Mild loss of function. Begin monitoring intake." },
  "Stage 3":{ label:"Stage 3", gfr:"30–59", potassium:2500, sodium:1800, phosphorus:800,  protein:50, color:"#f0c040", note:"Moderate loss. Diet restrictions become important." },
  "Stage 4":{ label:"Stage 4", gfr:"15–29", potassium:2000, sodium:1500, phosphorus:800,  protein:45, color:"#f0903a", note:"Severe loss. Strict dietary management required." },
  "ESRD":   { label:"ESRD",    gfr:"<15",   potassium:1500, sodium:1000, phosphorus:700,  protein:40, color:"#f06060", note:"Kidney failure. Most restrictive diet needed." },
};

const NUTRIENTS = ["potassium","sodium","phosphorus","protein"];
const N_LABELS  = { potassium:"Potassium", sodium:"Sodium", phosphorus:"Phosphorus", protein:"Protein" };
const N_UNITS   = { potassium:"mg", sodium:"mg", phosphorus:"mg", protein:"g" };

// ══════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ══════════════════════════════════════════
const LS = {
  get:(k,def)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def; }catch(e){ return def; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
};

const todayKey = ()=> new Date().toISOString().slice(0,10);
const dateKey  = (d)=> d.toISOString().slice(0,10);
const pastDays = (n)=> Array.from({length:n},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return dateKey(d); });

// ══════════════════════════════════════════
// SHARED UI
// ══════════════════════════════════════════
function getRiskColor(r){ return r==="high"?"#f06060":r==="medium"?"#f0b429":"#3ddc72"; }

function callClaude(prompt,maxTokens){
  return fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:API_MODEL, max_tokens:maxTokens||1000, messages:[{role:"user",content:prompt}]}),
  }).then(r=>r.json()).then(d=>{
    const text=d.content?.map(b=>b.text||"").join("")||"";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  });
}

function BounceDots({color}){
  return(
    <div style={{display:"flex",gap:5,justifyContent:"center",padding:"20px 0"}}>
      {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:color||"#3ddc72",animation:`ckdB 1.1s ${i*0.18}s infinite ease-in-out`}}/>)}
      <style>{`@keyframes ckdB{0%,80%,100%{transform:scale(0.45);opacity:0.25}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function TopBar({onBack,title,right}){
  return(
    <div style={{position:"sticky",top:0,zIndex:50,background:"#07100a",borderBottom:"1px solid #1e3324",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
      {onBack&&<button onClick={onBack} style={{background:"#112115",border:"1px solid #1e3324",borderRadius:10,padding:"7px 14px",color:"#3ddc72",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>← Home</button>}
      <span style={{fontSize:15,fontWeight:700,color:"#edfaf2",fontFamily:"'Outfit',sans-serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
      {right}
    </div>
  );
}

function StageBanner({stage}){
  const s=CKD_STAGES[stage]||CKD_STAGES["Stage 3"];
  return(
    <div style={{background:"#0d1a10",border:`1px solid ${s.color}44`,borderRadius:10,padding:"8px 14px",margin:"10px 16px 0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:s.color,flexShrink:0}}/>
      <span style={{fontSize:12,color:s.color,fontFamily:"monospace",fontWeight:700}}>{s.label} · GFR {s.gfr}</span>
      <span style={{fontSize:11,color:"#527860",fontFamily:"monospace"}}>K:{s.potassium}mg · Na:{s.sodium}mg · P:{s.phosphorus}mg · Pro:{s.protein}g/day</span>
    </div>
  );
}

// ══════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════
const DEFAULT_PROFILE = {
  name:"", stage:"Stage 3",
  dietitianName:"", dietitianPhone:"", dietitianEmail:"",
  customLimits:{ potassium:"", sodium:"", phosphorus:"", protein:"" },
  useCustomLimits:false,
  medications:"", notes:"",
};

function ProfileScreen({onBack, profile, setProfile}){
  const [form,setForm]=useState(profile);
  const [saved,setSaved]=useState(false);
  const [showClearConfirm,setShowClearConfirm]=useState(false);
  const [showPrivacy,setShowPrivacy]=useState(false);

  const save=()=>{
    setProfile(form);
    LS.set("ckd_profile",form);
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const exportData=()=>{
    const data={
      exportDate: new Date().toISOString(),
      appVersion: "KidneyCare v2.0",
      profile: LS.get("ckd_profile",{}),
      foodLogs: LS.get("ckd_logs",{}),
      recipeLibrary: LS.get("ckd_library",[]),
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`kidneycare-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData=()=>{
    localStorage.removeItem("ckd_profile");
    localStorage.removeItem("ckd_logs");
    localStorage.removeItem("ckd_library");
    setProfile(DEFAULT_PROFILE);
    setShowClearConfirm(false);
    onBack();
  };

  const inp=(field,placeholder,type="text")=>(
    <input value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
      type={type} placeholder={placeholder}
      style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:10,padding:"11px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:10}}/>
  );

  const stageColor=CKD_STAGES[form.stage]?.color||"#3ddc72";

  return(
    <div style={{minHeight:"100vh",background:"#07100a",color:"#c8e8d0",fontFamily:"'Outfit',sans-serif",paddingBottom:80}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="My Profile"
        right={<button onClick={save} style={{background:saved?"#1a6e38":"#3ddc72",color:"#061008",border:"none",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>{saved?"✓ Saved!":"Save"}</button>}/>
      <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px"}}>

        {/* Disclaimer banner */}
        <div style={{background:"#1a1000",border:"1px solid #f0b42955",borderRadius:14,padding:14,marginBottom:20,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20,flexShrink:0}}>⚕️</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#f0b429",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Medical Disclaimer</div>
            <p style={{margin:0,fontSize:12,color:"#c8a840",lineHeight:1.7}}>
              KidneyCare is for <strong>informational purposes only</strong> and does not constitute medical advice, diagnosis or treatment. Nutritional values are estimates. Always consult your nephrologist or renal dietitian before making any dietary changes. Individual CKD management needs vary significantly by patient.
            </p>
          </div>
        </div>

        {/* Personal Info */}
        <Section title="Personal Info">
          {inp("name","Your name")}
        </Section>

        {/* CKD Stage */}
        <Section title="My CKD Stage">
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {Object.keys(CKD_STAGES).map(s=>{
              const st=CKD_STAGES[s]; const active=form.stage===s;
              return(
                <button key={s} onClick={()=>setForm(f=>({...f,stage:s}))}
                  style={{background:active?st.color:"transparent",color:active?"#061008":st.color,border:`2px solid ${st.color}`,borderRadius:20,padding:"7px 16px",fontSize:12,fontWeight:active?800:500,cursor:"pointer",fontFamily:"monospace",transition:"all 0.2s"}}>
                  {s}
                </button>
              );
            })}
          </div>
          {form.stage&&<div style={{background:"#0d1a10",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#527860",fontFamily:"monospace"}}>{CKD_STAGES[form.stage]?.note}</div>}
        </Section>

        {/* Custom Limits */}
        <Section title="Daily Nutrient Limits">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,background:"#0d1a10",borderRadius:10,padding:"10px 14px",cursor:"pointer"}} onClick={()=>setForm(f=>({...f,useCustomLimits:!f.useCustomLimits}))}>
            <div style={{width:20,height:20,borderRadius:5,background:form.useCustomLimits?"#3ddc72":"transparent",border:`2px solid ${form.useCustomLimits?"#3ddc72":"#243528"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {form.useCustomLimits&&<span style={{color:"#061008",fontSize:12,fontWeight:900}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:"#c8e8d0"}}>Use custom limits (set by my dietitian)</span>
          </div>
          {form.useCustomLimits?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {NUTRIENTS.map(n=>(
                <div key={n}>
                  <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",marginBottom:4}}>{N_LABELS[n]} ({N_UNITS[n]})</div>
                  <input type="number" value={form.customLimits?.[n]||""} onChange={e=>setForm(f=>({...f,customLimits:{...f.customLimits,[n]:e.target.value}}))}
                    placeholder={String(CKD_STAGES[form.stage]?.[n]||"")}
                    style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:8,padding:"9px 12px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {NUTRIENTS.map(n=>{
                const val=CKD_STAGES[form.stage]?.[n];
                return<div key={n} style={{background:"#0d1a10",borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:800,color:CKD_STAGES[form.stage]?.color,fontFamily:"monospace"}}>{val}{N_UNITS[n]}</div>
                  <div style={{fontSize:9,color:"#527860",fontFamily:"monospace",textTransform:"uppercase"}}>{N_LABELS[n]}</div>
                </div>;
              })}
            </div>
          )}
        </Section>

        {/* Dietitian */}
        <Section title="My Renal Dietitian">
          {inp("dietitianName","Dietitian name")}
          {inp("dietitianPhone","Phone number","tel")}
          {inp("dietitianEmail","Email address","email")}
        </Section>

        {/* Medications */}
        <Section title="Medications">
          <textarea value={form.medications||""} onChange={e=>setForm(f=>({...f,medications:e.target.value}))}
            placeholder="List your current medications (e.g. Phosphate binders, Blood pressure meds, Diuretics...)"
            rows={3} style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:10,padding:"11px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",resize:"vertical",boxSizing:"border-box",marginBottom:0}}/>
        </Section>

        {/* Notes */}
        <Section title="Personal Notes">
          <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Any notes for yourself or your dietitian..."
            rows={3} style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:10,padding:"11px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",resize:"vertical",boxSizing:"border-box"}}/>
        </Section>

        <button onClick={save} style={{width:"100%",background:saved?"#1a6e38":"#3ddc72",color:"#061008",border:"none",borderRadius:12,padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:16}}>
          {saved?"✓ Profile Saved!":"Save Profile"}
        </button>

        {/* Data Privacy Section */}
        <Section title="🔒 Your Data & Privacy">
          <div style={{fontSize:13,color:"#c8e8d0",lineHeight:1.7,marginBottom:14}}>
            All your data is stored <strong style={{color:"#3ddc72"}}>only on this device</strong> in your browser's local storage. We never see, collect or transmit your personal health information to any server.
          </div>
          <div style={{background:"#0d1a10",borderRadius:10,padding:12,marginBottom:12,fontSize:12,color:"#527860",fontFamily:"monospace",lineHeight:1.7}}>
            ⚠️ Important: Clearing your browser's site data or cache will permanently delete all your KidneyCare data. Export your data regularly as a backup.
          </div>
          <button onClick={exportData}
            style={{width:"100%",background:"#0d2015",border:"1px solid #3ddc7266",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,color:"#3ddc72",cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📥 Export All My Data (JSON backup)
          </button>
          <button onClick={()=>setShowPrivacy(true)}
            style={{width:"100%",background:"transparent",border:"1px solid #243528",borderRadius:12,padding:"11px",fontSize:13,color:"#527860",cursor:"pointer",fontFamily:"monospace",marginBottom:10}}>
            📋 View Full Privacy Policy
          </button>
          <button onClick={()=>setShowClearConfirm(true)}
            style={{width:"100%",background:"transparent",border:"1px solid #f0606055",borderRadius:12,padding:"11px",fontSize:13,color:"#f06060",cursor:"pointer",fontFamily:"monospace"}}>
            🗑 Clear All My Data
          </button>
        </Section>

        <p style={{marginTop:8,fontSize:11,color:"#527860",textAlign:"center",fontFamily:"monospace",lineHeight:1.6}}>
          KidneyCare v2.0 · For informational purposes only<br/>
          Not a substitute for professional medical advice
        </p>
      </div>

      {/* Clear confirm modal */}
      {showClearConfirm&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
          <div style={{background:"#1a1a1a",border:"1px solid #f0606066",borderRadius:16,padding:24,maxWidth:340,width:"100%"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#f06060",marginBottom:8,fontFamily:"'Outfit',sans-serif"}}>⚠️ Delete All Data?</div>
            <p style={{fontSize:14,color:"#c8e8d0",lineHeight:1.7,marginBottom:20}}>This will permanently delete your profile, all food logs, and your recipe library. <strong>This cannot be undone.</strong> Export your data first if you want a backup.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:"transparent",border:"1px solid #243528",borderRadius:10,padding:"12px",color:"#527860",fontSize:14,cursor:"pointer",fontFamily:"monospace"}}>Cancel</button>
              <button onClick={clearAllData} style={{flex:1,background:"#f06060",color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy policy modal */}
      {showPrivacy&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20,overflowY:"auto"}}>
          <div style={{background:"#0a0f0d",border:"1px solid #1e3324",borderRadius:16,padding:24,maxWidth:500,width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#edfaf2",marginBottom:16,fontFamily:"'Outfit',sans-serif"}}>Privacy Policy</div>
            {[
              ["Data Storage","All data you enter into KidneyCare — including your profile, CKD stage, food logs, and recipes — is stored exclusively on your device using browser local storage. This data never leaves your device and is not transmitted to any server."],
              ["Data We Do NOT Collect","We do not collect, store, or have access to any personal health information. We do not use analytics, tracking cookies, or any third-party data services that would identify you personally."],
              ["AI Analysis","When you use features like Food Checker or Recipe Converter, your food queries are sent to the Anthropic Claude AI API to generate responses. These queries do not include your personal profile information. Please review Anthropic's privacy policy at anthropic.com for details on how API queries are handled."],
              ["Medical Disclaimer","KidneyCare is an informational tool only. It does not provide medical advice, diagnosis, or treatment recommendations. Nutritional values are estimates based on general food data and may vary. Always consult your nephrologist or renal dietitian before making any dietary changes. Individual needs vary significantly based on your specific CKD stage, lab values, medications, and other health conditions."],
              ["Your Rights & Control","You have complete control over your data. You can export all your data at any time using the Export button. You can delete all stored data using the Clear All Data button. Clearing your browser's site data will also remove all KidneyCare data."],
              ["Children","This app is not intended for use by children under 18 without parental or guardian supervision and medical professional guidance."],
            ].map(([title,text])=>(
              <div key={title} style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"#3ddc72",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{title}</div>
                <p style={{margin:0,fontSize:13,color:"#c8e8d0",lineHeight:1.7}}>{text}</p>
              </div>
            ))}
            <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",marginBottom:16}}>Last updated: March 2026</div>
            <button onClick={()=>setShowPrivacy(false)} style={{width:"100%",background:"#3ddc72",color:"#061008",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


function Section({title,children}){
  return(
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{title}</div>
      <div style={{background:"#112115",border:"1px solid #1e3324",borderRadius:14,padding:16}}>{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════
// FOOD CHECKER
// ══════════════════════════════════════════
function FoodChecker({onBack,stage,limits}){
  const [food,setFood]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const [history,setHistory]=useState([]);

  const check=async()=>{
    if(!food.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try{
      const data=await callClaude(`You are a renal dietitian for CKD ${stage}. Daily limits: K ${limits.potassium}mg, Na ${limits.sodium}mg, P ${limits.phosphorus}mg, Pro ${limits.protein}g. Analyze: "${food}". Return ONLY valid JSON:
{"foodName":"string","safetyLevel":"safe"|"caution"|"avoid","potassium":{"per100g":number,"risk":"low"|"medium"|"high"},"sodium":{"per100g":number,"risk":"low"|"medium"|"high"},"phosphorus":{"per100g":number,"risk":"low"|"medium"|"high"},"protein":{"per100g":number,"risk":"low"|"medium"|"high"},"ckdNote":"1-2 sentence summary for ${stage}","tip":"one practical tip","vegetarianStatus":"vegan"|"vegetarian"|"not-vegetarian"}`);
      setResult(data);
      setHistory(h=>[{food:data.foodName,level:data.safetyLevel},...h.slice(0,4)]);
    }catch(e){setError("Could not analyze. Please try again.");}
    finally{setLoading(false);}
  };

  const sc={safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"};
  const sl={safe:"✓ CKD Safe",caution:"⚠ Use Caution",avoid:"✗ Avoid"};

  return(
    <div style={{minHeight:"100vh",background:"#07100a",color:"#c8e8d0",fontFamily:"'Outfit',sans-serif",paddingBottom:60}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="Food Safety Checker"/>
      <StageBanner stage={stage}/>
      <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{background:"#112115",border:"1px solid #1e3324",borderRadius:16,padding:20,marginBottom:20}}>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input value={food} onChange={e=>setFood(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()}
              placeholder="e.g. spinach, tofu, khichdi..." autoFocus
              style={{flex:1,background:"#0d1a10",border:"1px solid #1e3324",borderRadius:10,padding:"11px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif"}}/>
            <button onClick={check} disabled={loading||!food.trim()}
              style={{background:"#3ddc72",color:"#04100a",border:"none",borderRadius:10,padding:"11px 20px",fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {loading?"...":"Check →"}
            </button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {["Khichdi","Poha","Cauliflower","Tofu","Banana","Spinach","Dal","White Rice"].map(f=>(
              <button key={f} onClick={()=>setFood(f)} style={{background:"transparent",border:"1px solid #1e3324",borderRadius:20,padding:"4px 12px",color:"#527860",fontSize:12,cursor:"pointer",fontFamily:"monospace"}}>{f}</button>
            ))}
          </div>
        </div>
        {loading&&<BounceDots/>}
        {error&&<div style={{background:"#2d1010",borderRadius:12,padding:16,color:"#f06060",fontSize:14,marginBottom:16}}>{error}</div>}
        {result&&!loading&&(
          <div style={{animation:"ckdFade 0.4s ease"}}>
            <style>{`@keyframes ckdFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{background:"#112115",border:`1px solid ${(sc[result.safetyLevel]||"#3ddc72")}44`,borderRadius:16,padding:20,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:"#edfaf2"}}>{result.foodName}</div>
                  <div style={{fontSize:11,color:"#527860",fontFamily:"monospace"}}>{result.vegetarianStatus==="vegan"?"🌱 Vegan":result.vegetarianStatus==="vegetarian"?"🥚 Vegetarian":"⚠ Not Vegetarian"}</div>
                </div>
                <span style={{fontSize:12,color:sc[result.safetyLevel],background:`${sc[result.safetyLevel]}18`,border:`1px solid ${sc[result.safetyLevel]}44`,borderRadius:10,padding:"5px 14px",fontFamily:"monospace",fontWeight:700}}>{sl[result.safetyLevel]}</span>
              </div>
              <p style={{fontSize:13,color:"#c8e8d0",lineHeight:1.7,margin:"0 0 16px",background:"#0d1a10",borderRadius:10,padding:12}}>{result.ckdNote}</p>
              {NUTRIENTS.map(n=>{
                const v=result[n]?.per100g||0; const r=result[n]?.risk||"low"; const max=limits[n]/7;
                return<div key={n} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#527860",fontFamily:"monospace"}}>{N_LABELS[n]}</span>
                    <span style={{fontSize:11,color:getRiskColor(r),fontFamily:"monospace"}}>{Math.round(v)}{N_UNITS[n]}</span>
                  </div>
                  <div style={{background:"#0d1a10",borderRadius:4,height:5,overflow:"hidden"}}>
                    <div style={{width:`${Math.min((v/max)*100,100)}%`,height:"100%",background:getRiskColor(r),borderRadius:4,transition:"width 0.7s ease"}}/>
                  </div>
                </div>;
              })}
            </div>
            <div style={{background:"#0d1a10",border:"1px solid #1a6e38",borderRadius:12,padding:14,display:"flex",gap:10}}>
              <span>💡</span><p style={{margin:0,fontSize:13,color:"#c8e8d0",lineHeight:1.6}}>{result.tip}</p>
            </div>
          </div>
        )}
        {history.length>0&&(
          <div style={{marginTop:24}}>
            <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Recent</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {history.map((h,i)=><button key={i} onClick={()=>setFood(h.food)} style={{background:"#112115",border:`1px solid ${({safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"}[h.level]||"#3ddc72")}55`,borderRadius:20,padding:"5px 14px",color:({safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"}[h.level]||"#3ddc72"),fontSize:12,cursor:"pointer",fontFamily:"monospace"}}>{h.food}</button>)}
            </div>
          </div>
        )}
        <p style={{marginTop:32,fontSize:11,color:"#527860",textAlign:"center",fontFamily:"monospace",lineHeight:1.6}}>For informational purposes only. Always consult your renal dietitian.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FOOD TRACKER
// ══════════════════════════════════════════
const TRK_CUISINES={
  "🇮🇳 Indian":["Dal","Idli","Chapati","Paneer","Aloo Gobi","Khichdi","Poha","Upma","Sambar","Raita"],
  "🇮🇹 Italian":["Pasta Marinara","Margherita Pizza","Risotto","Minestrone","Bruschetta","Caprese Salad","Focaccia","Gnocchi"],
  "🇲🇽 Mexican":["Bean Tacos","Guacamole","Veggie Burrito","Salsa","Cheese Quesadilla","Elote","Refried Beans","Tortilla Soup"],
  "🇨🇳 Chinese":["Steamed Rice","Mapo Tofu","Spring Rolls","Bok Choy Stir Fry","Egg Fried Rice","Congee","Steamed Dumplings","Hot & Sour Soup"],
  "🌍 Other":["Hummus","Falafel","Greek Salad","Miso Soup","Veggie Sushi","Pad Thai (veg)","Shakshuka","Tabbouleh"],
};

function dayTotals(log){
  return log.reduce((acc,item)=>{
    const s=item.portion/100;
    NUTRIENTS.forEach(n=>{ acc[n]=(acc[n]||0)+((item[n]||0)*s); });
    return acc;
  },{});
}

function FoodTracker({onBack,stage,limits}){
  const todayStr=new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
  const yesterdayStr=new Date(Date.now()-86400000).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});

  const [tab,setTab]=useState("track");
  const [histTab,setHistTab]=useState("weekly");
  const [food,setFood]=useState("");
  const [loading,setLoading]=useState(false);
  const [activeCuisine,setActiveCuisine]=useState("🇮🇳 Indian");
  const [viewDay,setViewDay]=useState("today");
  const [modal,setModal]=useState(null);

  // Load logs from localStorage
  const [logs,setLogs]=useState(()=>{
    const saved=LS.get("ckd_logs",{});
    return saved;
  });

  const saveLogs=(updated)=>{ setLogs(updated); LS.set("ckd_logs",updated); };

  const getLog=(dayKey)=>logs[dayKey]||[];
  const setLog=(dayKey,entries)=>saveLogs({...logs,[dayKey]:entries});

  const currentKey=viewDay==="today"?todayKey():dateKey(new Date(Date.now()-86400000));
  const activeLog=getLog(currentKey);
  const totals=dayTotals(activeLog);

  const analyze=async(name,portionG,dayKey)=>{
    setLoading(true);
    try{
      const data=await callClaude(`Renal dietitian for CKD ${stage}: analyze "${name}" for vegetarian patient. Return ONLY JSON: {"foodName":"string","safetyLevel":"safe"|"caution"|"avoid","potassium":number,"sodium":number,"phosphorus":number,"protein":number,"potassiumRisk":"low"|"medium"|"high","sodiumRisk":"low"|"medium"|"high","phosphorusRisk":"low"|"medium"|"high","proteinRisk":"low"|"medium"|"high","tip":"string"}`,600);
      const entry={...data,portion:parseInt(portionG)||100,id:Date.now()};
      const updated={...logs,[dayKey]:[...(logs[dayKey]||[]),entry]};
      saveLogs(updated);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const confirmModal=()=>{
    if(!modal) return;
    const dk=modal.dayTarget==="today"?todayKey():dateKey(new Date(Date.now()-86400000));
    analyze(modal.foodName,modal.selectedG,dk);
    setModal(null);
  };

  const removeItem=(dayKey,id)=>setLog(dayKey,getLog(dayKey).filter(x=>x.id!==id));

  // ── History computations ──
  const computeHistory=(periodDays,buckets,labelFn)=>{
    return Array.from({length:buckets},(_,i)=>{
      const bucketDays=Array.from({length:periodDays},(_,j)=>{
        const d=new Date(); d.setDate(d.getDate()-(i*periodDays+j)); return dateKey(d);
      });
      const allEntries=bucketDays.flatMap(dk=>logs[dk]||[]);
      const daysWithData=bucketDays.filter(dk=>(logs[dk]||[]).length>0).length||1;
      const tot=dayTotals(allEntries);
      const avg={}; NUTRIENTS.forEach(n=>avg[n]=(tot[n]||0)/daysWithData);
      return {label:labelFn(i,bucketDays),avg,daysWithData};
    }).reverse();
  };

  const weeklyData=computeHistory(7,4,(i,days)=>{
    if(i===0) return "This week";
    if(i===1) return "Last week";
    const d=new Date(days[0]); return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  });

  const monthlyData=computeHistory(30,12,(i,days)=>{
    const d=new Date(days[0]); return d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"});
  });

  const yearlyData=computeHistory(365,3,(i)=>{
    const y=new Date().getFullYear()-i; return String(y);
  });

  const histData={weekly:weeklyData,monthly:monthlyData,yearly:yearlyData};
  const currentHist=histData[histTab];

  const sc=s=>s==="safe"?"#3ddc72":s==="caution"?"#f0b429":"#f06060";
  const sl=s=>s==="safe"?"✓ Safe":s==="caution"?"⚠ Caution":"✗ Avoid";

  return(
    <div style={{minHeight:"100vh",background:"#0e0e18",color:"#d8d4f0",fontFamily:"'Outfit',sans-serif",paddingBottom:80}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="Daily Food Tracker"/>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <StageBanner stage={stage}/>

        {/* Day toggle */}
        <div style={{display:"flex",gap:8,padding:"12px 16px 0"}}>
          {[["today",todayStr],["yesterday",yesterdayStr]].map(([key,label])=>(
            <button key={key} onClick={()=>{setViewDay(key);setTab("log");}}
              style={{flex:1,padding:"10px",border:`2px solid ${viewDay===key?"#e8a838":"#2a2a45"}`,borderRadius:10,background:viewDay===key?"#2a1e00":"#14141f",color:viewDay===key?"#e8a838":"#7870a0",fontSize:12,fontWeight:viewDay===key?700:400,cursor:"pointer",fontFamily:"monospace",transition:"all 0.2s"}}>
              {key==="today"?"📅":"📆"} {label} ({getLog(key==="today"?todayKey():dateKey(new Date(Date.now()-86400000))).length})
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #2a2a45",background:"#14141f",marginTop:10}}>
          {[["track","➕ Add"],["log",`📋 Log (${activeLog.length})`],["totals","📊 Today"],["history","📈 History"]].map(([k,lbl])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"12px 6px",border:"none",background:"transparent",color:tab===k?"#e8a838":"#7870a0",fontSize:11,fontWeight:tab===k?700:400,cursor:"pointer",fontFamily:"monospace",borderBottom:`2px solid ${tab===k?"#e8a838":"transparent"}`}}>{lbl}</button>
          ))}
        </div>

        <div style={{padding:"14px 16px"}}>

          {/* ── ADD ── */}
          {tab==="track"&&(
            <div>
              <div style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:14,padding:16,marginBottom:14}}>
                <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Manual Entry</div>
                <div style={{display:"flex",gap:8}}>
                  <input value={food} onChange={e=>setFood(e.target.value)} onKeyDown={e=>e.key==="Enter"&&food.trim()&&setModal({foodName:food,selectedG:100,dayTarget:"today"})}
                    placeholder="Type any food name..."
                    style={{flex:1,background:"#14141f",border:"1px solid #2a2a45",borderRadius:8,padding:"10px 14px",color:"#f4f0ff",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif"}}/>
                  <button onClick={()=>food.trim()&&setModal({foodName:food,selectedG:100,dayTarget:"today"})} disabled={!food.trim()}
                    style={{background:"#e8a838",color:"#1a0e00",border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Next →</button>
                </div>
              </div>
              <div style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:14,padding:16}}>
                <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Quick Pick by Cuisine</div>
                <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12}}>
                  {Object.keys(TRK_CUISINES).map(c=>(
                    <button key={c} onClick={()=>setActiveCuisine(c)}
                      style={{background:activeCuisine===c?"#e8a838":"#14141f",color:activeCuisine===c?"#1a0e00":"#7870a0",border:`1px solid ${activeCuisine===c?"#e8a838":"#2a2a45"}`,borderRadius:20,padding:"5px 12px",fontSize:11,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"monospace",fontWeight:activeCuisine===c?700:400}}>{c}</button>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                  {TRK_CUISINES[activeCuisine].map(f=>(
                    <button key={f} onClick={()=>setModal({foodName:f,selectedG:100,dayTarget:"today"})}
                      style={{background:"#14141f",border:"1px solid #2a2a45",borderRadius:10,padding:"12px",color:"#d8d4f0",fontSize:13,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#e8a838";e.currentTarget.style.color="#f4f0ff";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a45";e.currentTarget.style.color="#d8d4f0";}}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {loading&&<div style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:12,padding:16,marginTop:14,textAlign:"center"}}><BounceDots color="#e8a838"/><div style={{color:"#7870a0",fontSize:12,fontFamily:"monospace",marginTop:4}}>Analyzing & saving...</div></div>}
            </div>
          )}

          {/* ── LOG ── */}
          {tab==="log"&&(
            <div>
              {activeLog.length===0?(
                <div style={{textAlign:"center",padding:"50px 20px",color:"#7870a0"}}>
                  <div style={{fontSize:40,marginBottom:12}}>🥗</div>
                  <div style={{fontFamily:"monospace",fontSize:14}}>No foods logged for {viewDay}.</div>
                  <button onClick={()=>setTab("track")} style={{marginTop:16,background:"#e8a838",color:"#1a0e00",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add Food</button>
                </div>
              ):(
                <>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontSize:12,color:"#7870a0",fontFamily:"monospace"}}>{activeLog.length} items · {viewDay}</span>
                    <button onClick={()=>setLog(currentKey,[])} style={{background:"transparent",border:"1px solid #f0606055",borderRadius:8,padding:"4px 12px",color:"#f06060",fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>Clear All</button>
                  </div>
                  {activeLog.map(item=>{
                    const s=item.portion/100;
                    return(
                      <div key={item.id} style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:14,padding:14,marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:15,color:"#f4f0ff"}}>{item.foodName}</div>
                            <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace"}}>{item.portion}g</div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:11,color:sc(item.safetyLevel),fontFamily:"monospace",background:`${sc(item.safetyLevel)}22`,padding:"3px 8px",borderRadius:10}}>{sl(item.safetyLevel)}</span>
                            <button onClick={()=>removeItem(currentKey,item.id)} style={{background:"transparent",border:"none",color:"#7870a0",cursor:"pointer",fontSize:18,padding:2,lineHeight:1}}>×</button>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                          {NUTRIENTS.map(n=>{
                            const v=(item[n]||0)*s; const r=item[n+"Risk"]||"low";
                            return<div key={n} style={{background:"#14141f",borderRadius:8,padding:"7px 4px",textAlign:"center"}}>
                              <div style={{fontSize:12,fontWeight:700,color:getRiskColor(r),fontFamily:"monospace"}}>{Math.round(v)}{N_UNITS[n]}</div>
                              <div style={{fontSize:9,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase"}}>{n==="phosphorus"?"Phos":n==="potassium"?"K":n==="protein"?"Pro":"Na"}</div>
                            </div>;
                          })}
                        </div>
                        {item.tip&&<div style={{marginTop:10,fontSize:11,color:"#e8a838",fontFamily:"monospace",background:"#1e1800",borderRadius:8,padding:"7px 10px"}}>💡 {item.tip}</div>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── TOTALS ── */}
          {tab==="totals"&&(
            <div>
              <div style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:14,padding:18,marginBottom:14}}>
                <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>
                  {viewDay==="today"?todayStr:yesterdayStr} vs {stage} Limits
                </div>
                {NUTRIENTS.map(n=>{
                  const cur=totals[n]||0; const max=limits[n];
                  const pct=Math.min((cur/max)*100,100); const over=cur>max;
                  const col=over?"#f06060":pct>75?"#f0b429":"#3ddc72";
                  return<div key={n} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:12,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase"}}>{N_LABELS[n]}</span>
                      <span style={{fontSize:12,color:col,fontFamily:"monospace",fontWeight:600}}>{Math.round(cur)}{N_UNITS[n]} / {max}{N_UNITS[n]}{over?" ⚠ OVER":""}</span>
                    </div>
                    <div style={{background:"#1a1a30",borderRadius:6,height:8,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:6,transition:"width 0.8s ease"}}/>
                    </div>
                  </div>;
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {NUTRIENTS.map(n=>{
                  const pct=Math.round(((totals[n]||0)/limits[n])*100);
                  const col=pct>100?"#f06060":pct>75?"#f0b429":"#3ddc72";
                  return<div key={n} style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:12,padding:14,textAlign:"center"}}>
                    <div style={{fontSize:26,fontWeight:700,color:col,fontFamily:"monospace"}}>{pct}%</div>
                    <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace"}}>{N_LABELS[n]}</div>
                    <div style={{fontSize:10,color:"#7870a0",fontFamily:"monospace"}}>{Math.round(totals[n]||0)}/{limits[n]}{N_UNITS[n]}</div>
                  </div>;
                })}
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab==="history"&&(
            <div>
              {/* Period toggle */}
              <div style={{display:"flex",gap:6,marginBottom:16,background:"#14141f",borderRadius:10,padding:4}}>
                {[["weekly","4 Weeks"],["monthly","12 Months"],["yearly","3 Years"]].map(([k,lbl])=>(
                  <button key={k} onClick={()=>setHistTab(k)}
                    style={{flex:1,padding:"9px 8px",border:"none",borderRadius:8,background:histTab===k?"#e8a838":"transparent",color:histTab===k?"#1a0e00":"#7870a0",fontSize:12,fontWeight:histTab===k?700:400,cursor:"pointer",fontFamily:"monospace",transition:"all 0.2s"}}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
                Average per day · {histTab==="weekly"?"Past 4 weeks":histTab==="monthly"?"Past 12 months":"Past 3 years"}
              </div>

              {currentHist.map((bucket,bi)=>(
                <div key={bi} style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:14,padding:16,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,color:"#f4f0ff",fontSize:14,fontFamily:"monospace"}}>{bucket.label}</div>
                    <div style={{fontSize:10,color:"#7870a0",fontFamily:"monospace"}}>{bucket.daysWithData} day{bucket.daysWithData!==1?"s":""} logged</div>
                  </div>
                  {bucket.daysWithData<=1&&bi>0?(
                    <div style={{fontSize:12,color:"#7870a0",fontFamily:"monospace",textAlign:"center",padding:"8px 0"}}>No data logged yet</div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                      {NUTRIENTS.map(n=>{
                        const avg=bucket.avg[n]||0; const lim=limits[n];
                        const pct=Math.min((avg/lim)*100,100);
                        const col=avg>lim?"#f06060":pct>75?"#f0b429":"#3ddc72";
                        return<div key={n} style={{background:"#14141f",borderRadius:10,padding:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase"}}>{N_LABELS[n]}</span>
                            <span style={{fontSize:11,color:col,fontFamily:"monospace",fontWeight:700}}>{Math.round(avg)}{N_UNITS[n]}</span>
                          </div>
                          <div style={{background:"#1a1a30",borderRadius:4,height:5,overflow:"hidden"}}>
                            <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:4}}/>
                          </div>
                          <div style={{fontSize:9,color:"#7870a0",fontFamily:"monospace",marginTop:3,textAlign:"right"}}>{Math.round(pct)}% of limit</div>
                        </div>;
                      })}
                    </div>
                  )}
                </div>
              ))}
              <p style={{fontSize:11,color:"#527860",textAlign:"center",fontFamily:"monospace",lineHeight:1.6,marginTop:8}}>History based on days you logged food.<br/>Empty periods show "No data logged yet".</p>
            </div>
          )}
        </div>
      </div>

      {/* ── PORTION MODAL ── */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
          <div style={{background:"#1a1a2e",borderRadius:"20px 20px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:480,border:"1px solid #2a2a45"}}>
            <div style={{fontWeight:700,color:"#f4f0ff",fontSize:18,marginBottom:4,fontFamily:"'Outfit',sans-serif"}}>{modal.foodName}</div>
            <div style={{fontSize:12,color:"#7870a0",fontFamily:"monospace",marginBottom:18}}>Choose portion size and which day to log</div>

            <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Portion Size</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:18}}>
              {[50,75,100,150,200,250,300,350,400].map(g=>(
                <button key={g} onClick={()=>setModal(m=>({...m,selectedG:g}))}
                  style={{background:modal.selectedG===g?"#e8a838":"#14141f",border:`2px solid ${modal.selectedG===g?"#e8a838":"#2a2a45"}`,borderRadius:10,padding:"12px 8px",color:modal.selectedG===g?"#1a0e00":"#d8d4f0",fontSize:14,cursor:"pointer",fontFamily:"monospace",fontWeight:modal.selectedG===g?800:500,transition:"all 0.15s"}}>
                  {g}g
                </button>
              ))}
            </div>

            <div style={{fontSize:11,color:"#7870a0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Add to which day?</div>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              {[["today","📅",todayStr,"#3ddc72","#1a3a1a"],["yesterday","📆",yesterdayStr,"#a080f0","#1a1a3a"]].map(([key,icon,label,col,bg])=>(
                <button key={key} onClick={()=>setModal(m=>({...m,dayTarget:key}))}
                  style={{flex:1,background:modal.dayTarget===key?bg:"#14141f",border:`2px solid ${modal.dayTarget===key?col:"#2a2a45"}`,borderRadius:12,padding:"12px 10px",color:modal.dayTarget===key?col:"#7870a0",fontSize:13,fontWeight:modal.dayTarget===key?700:400,cursor:"pointer",fontFamily:"monospace",textAlign:"center"}}>
                  {icon} {key.charAt(0).toUpperCase()+key.slice(1)}<br/><span style={{fontSize:10}}>{label}</span>
                </button>
              ))}
            </div>

            <button onClick={confirmModal}
              style={{width:"100%",background:"#e8a838",color:"#1a0e00",border:"none",borderRadius:12,padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:10}}>
              ✓ Add {modal.selectedG}g to {modal.dayTarget==="today"?todayStr:yesterdayStr}
            </button>
            <button onClick={()=>setModal(null)}
              style={{width:"100%",background:"transparent",border:"1px solid #2a2a45",borderRadius:12,padding:"12px",color:"#7870a0",fontSize:14,cursor:"pointer",fontFamily:"monospace"}}>
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
function RecipeConverter({onBack,stage,limits}){
  const [mode,setMode]=useState("name");
  const [input,setInput]=useState("");
  const [servings,setServings]=useState("4");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [accepted,setAccepted]=useState({});

  const convert=async()=>{
    if(!input.trim()) return;
    setLoading(true); setResult(null); setAccepted({});
    try{
      const data=await callClaude(`Renal dietitian for CKD ${stage} (K limit ${limits.potassium}mg, Na ${limits.sodium}mg, P ${limits.phosphorus}mg, Pro ${limits.protein}g/day). ${mode==="name"?`Dish: "${input}"`:`Recipe:\n${input}`}. Serves ${servings}. Return ONLY valid JSON:
{"dishName":"string","safetyBefore":"safe"|"caution"|"avoid","safetyAfter":"safe"|"caution"|"avoid","originalIngredients":[{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high","riskReason":"string"}],"substitutions":[{"original":"string","substitute":"string","amount":"string","reason":"string","reduction":"string"}],"cookingTips":["string"],"nutritionBefore":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"nutritionAfter":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"modifiedRecipeSummary":"string"}`,1500);
      setResult(data);
      const auto={}; data.substitutions?.forEach((_,i)=>{auto[i]=true;}); setAccepted(auto);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const sc=s=>({safe:"#3ddc72",caution:"#f0b429",avoid:"#f06060"}[s]||"#f0b429");
  const sl=s=>({safe:"✓ Safe",caution:"⚠ Caution",avoid:"✗ Avoid"}[s]||s);
  const acceptedCount=Object.values(accepted).filter(Boolean).length;
  const totalSubs=result?.substitutions?.length||0;
  const adjN=result?Object.fromEntries(NUTRIENTS.map(n=>[n,result.nutritionBefore[n]-((result.nutritionBefore[n]-result.nutritionAfter[n])*(acceptedCount/Math.max(totalSubs,1)))])):null;
  const SAMPLES=["Aloo Gobi","Dal Makhani","Rajma","Margherita Pizza","Bean Tacos","Pasta Primavera"];

  return(
    <div style={{minHeight:"100vh",background:"#0f0c1a",color:"#e2d9f3",fontFamily:"'Outfit',sans-serif",paddingBottom:60}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title="Recipe Converter"/>
      <StageBanner stage={stage}/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{background:"#1e1835",border:"1px solid #2e2850",borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{display:"flex",background:"#16122a",borderRadius:10,padding:4,marginBottom:14,gap:4}}>
            {[["name","🍽 Dish Name"],["paste","📋 Paste Recipe"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setMode(k)} style={{flex:1,padding:"9px 12px",border:"none",borderRadius:8,background:mode===k?"#c084fc":"transparent",color:mode===k?"#0f0c1a":"#7c6fa0",fontSize:13,fontWeight:mode===k?700:400,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>{lbl}</button>
            ))}
          </div>
          {mode==="name"?(
            <>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&convert()} placeholder="e.g. Aloo Gobi, Dal Tadka, Pasta..."
                style={{width:"100%",background:"#16122a",border:"1px solid #2e2850",borderRadius:10,padding:"12px 16px",color:"#f8f4ff",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:10}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {SAMPLES.map(r=><button key={r} onClick={()=>setInput(r)} style={{background:"transparent",border:"1px solid #2e2850",borderRadius:20,padding:"4px 12px",color:"#7c6fa0",fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>{r}</button>)}
              </div>
            </>
          ):(
            <textarea value={input} onChange={e=>setInput(e.target.value)} rows={5} placeholder={"Paste ingredients:\n2 potatoes\n1 cup tomatoes..."}
              style={{width:"100%",background:"#16122a",border:"1px solid #2e2850",borderRadius:10,padding:"12px 16px",color:"#f8f4ff",fontSize:14,outline:"none",fontFamily:"monospace",resize:"vertical",boxSizing:"border-box"}}/>
          )}
          <div style={{display:"flex",gap:10,alignItems:"flex-end",marginTop:12}}>
            <div>
              <div style={{fontSize:11,color:"#7c6fa0",fontFamily:"monospace",textTransform:"uppercase",marginBottom:6}}>Serves</div>
              <input value={servings} onChange={e=>setServings(e.target.value)} type="number" min="1" max="20"
                style={{width:70,background:"#16122a",border:"1px solid #2e2850",borderRadius:10,padding:"10px 12px",color:"#f8f4ff",fontSize:14,outline:"none",fontFamily:"monospace"}}/>
            </div>
            <button onClick={convert} disabled={loading||!input.trim()}
              style={{flex:1,background:loading?"#7c3aed":"#c084fc",color:"#0f0c1a",border:"none",borderRadius:10,padding:"12px 20px",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"'Outfit',sans-serif"}}>
              {loading?"Converting...":"🔄 Convert to CKD-Safe →"}
            </button>
          </div>
        </div>
        {loading&&<BounceDots color="#c084fc"/>}
        {result&&!loading&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,marginBottom:14,alignItems:"center"}}>
              {["safetyBefore","","safetyAfter"].map((k,i)=>i===1?<div key="arr" style={{color:"#7c6fa0",textAlign:"center",fontSize:18}}>→</div>:(
                <div key={k} style={{background:"#1e1835",border:`1px solid ${sc(result[k])}44`,borderRadius:12,padding:12,textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#7c6fa0",fontFamily:"monospace",marginBottom:4}}>{k==="safetyBefore"?"BEFORE":"AFTER"}</div>
                  <div style={{fontSize:13,fontWeight:700,color:sc(result[k])}}>{sl(result[k])}</div>
                </div>
              ))}
            </div>
            {result.originalIngredients?.length>0&&(
              <div style={{background:"#1e1835",border:"1px solid #2e2850",borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:"#7c6fa0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Ingredients — Risk</div>
                {result.originalIngredients.map((ing,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<result.originalIngredients.length-1?"1px solid #2e2850":"none",gap:10}}>
                    <div>
                      <div style={{fontSize:14,color:"#f8f4ff"}}>{ing.amount} {ing.name}</div>
                      <div style={{fontSize:11,color:"#7c6fa0",fontFamily:"monospace"}}>{ing.riskReason}</div>
                    </div>
                    <span style={{fontSize:10,color:getRiskColor(ing.ckdRisk),background:`${getRiskColor(ing.ckdRisk)}22`,border:`1px solid ${getRiskColor(ing.ckdRisk)}44`,borderRadius:10,padding:"2px 8px",fontFamily:"monospace",whiteSpace:"nowrap"}}>{ing.ckdRisk}</span>
                  </div>
                ))}
              </div>
            )}
            {result.substitutions?.length>0&&(
              <div style={{background:"#1e1835",border:"1px solid #2e2850",borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:11,color:"#7c6fa0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1}}>Smart Swaps</div>
                  <div style={{fontSize:11,color:"#c084fc",fontFamily:"monospace"}}>{acceptedCount}/{totalSubs} on</div>
                </div>
                {result.substitutions.map((sub,i)=>(
                  <div key={i} style={{background:accepted[i]?"#1a0f2e":"#16122a",border:`1px solid ${accepted[i]?"#7c3aed":"#2e2850"}`,borderRadius:12,padding:12,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{color:"#f06060",fontFamily:"monospace",fontSize:13,textDecoration:accepted[i]?"line-through":"none"}}>{sub.original}</span>
                          <span style={{color:"#7c6fa0"}}>→</span>
                          <span style={{color:"#3ddc72",fontFamily:"monospace",fontSize:13,fontWeight:600}}>{sub.amount} {sub.substitute}</span>
                        </div>
                        <div style={{fontSize:11,color:"#c084fc",fontFamily:"monospace",background:"#1e1040",borderRadius:6,padding:"2px 8px",display:"inline-block"}}>💜 {sub.reduction}</div>
                      </div>
                      <button onClick={()=>setAccepted(a=>({...a,[i]:!a[i]}))}
                        style={{background:accepted[i]?"#c084fc":"transparent",border:`1px solid ${accepted[i]?"#c084fc":"#2e2850"}`,borderRadius:8,padding:"5px 10px",color:accepted[i]?"#0f0c1a":"#7c6fa0",fontSize:12,cursor:"pointer",fontFamily:"monospace",fontWeight:600,flexShrink:0}}>
                        {accepted[i]?"✓ On":"Off"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {adjN&&(
              <div style={{background:"#1e1835",border:"1px solid #2e2850",borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:"#7c6fa0",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Nutrition Per Serving</div>
                {NUTRIENTS.map(n=>{
                  const bef=result.nutritionBefore[n]; const aft=adjN[n]; const lim=limits[n]/3;
                  const col=aft>lim?"#f06060":(aft/lim)>0.75?"#f0b429":"#3ddc72";
                  return<div key={n} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:"#7c6fa0",fontFamily:"monospace",textTransform:"uppercase"}}>{N_LABELS[n]}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#7c6fa0",fontFamily:"monospace",textDecoration:"line-through"}}>{Math.round(bef)}{N_UNITS[n]}</span>
                        <span style={{fontSize:12,color:col,fontFamily:"monospace",fontWeight:700}}>{Math.round(aft)}{N_UNITS[n]}</span>
                      </div>
                    </div>
                    <div style={{background:"#1a1530",borderRadius:6,height:7,overflow:"hidden"}}>
                      <div style={{width:`${Math.min((aft/lim)*100,100)}%`,height:"100%",background:col,borderRadius:6}}/>
                    </div>
                  </div>;
                })}
              </div>
            )}
            {result.cookingTips?.map((t,i)=><div key={i} style={{background:"#140e28",border:"1px solid #7c3aed",borderRadius:10,padding:12,marginBottom:8,fontSize:13,color:"#e2d9f3",lineHeight:1.6}}>→ {t}</div>)}
            <div style={{background:"#0d1a12",border:"1px solid #2a4a30",borderRadius:12,padding:14}}>
              <div style={{fontSize:11,color:"#3ddc72",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>✓ CKD-Safe Version</div>
              <p style={{margin:0,fontSize:14,color:"#e2d9f3",lineHeight:1.7}}>{result.modifiedRecipeSummary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// RECIPE LIBRARY (condensed)
// ══════════════════════════════════════════
const LIB_CUISINES=["All","🇮🇳 Indian","🇮🇹 Italian","🇲🇽 Mexican","🇨🇳 Chinese","🌍 Other"];
const LIB_SAFETY={safe:{color:"#3ddc72",bg:"#0d2d1a",label:"✓ Safe"},caution:{color:"#f0b429",bg:"#2d2010",label:"⚠ Caution"},avoid:{color:"#f06060",bg:"#2d1010",label:"✗ Avoid"}};
const LIB_DEFAULT=[
  {id:1,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Khichdi",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Khichdi is one of the best CKD-friendly Indian meals — low potassium and moderate protein.",topTip:"Use a 3:1 rice-to-dal ratio and rinse both thoroughly to reduce phosphorus.",ingredients:[{name:"White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Moong Dal",amount:"0.5 cup",ckdRisk:"low"},{name:"Ghee",amount:"1 tbsp",ckdRisk:"low"},{name:"Turmeric",amount:"0.5 tsp",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:180,sodium:120,phosphorus:110,protein:7},nutritionAfterSwaps:{potassium:180,sodium:120,phosphorus:110,protein:7}},
  {id:2,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Aloo Gobi (CKD-Safe)",servings:4,safetyLevel:"caution",photo:null,dietitianNote:"Leach potatoes twice before cooking to reduce potassium by up to 50%. Cauliflower is kidney-friendly.",topTip:"Boil potatoes twice and discard water both times before adding to the dish.",ingredients:[{name:"Potatoes (leached)",amount:"1 medium",ckdRisk:"medium"},{name:"Cauliflower",amount:"2 cups",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Tomato",amount:"0.5 small",ckdRisk:"medium"}],substitutions:[{original:"Regular potatoes",substitute:"Leached potatoes",reduction:"Reduces potassium by ~50%"}],nutritionPerServing:{potassium:340,sodium:140,phosphorus:90,protein:4},nutritionAfterSwaps:{potassium:220,sodium:140,phosphorus:80,protein:4}},
  {id:3,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Poha",servings:2,safetyLevel:"safe",photo:null,dietitianNote:"Excellent CKD breakfast — low in potassium, phosphorus and protein.",topTip:"Rinse poha well. Limit peanuts to a small garnish only.",ingredients:[{name:"Flattened Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"},{name:"Peanuts",amount:"1 tbsp",ckdRisk:"medium"}],substitutions:[{original:"Peanuts (large)",substitute:"1 tsp only",reduction:"Reduces phosphorus significantly"}],nutritionPerServing:{potassium:150,sodium:100,phosphorus:85,protein:4},nutritionAfterSwaps:{potassium:150,sodium:100,phosphorus:70,protein:3}},
  {id:4,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"CKD Pulav (No Potato, No Tomato)",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Kidney-safe pulav with cabbage, cauliflower, mint and aromatic spices. Very gentle on the kidneys.",topTip:"Rinse basmati rice 2-3 times. Use only a small portion of carrot (2-3 thin slices per serving).",ingredients:[{name:"Basmati White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Cabbage",amount:"0.75 cup",ckdRisk:"low"},{name:"Cauliflower florets",amount:"0.5 cup",ckdRisk:"low"},{name:"Carrot (small)",amount:"0.25 cup",ckdRisk:"low"},{name:"Onion",amount:"1 medium",ckdRisk:"low"},{name:"Mint leaves",amount:"2 tbsp",ckdRisk:"low"},{name:"Jeera, turmeric, coriander",amount:"1 tsp each",ckdRisk:"low"}],substitutions:[{original:"Potatoes",substitute:"Cauliflower florets",reduction:"Eliminates high-potassium ingredient"},{original:"Tomatoes",substitute:"Mint + spices",reduction:"Removes potassium and acidity risk"}],nutritionPerServing:{potassium:185,sodium:90,phosphorus:95,protein:5},nutritionAfterSwaps:{potassium:185,sodium:90,phosphorus:95,protein:5}},
  {id:5,savedAt:"Default",cuisine:"🇮🇳 Indian",dishName:"Upma",servings:3,safetyLevel:"safe",photo:null,dietitianNote:"Semolina-based upma is kidney-friendly with low-potassium vegetables.",topTip:"Add only cabbage, carrots. Avoid tomatoes or potatoes.",ingredients:[{name:"Semolina (Rava)",amount:"1 cup",ckdRisk:"low"},{name:"Cabbage",amount:"0.5 cup",ckdRisk:"low"},{name:"Carrot",amount:"0.25 cup",ckdRisk:"low"},{name:"Onion",amount:"0.5 cup",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:190,sodium:130,phosphorus:95,protein:5},nutritionAfterSwaps:{potassium:190,sodium:130,phosphorus:95,protein:5}},
  {id:6,savedAt:"Default",cuisine:"🇮🇹 Italian",dishName:"Pasta Aglio e Olio",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Simple garlic and olive oil pasta — no tomato sauce, low potassium.",topTip:"Use white pasta (not whole wheat) to keep phosphorus lower.",ingredients:[{name:"White Pasta",amount:"200g",ckdRisk:"low"},{name:"Olive Oil",amount:"3 tbsp",ckdRisk:"low"},{name:"Garlic",amount:"3 cloves",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:130,sodium:80,phosphorus:90,protein:7},nutritionAfterSwaps:{potassium:130,sodium:80,phosphorus:90,protein:7}},
  {id:7,savedAt:"Default",cuisine:"🇮🇹 Italian",dishName:"Margherita Pizza (Modified)",servings:4,safetyLevel:"caution",photo:null,dietitianNote:"Use thin crust, minimal sauce and small amount of mozzarella.",topTip:"2 tbsp tomato sauce max, 1 oz mozzarella per slice. Add zucchini and bell peppers.",ingredients:[{name:"Pizza dough (white)",amount:"1 base",ckdRisk:"low"},{name:"Tomato sauce",amount:"3 tbsp",ckdRisk:"medium"},{name:"Mozzarella",amount:"50g",ckdRisk:"medium"}],substitutions:[{original:"Heavy tomato sauce",substitute:"2 tbsp thin spread",reduction:"Reduces potassium by ~40%"}],nutritionPerServing:{potassium:290,sodium:420,phosphorus:180,protein:10},nutritionAfterSwaps:{potassium:200,sodium:280,phosphorus:130,protein:8}},
  {id:8,savedAt:"Default",cuisine:"🇲🇽 Mexican",dishName:"Cauliflower Tacos",servings:3,safetyLevel:"safe",photo:null,dietitianNote:"Excellent CKD alternative to bean tacos. Cauliflower is low in potassium.",topTip:"Roast cauliflower with cumin and paprika. Serve in corn tortillas with cabbage.",ingredients:[{name:"Cauliflower",amount:"2 cups",ckdRisk:"low"},{name:"Corn tortillas",amount:"6 small",ckdRisk:"low"},{name:"Cabbage",amount:"0.5 cup",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:200,sodium:90,phosphorus:80,protein:4},nutritionAfterSwaps:{potassium:200,sodium:90,phosphorus:80,protein:4}},
  {id:9,savedAt:"Default",cuisine:"🇲🇽 Mexican",dishName:"Veggie Quesadilla",servings:2,safetyLevel:"safe",photo:null,dietitianNote:"Simple quesadilla with low-potassium vegetables. Avoid black beans.",topTip:"Fill with bell peppers and zucchini. Skip sour cream or use 1 tsp only.",ingredients:[{name:"White flour tortilla",amount:"2 large",ckdRisk:"low"},{name:"Mozzarella",amount:"40g",ckdRisk:"medium"},{name:"Bell pepper",amount:"0.5 cup",ckdRisk:"low"},{name:"Zucchini",amount:"0.5 cup",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:220,sodium:260,phosphorus:140,protein:9},nutritionAfterSwaps:{potassium:220,sodium:260,phosphorus:140,protein:9}},
  {id:10,savedAt:"Default",cuisine:"🇨🇳 Chinese",dishName:"Steamed Rice with Bok Choy",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"One of the safest CKD meals. Low in all four nutrients of concern.",topTip:"Blanch bok choy briefly and discard water. Use low-sodium soy sauce only.",ingredients:[{name:"White Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Bok Choy",amount:"2 cups",ckdRisk:"low"},{name:"Garlic",amount:"1 clove",ckdRisk:"low"}],substitutions:[{original:"Regular soy sauce",substitute:"Low-sodium soy sauce (1 tsp)",reduction:"Reduces sodium by ~50%"}],nutritionPerServing:{potassium:170,sodium:110,phosphorus:85,protein:5},nutritionAfterSwaps:{potassium:170,sodium:110,phosphorus:85,protein:5}},
  {id:11,savedAt:"Default",cuisine:"🇨🇳 Chinese",dishName:"Congee (Rice Porridge)",servings:4,safetyLevel:"safe",photo:null,dietitianNote:"Most kidney-friendly Chinese food. High water content dilutes nutrients.",topTip:"Cook 1 part rice to 8 parts water. Season with ginger and sesame oil only.",ingredients:[{name:"White Rice",amount:"0.5 cup",ckdRisk:"low"},{name:"Water",amount:"4 cups",ckdRisk:"low"},{name:"Ginger",amount:"1 slice",ckdRisk:"low"}],substitutions:[],nutritionPerServing:{potassium:60,sodium:15,phosphorus:30,protein:2},nutritionAfterSwaps:{potassium:60,sodium:15,phosphorus:30,protein:2}},
  {id:12,savedAt:"Default",cuisine:"🌍 Other",dishName:"Greek Salad (Modified)",servings:2,safetyLevel:"caution",photo:null,dietitianNote:"Rinse olives, use minimal feta, replace large tomatoes with 3 cherry tomatoes.",topTip:"Limit feta to 15g. Rinse olives to remove sodium.",ingredients:[{name:"Cucumber",amount:"1 cup",ckdRisk:"low"},{name:"Lettuce",amount:"1 cup",ckdRisk:"low"},{name:"Feta",amount:"15g",ckdRisk:"medium"},{name:"Olives (rinsed)",amount:"4 pieces",ckdRisk:"medium"}],substitutions:[{original:"Large tomatoes",substitute:"3 cherry tomatoes",reduction:"Reduces potassium by ~60%"}],nutritionPerServing:{potassium:180,sodium:220,phosphorus:85,protein:4},nutritionAfterSwaps:{potassium:180,sodium:220,phosphorus:85,protein:4}},
  {id:13,savedAt:"Default",cuisine:"🌍 Other",dishName:"Veggie Sushi Rolls",servings:3,safetyLevel:"safe",photo:null,dietitianNote:"Vegetarian sushi is kidney-friendly. Limit avocado and always use low-sodium soy sauce.",topTip:"Use low-sodium soy sauce, max 1 tsp. Avoid cream cheese rolls.",ingredients:[{name:"Sushi Rice",amount:"1.5 cups",ckdRisk:"low"},{name:"Nori sheets",amount:"4",ckdRisk:"low"},{name:"Cucumber",amount:"0.5 cup",ckdRisk:"low"},{name:"Avocado",amount:"0.25 small",ckdRisk:"medium"}],substitutions:[{original:"Regular soy sauce",substitute:"Low-sodium (1 tsp only)",reduction:"Reduces sodium by ~50%"}],nutritionPerServing:{potassium:180,sodium:120,phosphorus:80,protein:4},nutritionAfterSwaps:{potassium:180,sodium:120,phosphorus:80,protein:4}},
];

function RecipeLibrary({onBack}){
  const [recipes,setRecipes]=useState(()=>LS.get("ckd_library",LIB_DEFAULT));
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState("");
  const [cuisineF,setCuisineF]=useState("All");
  const [safetyF,setSafetyF]=useState("All");
  const [addMode,setAddMode]=useState(false);
  const [newDish,setNewDish]=useState("");
  const [newCuisine,setNewCuisine]=useState("🇮🇳 Indian");
  const [loading,setLoading]=useState(false);
  const [photo,setPhoto]=useState(null);
  const [photoPreview,setPhotoPreview]=useState(null);
  const fileRef=useRef();

  const save=(updated)=>{ setRecipes(updated); LS.set("ckd_library",updated); };

  const handlePhoto=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{ setPhoto(ev.target.result.split(",")[1]); setPhotoPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const addRecipe=async()=>{
    if(!newDish.trim()) return;
    setLoading(true);
    const msgs=photo
      ?[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:photo}},{type:"text",text:`Renal dietitian. Dish: "${newDish}", cuisine: ${newCuisine}. Return ONLY JSON: {"dishName":"string","safetyLevel":"safe"|"caution"|"avoid","ingredients":[{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high"}],"substitutions":[{"original":"string","substitute":"string","reduction":"string"}],"nutritionPerServing":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"nutritionAfterSwaps":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"dietitianNote":"string","topTip":"string"}`}]}]
      :[{role:"user",content:`Renal dietitian. Dish: "${newDish}", cuisine: ${newCuisine}. Return ONLY JSON: {"dishName":"string","safetyLevel":"safe"|"caution"|"avoid","ingredients":[{"name":"string","amount":"string","ckdRisk":"low"|"medium"|"high"}],"substitutions":[{"original":"string","substitute":"string","reduction":"string"}],"nutritionPerServing":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"nutritionAfterSwaps":{"potassium":number,"sodium":number,"phosphorus":number,"protein":number},"dietitianNote":"string","topTip":"string"}`}];
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:API_MODEL,max_tokens:1200,messages:msgs})});
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("")||"";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      const entry={...parsed,id:Date.now(),savedAt:new Date().toLocaleDateString(),cuisine:newCuisine,servings:4,photo:photoPreview||null};
      save([entry,...recipes]);
      setSelected(entry); setAddMode(false); setNewDish(""); setPhoto(null); setPhotoPreview(null);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const filtered=recipes.filter(r=>{
    return r.dishName?.toLowerCase().includes(search.toLowerCase())&&(cuisineF==="All"||r.cuisine===cuisineF)&&(safetyF==="All"||r.safetyLevel===safetyF);
  });

  if(selected) return(
    <div style={{minHeight:"100vh",background:"#0a0f0d",color:"#cce8d4",fontFamily:"'Outfit',sans-serif",paddingBottom:60}}>
      <TopBar onBack={()=>setSelected(null)} title={selected.dishName}/>
      <div style={{maxWidth:600,margin:"0 auto",padding:"16px"}}>
        {selected.photo&&<div style={{borderRadius:14,overflow:"hidden",marginBottom:14,maxHeight:200}}><img src={selected.photo} alt={selected.dishName} style={{width:"100%",height:200,objectFit:"cover"}}/></div>}
        <div style={{background:"#162019",border:`1px solid ${LIB_SAFETY[selected.safetyLevel]?.color||"#3ddc72"}44`,borderRadius:14,padding:18,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"#edfaf2"}}>{selected.dishName}</div>
              <div style={{fontSize:11,color:"#527860",fontFamily:"monospace"}}>{selected.cuisine} · Serves {selected.servings} · {selected.savedAt}</div>
            </div>
            <span style={{fontSize:11,color:LIB_SAFETY[selected.safetyLevel]?.color,background:LIB_SAFETY[selected.safetyLevel]?.bg,border:`1px solid ${LIB_SAFETY[selected.safetyLevel]?.color}44`,borderRadius:10,padding:"4px 12px",fontFamily:"monospace",fontWeight:700}}>{LIB_SAFETY[selected.safetyLevel]?.label}</span>
          </div>
          <p style={{margin:"0 0 14px",fontSize:13,color:"#cce8d4",lineHeight:1.7,background:"#0d1a10",borderRadius:10,padding:12}}>{selected.dietitianNote}</p>
          {NUTRIENTS.map(n=>{
            const v=selected.nutritionAfterSwaps?.[n]||selected.nutritionPerServing?.[n]||0;
            const max=n==="protein"?17:n==="phosphorus"?267:n==="sodium"?500:667;
            const pct=Math.min((v/max)*100,100); const col=v>max?"#f06060":pct>75?"#f0b429":"#3ddc72";
            return<div key={n} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase"}}>{N_LABELS[n]}</span>
                <span style={{fontSize:12,color:col,fontFamily:"monospace",fontWeight:700}}>{Math.round(v)}{N_UNITS[n]}</span>
              </div>
              <div style={{background:"#0d1a10",borderRadius:6,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:6}}/></div>
            </div>;
          })}
        </div>
        {selected.ingredients?.length>0&&(
          <div style={{background:"#162019",border:"1px solid #243528",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Ingredients</div>
            {selected.ingredients.map((ing,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<selected.ingredients.length-1?"1px solid #243528":"none"}}>
                <span style={{fontSize:14,color:"#cce8d4"}}>{ing.amount} {ing.name}</span>
                <div style={{width:8,height:8,borderRadius:"50%",background:getRiskColor(ing.ckdRisk)}}/>
              </div>
            ))}
          </div>
        )}
        {selected.substitutions?.length>0&&(
          <div style={{background:"#162019",border:"1px solid #243528",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>CKD-Safe Swaps</div>
            {selected.substitutions.map((sub,i)=>(
              <div key={i} style={{background:"#0d1a10",borderRadius:10,padding:12,marginBottom:8}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                  <span style={{color:"#f06060",fontFamily:"monospace",fontSize:13,textDecoration:"line-through"}}>{sub.original}</span>
                  <span style={{color:"#527860"}}>→</span>
                  <span style={{color:"#3ddc72",fontFamily:"monospace",fontSize:13,fontWeight:600}}>{sub.substitute}</span>
                </div>
                <div style={{fontSize:11,color:"#f0b429",fontFamily:"monospace"}}>💜 {sub.reduction}</div>
              </div>
            ))}
          </div>
        )}
        {selected.topTip&&<div style={{background:"#0d1a10",border:"1px solid #1a6e38",borderRadius:12,padding:14,marginBottom:14,display:"flex",gap:10}}><span>💡</span><p style={{margin:0,fontSize:13,color:"#cce8d4",lineHeight:1.6}}>{selected.topTip}</p></div>}
        <button onClick={()=>{save(recipes.filter(x=>x.id!==selected.id));setSelected(null);}} style={{width:"100%",background:"transparent",border:"1px solid #f0606055",borderRadius:12,padding:12,color:"#f06060",fontSize:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>🗑 Delete from Library</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#0a0f0d",color:"#cce8d4",fontFamily:"'Outfit',sans-serif",paddingBottom:60}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <TopBar onBack={onBack} title={`Recipe Library (${recipes.length})`}/>
      <div style={{maxWidth:680,margin:"0 auto",padding:"16px"}}>
        {!addMode?(
          <>
            <button onClick={()=>setAddMode(true)} style={{width:"100%",background:"#3ddc72",color:"#061008",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:14}}>+ Add New Recipe</button>
            <div style={{background:"#162019",border:"1px solid #243528",borderRadius:14,padding:14,marginBottom:14}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search recipes..."
                style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:10,padding:"10px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:10}}/>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,marginBottom:8}}>
                {LIB_CUISINES.map(c=><button key={c} onClick={()=>setCuisineF(c)} style={{background:cuisineF===c?"#3ddc72":"transparent",color:cuisineF===c?"#061008":"#527860",border:`1px solid ${cuisineF===c?"#3ddc72":"#243528"}`,borderRadius:20,padding:"4px 12px",fontSize:11,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"monospace",fontWeight:cuisineF===c?700:400}}>{c}</button>)}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["All","safe","caution","avoid"].map(s=>{const sm=LIB_SAFETY[s]; return<button key={s} onClick={()=>setSafetyF(s)} style={{background:safetyF===s?(sm?.bg||"#0d2015"):"transparent",color:safetyF===s?(sm?.color||"#3ddc72"):"#527860",border:`1px solid ${safetyF===s?(sm?.color||"#3ddc72"):"#243528"}`,borderRadius:20,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:"monospace",textTransform:"capitalize"}}>{s==="All"?"All Safety":sm?.label}</button>;})}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
              {filtered.map(r=>{const sm=LIB_SAFETY[r.safetyLevel]; return(
                <div key={r.id} onClick={()=>setSelected(r)} style={{background:"#162019",border:"1px solid #243528",borderRadius:14,overflow:"hidden",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#3ddc7266"} onMouseLeave={e=>e.currentTarget.style.borderColor="#243528"}>
                  <div style={{height:110,background:r.photo?"transparent":"linear-gradient(135deg,#1a3020,#0a1a10)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
                    {r.photo?<img src={r.photo} alt={r.dishName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{fontSize:36,opacity:0.4}}>🍽</div>}
                    <div style={{position:"absolute",top:8,right:8}}><span style={{fontSize:10,color:sm?.color,background:sm?.bg,border:`1px solid ${sm?.color}44`,borderRadius:10,padding:"2px 8px",fontFamily:"monospace"}}>{sm?.label}</span></div>
                  </div>
                  <div style={{padding:12}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#edfaf2",marginBottom:4,lineHeight:1.3}}>{r.dishName}</div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"#527860",fontFamily:"monospace"}}>{r.cuisine}</span>
                      <span style={{fontSize:10,color:"#527860",fontFamily:"monospace"}}>{r.savedAt}</span>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </>
        ):(
          <div style={{background:"#162019",border:"1px solid #243528",borderRadius:16,padding:20}}>
            <div style={{fontSize:16,fontWeight:700,color:"#edfaf2",marginBottom:16}}>Add New Recipe</div>
            <input value={newDish} onChange={e=>setNewDish(e.target.value)} placeholder="Dish name..."
              style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:10,padding:"12px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:12}}/>
            <select value={newCuisine} onChange={e=>setNewCuisine(e.target.value)} style={{width:"100%",background:"#0d1a10",border:"1px solid #243528",borderRadius:10,padding:"10px 14px",color:"#edfaf2",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",marginBottom:12}}>
              {LIB_CUISINES.filter(c=>c!=="All").map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed #243528",borderRadius:12,padding:20,textAlign:"center",cursor:"pointer",background:"#0d1a10",marginBottom:14}}>
              {photoPreview?<img src={photoPreview} alt="preview" style={{maxHeight:130,borderRadius:8,objectFit:"cover",width:"100%"}}/>:<div><div style={{fontSize:28,marginBottom:6}}>📷</div><div style={{fontSize:13,color:"#527860"}}>Tap to add a photo (optional)</div></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setAddMode(false)} style={{flex:1,background:"transparent",border:"1px solid #243528",borderRadius:10,padding:"12px",color:"#527860",fontSize:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
              <button onClick={addRecipe} disabled={loading||!newDish.trim()} style={{flex:2,background:loading?"#1a6e38":"#3ddc72",color:"#061008",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>{loading?"Analyzing...":"✓ Analyze & Save"}</button>
            </div>
            {loading&&<BounceDots color="#3ddc72"/>}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// CONSENT / FIRST LAUNCH SCREEN
// ══════════════════════════════════════════
function ConsentScreen({onAgree}){
  const [scrolled,setScrolled]=useState(false);
  const [checked,setChecked]=useState(false);

  return(
    <div style={{minHeight:"100vh",background:"#07100a",color:"#c8e8d0",fontFamily:"'Outfit',sans-serif",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:"radial-gradient(ellipse at 50% 0%,#1a3d22 0%,#07100a 80%)",padding:"36px 24px 24px",textAlign:"center",borderBottom:"1px solid #1e3324"}}>
        <div style={{fontSize:48,marginBottom:10}}>🫘</div>
        <h1 style={{margin:"0 0 6px",fontSize:"clamp(28px,7vw,42px)",fontWeight:900,color:"#edfaf2",letterSpacing:-1}}>
          Kidney<span style={{color:"#3ddc72"}}>Care</span>
        </h1>
        <p style={{color:"#527860",fontSize:14,margin:0}}>CKD Vegetarian Nutrition Guide</p>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 20px 0",maxWidth:520,margin:"0 auto",width:"100%"}}
        onScroll={e=>{ if(e.target.scrollTop+e.target.clientHeight>=e.target.scrollHeight-40) setScrolled(true); }}>

        {/* Medical disclaimer */}
        <div style={{background:"#1a1000",border:"2px solid #f0b429",borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
            <span style={{fontSize:22,flexShrink:0}}>⚕️</span>
            <div style={{fontSize:13,fontWeight:800,color:"#f0b429",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1}}>Medical Disclaimer</div>
          </div>
          <p style={{margin:0,fontSize:13,color:"#c8a840",lineHeight:1.8}}>
            KidneyCare is an <strong>informational tool only</strong>. It does not provide medical advice, diagnosis, or treatment. Content is for general information purposes and should not replace professional medical guidance.
          </p>
          <p style={{margin:"10px 0 0",fontSize:13,color:"#c8a840",lineHeight:1.8}}>
            <strong>Always consult your nephrologist, renal dietitian, or qualified healthcare professional</strong> before making any changes to your diet, medications, or treatment plan. Individual CKD management needs vary significantly.
          </p>
        </div>

        {/* What the app does */}
        <div style={{background:"#112115",border:"1px solid #1e3324",borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"#3ddc72",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>What KidneyCare Does</div>
          {[
            ["🔍","Provides general nutritional information about foods for CKD patients"],
            ["📋","Helps you log and track daily food intake for self-monitoring"],
            ["🔄","Suggests ingredient substitutions to reduce potassium, sodium and phosphorus"],
            ["📚","Maintains a personal library of kidney-friendly recipes"],
            ["⚠️","All nutritional values are estimates and may vary from actual food content"],
          ].map(([icon,text])=>(
            <div key={text} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
              <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
              <span style={{fontSize:13,color:"#c8e8d0",lineHeight:1.6}}>{text}</span>
            </div>
          ))}
        </div>

        {/* Data privacy */}
        <div style={{background:"#112115",border:"1px solid #1e3324",borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"#3ddc72",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Your Data & Privacy</div>
          {[
            ["🔒","All your data is stored only on this device. We never collect or see your personal health information."],
            ["🤖","Food queries are processed by Anthropic's Claude AI. No personal profile data is sent with these queries."],
            ["📥","You can export or delete all your data at any time from the Profile screen."],
            ["⚠️","Clearing your browser site data will permanently delete your KidneyCare data."],
          ].map(([icon,text])=>(
            <div key={text} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
              <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
              <span style={{fontSize:13,color:"#c8e8d0",lineHeight:1.6}}>{text}</span>
            </div>
          ))}
        </div>

        {/* Age restriction */}
        <div style={{background:"#112115",border:"1px solid #1e3324",borderRadius:14,padding:16,marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"#3ddc72",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Important</div>
          <p style={{margin:0,fontSize:13,color:"#c8e8d0",lineHeight:1.7}}>
            This app is intended for adults (18+) or minors under the supervision of a parent or guardian and qualified healthcare professional. It is designed to complement — not replace — professional medical care.
          </p>
        </div>
      </div>

      {/* Sticky bottom — checkbox + button */}
      <div style={{background:"#07100a",borderTop:"1px solid #1e3324",padding:"16px 20px 28px",maxWidth:520,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

        {/* Checkbox */}
        <div onClick={()=>setChecked(c=>!c)}
          style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14,cursor:"pointer",padding:"12px 14px",background:"#112115",borderRadius:12,border:`1px solid ${checked?"#3ddc72":"#1e3324"}`}}>
          <div style={{width:22,height:22,borderRadius:6,background:checked?"#3ddc72":"transparent",border:`2px solid ${checked?"#3ddc72":"#243528"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
            {checked&&<span style={{color:"#061008",fontSize:14,fontWeight:900}}>✓</span>}
          </div>
          <span style={{fontSize:13,color:"#c8e8d0",lineHeight:1.6}}>
            I understand that KidneyCare is for informational purposes only and is not a substitute for professional medical advice. I will consult my healthcare team before making dietary changes.
          </span>
        </div>

        <button onClick={()=>{ if(checked){ LS.set("ckd_consent","true"); onAgree(); }}}
          disabled={!checked}
          style={{width:"100%",background:checked?"#3ddc72":"#1e3324",color:checked?"#061008":"#527860",border:"none",borderRadius:12,padding:"16px",fontSize:16,fontWeight:800,cursor:checked?"pointer":"not-allowed",fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",marginBottom:8}}>
          {checked?"✓ I Agree — Open KidneyCare":"Tick the box above to continue"}
        </button>

        <p style={{margin:0,fontSize:11,color:"#527860",textAlign:"center",fontFamily:"monospace",lineHeight:1.6}}>
          Shown once. You can review our full privacy policy in the Profile screen.
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════
const HOME_FEATURES=[
  {id:"checker",icon:"🔍",title:"Food Safety\nChecker",desc:"Is this food safe for my kidneys?",color:"#3ddc72",glow:"#3ddc7230",tag:"Quick Check"},
  {id:"tracker",icon:"📋",title:"Daily Food\nTracker",desc:"Log meals & track nutrients daily.",color:"#40c8f0",glow:"#40c8f030",tag:"Track Today"},
  {id:"converter",icon:"🔄",title:"Recipe\nConverter",desc:"Get CKD-safe ingredient swaps.",color:"#a080f0",glow:"#a080f030",tag:"Modify Recipe"},
  {id:"library",icon:"📚",title:"Recipe\nLibrary",desc:"Browse your kidney-safe recipes.",color:"#f0c040",glow:"#f0c04030",tag:"13 Recipes"},
  {id:"planner",icon:"🗓",title:"Meal\nPlanner",desc:"Generate a full week of safe meals.",color:"#f06080",glow:"#f0608030",tag:"Coming Soon",soon:true},
  {id:"labs",icon:"🧪",title:"Lab\nTracker",desc:"Track bloodwork & diet trends.",color:"#60e8c0",glow:"#60e8c030",tag:"Coming Soon",soon:true},
];

const HOME_TIPS=[
  "💧 Double-boil potatoes and discard water to cut potassium by up to 50%",
  "🥦 Cauliflower is one of the safest vegetables for CKD — use it freely",
  "🍚 White rice is safer than brown rice for CKD — lower in phosphorus",
  "🌿 Fresh mint adds flavor to pulav without any kidney risk",
  "🧂 Use lemon juice instead of salt to add flavor with less sodium",
  "🫙 Rinse canned vegetables to reduce sodium by ~40%",
  "🍋 Leaching vegetables in water reduces potassium significantly",
  "🫚 Ghee and olive oil are both kidney-safe fats in small amounts",
];

function HomeScreen({onNavigate,profile,stage,limits}){
  const [tipIdx,setTipIdx]=useState(0);
  // stage and limits passed from App — always in sync with saved profile

  useEffect(()=>{
    const t=setInterval(()=>setTipIdx(i=>(i+1)%HOME_TIPS.length),20000);
    return()=>clearInterval(t);
  },[]);

  const stageColor=CKD_STAGES[stage]?.color||"#3ddc72";

  return(
    <div style={{minHeight:"100vh",background:"#07100a",color:"#c8e8d0",fontFamily:"'Outfit',sans-serif",paddingBottom:60}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`@keyframes ckdCardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes ckdTip{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{background:"radial-gradient(ellipse at 50% 0%,#1a3d22 0%,#07100a 70%)",borderBottom:"1px solid #1e3324",padding:"28px 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",maxWidth:600,margin:"0 auto"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#0d2015",border:"1px solid #1a6e38",borderRadius:20,padding:"4px 14px",marginBottom:10}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#3ddc72",boxShadow:"0 0 8px #3ddc72"}}/>
              <span style={{fontSize:11,color:"#3ddc72",fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase"}}>CKD · Vegetarian</span>
            </div>
            <h1 style={{margin:"0 0 2px",fontSize:"clamp(28px,7vw,44px)",fontWeight:900,color:"#edfaf2",lineHeight:1.1,letterSpacing:-1}}>
              Kidney<span style={{color:"#3ddc72"}}>Care</span>
            </h1>
            {profile.name&&<div style={{fontSize:14,color:"#527860",marginTop:4}}>Hello, {profile.name} 👋</div>}
          </div>
          {/* Profile button */}
          <div onClick={()=>onNavigate({screen:"profile",stage,limits})}
            style={{width:48,height:48,borderRadius:"50%",background:"#112115",border:`2px solid ${stageColor}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
            <span style={{fontSize:22}}>👤</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"16px"}}>
        {/* Tip */}
        <div key={tipIdx} style={{background:"#0d2015",border:"1px solid #1e3324",borderRadius:12,padding:"10px 14px",marginBottom:16,animation:"ckdTip 0.4s ease"}}>
          <span style={{fontSize:12,color:"#c8e8d0",lineHeight:1.6,fontFamily:"monospace"}}>{HOME_TIPS[tipIdx]}</span>
        </div>

        {/* Stage + limits */}
        <div style={{background:"#112115",border:`1px solid ${stageColor}33`,borderRadius:14,padding:14,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1}}>My CKD Stage</span>
            <span style={{fontSize:12,color:stageColor,fontFamily:"monospace",fontWeight:700,background:`${stageColor}18`,border:`1px solid ${stageColor}44`,borderRadius:10,padding:"3px 10px"}}>{stage} · GFR {CKD_STAGES[stage]?.gfr}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {NUTRIENTS.map(n=><div key={n} style={{background:"#0d1a10",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:800,color:stageColor,fontFamily:"monospace"}}>{limits[n]}{N_UNITS[n]}</div>
              <div style={{fontSize:9,color:"#527860",fontFamily:"monospace",textTransform:"uppercase"}}>{n==="phosphorus"?"Phos":n==="potassium"?"K":n==="protein"?"Pro":"Na"}/day</div>
            </div>)}
          </div>
          <div style={{marginTop:8,fontSize:11,color:"#527860",fontFamily:"monospace"}}>{CKD_STAGES[stage]?.note}</div>
        </div>

        {/* Feature grid */}
        <div style={{fontSize:11,color:"#527860",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Tools & Features</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {HOME_FEATURES.map((f,i)=>(
            <div key={f.id} onClick={()=>!f.soon&&onNavigate({screen:f.id,stage,limits})}
              style={{background:"#112115",border:"1px solid #1e3324",borderRadius:16,padding:"16px 14px",cursor:f.soon?"default":"pointer",opacity:f.soon?0.55:1,transition:"all 0.2s",animation:`ckdCardIn 0.5s ${i*0.07}s both ease-out`}}
              onMouseEnter={e=>{if(!f.soon){e.currentTarget.style.background="#172d1c";e.currentTarget.style.borderColor=f.color+"66";e.currentTarget.style.boxShadow=`0 0 18px ${f.glow}`;}}}
              onMouseLeave={e=>{e.currentTarget.style.background="#112115";e.currentTarget.style.borderColor="#1e3324";e.currentTarget.style.boxShadow="none";}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <span style={{fontSize:24}}>{f.icon}</span>
                <span style={{fontSize:10,fontFamily:"monospace",letterSpacing:1,color:f.soon?"#527860":f.color,background:f.soon?"transparent":`${f.color}18`,border:`1px solid ${f.soon?"#1e3324":f.color+"44"}`,borderRadius:10,padding:"2px 7px",textTransform:"uppercase"}}>{f.tag}</span>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:f.soon?"#527860":"#edfaf2",lineHeight:1.3,marginBottom:5,whiteSpace:"pre-line",fontFamily:"'Outfit',sans-serif"}}>{f.title}</div>
              <div style={{fontSize:12,color:"#527860",lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{marginTop:24,textAlign:"center",fontSize:11,color:"#527860",fontFamily:"monospace",lineHeight:1.8}}>
          <span style={{color:"#f0b429",fontWeight:700}}>⚕️ Not medical advice.</span> Always consult your nephrologist or renal dietitian before making dietary changes.<br/><br/>
          <span style={{color:"#1a6e38"}}>KidneyCare v2.0 · For informational purposes only</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════
export default function App(){
  const [consented,setConsented]=useState(()=>LS.get("ckd_consent",null)==="true");
  const [profile,setProfile]=useState(()=>LS.get("ckd_profile",DEFAULT_PROFILE));
  const [screen,setScreen]=useState("home");

  // Always derive stage and limits from profile — single source of truth
  const stage = profile.stage||"Stage 3";
  const limits = profile.useCustomLimits
    ? Object.fromEntries(NUTRIENTS.map(n=>[n,parseFloat(profile.customLimits?.[n])||CKD_STAGES[stage]?.[n]||0]))
    : CKD_STAGES[stage]||CKD_STAGES["Stage 3"];

  const handleSetProfile=(p)=>{
    if(p.photo) delete p.photo;
    const updated={...p};
    setProfile(updated);
    LS.set("ckd_profile",updated);
  };

  const navigate=({screen:s})=>setScreen(s);
  const goHome=()=>setScreen("home");

  if(!consented) return <ConsentScreen onAgree={()=>setConsented(true)}/>;

  return(
    <div>
      {screen==="home"      &&<HomeScreen onNavigate={navigate} profile={profile} stage={stage} limits={limits}/>}
      {screen==="profile"   &&<ProfileScreen onBack={goHome} profile={profile} setProfile={handleSetProfile}/>}
      {screen==="checker"   &&<FoodChecker   onBack={goHome} stage={stage} limits={limits}/>}
      {screen==="tracker"   &&<FoodTracker   onBack={goHome} stage={stage} limits={limits}/>}
      {screen==="converter" &&<RecipeConverter onBack={goHome} stage={stage} limits={limits}/>}
      {screen==="library"   &&<RecipeLibrary  onBack={goHome}/>}
      {screen==="planner"   &&(
        <div style={{minHeight:"100vh",background:"#07100a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:32,textAlign:"center"}}>
          <div style={{fontSize:48}}>🗓</div>
          <div style={{fontSize:20,fontWeight:800,color:"#edfaf2",fontFamily:"'Outfit',sans-serif"}}>Meal Planner — Coming Soon</div>
          <p style={{fontSize:14,color:"#527860",maxWidth:300,lineHeight:1.7}}>Generate a full week of CKD-safe vegetarian meal plans!</p>
          <button onClick={goHome} style={{background:"#3ddc72",color:"#061008",border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Back to Home</button>
        </div>
      )}
      {screen==="labs"      &&(
        <div style={{minHeight:"100vh",background:"#07100a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:32,textAlign:"center"}}>
          <div style={{fontSize:48}}>🧪</div>
          <div style={{fontSize:20,fontWeight:800,color:"#edfaf2",fontFamily:"'Outfit',sans-serif"}}>Lab Tracker — Coming Soon</div>
          <p style={{fontSize:14,color:"#527860",maxWidth:300,lineHeight:1.7}}>Log monthly bloodwork and visualize how diet affects your results.</p>
          <button onClick={goHome} style={{background:"#3ddc72",color:"#061008",border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Back to Home</button>
        </div>
      )}
    </div>
  );
}
