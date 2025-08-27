import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Save, Trash2, Upload, Download, FileText, Search, Trophy } from "lucide-react";

/* ============================================================
   STORAGE / HELPERS
   ============================================================ */
const STORAGE_KEY = "hit_joost_centered_v2";
const EX_DB_CACHE_KEY = "hit_exercise_db_cache_v1";
// Werkt op root of subpath:
const EX_DB_URL = `${import.meta.env.BASE_URL || "/"}all_exercises.json`;

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { workouts: [], settings: { unit: "kg" } };
  } catch {
    return { workouts: [], settings: { unit: "kg" } };
  }
}
function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}
function formatDateEU(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}
function toKg(unit, v) {
  const n = Number(v);
  if (!n && n !== 0) return 0;
  return unit === "lbs" ? n * KG_PER_LB : n;
}
function fromKg(unit, kg) {
  const n = Number(kg || 0);
  return unit === "lbs" ? n * LB_PER_KG : n;
}
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/* ============================================================
   PLAN
   ============================================================ */
const EXERCISE_PLAN = {
  day1: {
    name: "Dag 1 – Legs + Calves + Abs",
    exercises: [
      { name: "Squat (Free Weights)", note: "1 werkset 6–10" },
      { name: "Leg Press (Machine)", note: "1 werkset 8–12 + 1–2 dropsets" },
      { name: "Romanian Deadlift (Free Weights)", note: "1 werkset 6–10" },
      { name: "Lying Leg Curl (Machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Standing Calf Raise (Machine)", note: "1 werkset 10–15 + 2 dropsets" },
      { name: "Hanging Leg Raise (Bodyweight)", note: "1 set tot falen (10–20)" },
      { name: "Ab Wheel Rollout (Bodyweight)", note: "1 set 8–12" },
    ],
  },
  day2: {
    name: "Dag 2 – Upper Body",
    exercises: [
      { name: "Barbell Bench Press (Free Weights)", note: "1 werkset 6–10" },
      { name: "Lat Pulldown (Machine)", note: "1 werkset 6–10" },
      { name: "Incline Chest Press (Machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Seated Row (Machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Pec Deck Fly (Machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Barbell Curl (Free Weights)", note: "1 werkset 6–10" },
      { name: "Rope Pushdown (Machine)", note: "1 werkset 8–12 + dropset" },
    ],
  },
  day3: {
    name: "Dag 3 – Shoulders + Calves + Cardio",
    exercises: [
      { name: "Barbell Overhead Press (Free Weights)", note: "1 werkset 6–10" },
      { name: "Lateral Raise (Machine)", note: "1 werkset 10–12 + dropset" },
      { name: "Rear Delt Fly (Machine)", note: "1 werkset 10–12 + dropset" },
      { name: "Upright Row (Free Weights)", note: "1 werkset 6–10" },
      { name: "Seated Calf Raise (Machine)", note: "1 werkset 12–15 + dropset" },
      { name: "Ab Coaster (Machine)", note: "3 sets tot falen" },
      { name: "Hanging Leg Raise (Bodyweight)", note: "2 sets tot falen" },
      { name: "Steady State Cardio", note: "30–40 min zone 2" },
    ],
  },
  day4: {
    name: "Dag 4 – Cardio / Active Recovery",
    exercises: [
      { name: "Steady State Cardio", note: "45–60 min zone 2" },
      { name: "Core stabiliteit (Pallof Press) (Machine)", note: "optioneel" },
    ],
  },
};
const dayOptions = [
  { key: "day1", label: EXERCISE_PLAN.day1.name },
  { key: "day2", label: EXERCISE_PLAN.day2.name },
  { key: "day3", label: EXERCISE_PLAN.day3.name },
  { key: "day4", label: EXERCISE_PLAN.day4.name },
];

/* ============================================================
   DYNAMISCHE OEFENINGEN-DB
   ============================================================ */
const FALLBACK_EXERCISES = [
  "Barbell Back Squat (Free Weights)","Leg Press (Machine)","Romanian Deadlift (Free Weights)",
  "Barbell Bench Press (Free Weights)","Lat Pulldown (Machine)","Seated Row (Machine)",
  "Barbell Overhead Press (Free Weights)","Lateral Raise (Machine)","Seated Calf Raise (Machine)",
  "Hanging Leg Raise (Bodyweight)","Ab Wheel Rollout (Bodyweight)","Cable Crunch (Machine)"
];

function useExerciseDB(data) {
  const [base, setBase] = useState(FALLBACK_EXERCISES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // cache eerst
  useEffect(() => {
    try {
      const cachedRaw = localStorage.getItem(EX_DB_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.version && Array.isArray(cached?.exercises)) {
          setBase(cached.exercises);
          setLoading(false);
        }
      }
    } catch {}
  }, []);

  // vervolgens vers opvragen
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(EX_DB_URL, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json?.exercises)) throw new Error("Ongeldige JSON");
        const uniq = Array.from(new Set(json.exercises.map(s => s.trim()))).sort();
        setBase(uniq);
        localStorage.setItem(EX_DB_CACHE_KEY, JSON.stringify({ version: json.version || 1, exercises: uniq }));
        setError(null);
      } catch (e) {
        if (!localStorage.getItem(EX_DB_CACHE_KEY)) {
          setBase(FALLBACK_EXERCISES);
        }
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // merge met gelogde namen
  const merged = useMemo(() => {
    const names = new Set(base);
    (data?.workouts || []).forEach(w => (w.sets || []).forEach(s => names.add(s.name)));
    return Array.from(names).sort();
  }, [base, data]);

  return { exercises: merged, loading, error };
}

/* ============================================================
   PROGRESSIE HULPFUNCTIES (met lange-termijn trend)
   ============================================================ */
function monthKey(isoDate){ const d=new Date(isoDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function average(arr){ if(!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }

function computeExerciseStats(data, unit, exerciseName){
  const pts = [];
  for(const w of data.workouts||[]){
    const s=(w.sets||[]).find(s=>s.name===exerciseName && s.weightKg!=null);
    if(s) pts.push({date:w.date, weight: Math.round(fromKg(unit, s.weightKg)*100)/100});
  }
  pts.sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(pts.length===0) return null;

  const current = pts[pts.length-1].weight;
  const start   = pts[0].weight;
  const deltaAbs = +(current - start).toFixed(2);

  // Per-maand gemiddelden (voor maandtrend)
  const byMonth = new Map();
  for(const p of pts){
    const mk = monthKey(p.date);
    if(!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk).push(p.weight);
  }
  const months = Array.from(byMonth.keys()).sort(); // YYYY-MM
  const lastMonth = months[months.length-1];
  const prevMonth = months.length>=2 ? months[months.length-2] : null;

  const avgLast = lastMonth ? average(byMonth.get(lastMonth)) : null;
  const avgPrev = prevMonth ? average(byMonth.get(prevMonth)) : null;

  let trendPct = null;
  if(avgLast!=null && avgPrev!=null && avgPrev>0){
    trendPct = +(((avgLast-avgPrev)/avgPrev)*100).toFixed(1);
  }

  // Recente trend (laatste 2–4 punten)
  const recent = pts.slice(-4).map(p=>p.weight);
  let recentTrend = "stabiel";
  if(recent.length>=2){
    const first = recent[0], last = recent[recent.length-1];
    const change = last-first;
    const absPct = first>0? Math.abs(change/first)*100 : Math.abs(change);
    if(change>0 && absPct>=2) recentTrend="stijgend";
    else if(change<0 && absPct>=2) recentTrend="dalend";
  }

  // Lange-termijn trend t.o.v. eerste meting
  let longTermTrend = "stabiel";
  let longTermPct = null;
  if(start>0){
    longTermPct = +(((current-start)/start)*100).toFixed(1);
    if(longTermPct>2) longTermTrend="stijgend";
    else if(longTermPct<-2) longTermTrend="dalend";
  }

  return {
    current, start, deltaAbs, trendPct, recentTrend,
    longTermTrend, longTermPct,
    lastMonth, prevMonth,
    avgLast: avgLast!=null? +avgLast.toFixed(2):null,
    avgPrev: avgPrev!=null? +avgPrev.toFixed(2):null
  };
}

// Dashboard: top N maand-delta’s (absolute waarde aflopend)
function computeMonthlyDeltas(data, unit){
  const byExercise = new Map();
  for(const w of data.workouts||[]){
    for(const s of w.sets||[]){
      if(s.weightKg==null) continue;
      const arr = byExercise.get(s.name) || [];
      arr.push({date:w.date, weight: Math.round(fromKg(unit, s.weightKg)*100)/100});
      byExercise.set(s.name, arr);
    }
  }

  const rows = [];
  byExercise.forEach((arr,name)=>{
    arr.sort((a,b)=>new Date(a.date)-new Date(b.date));
    const buckets = new Map(); // month -> [weights]
    for(const p of arr){
      const mk = monthKey(p.date);
      if(!buckets.has(mk)) buckets.set(mk, []);
      buckets.get(mk).push(p.weight);
    }
    const months = Array.from(buckets.keys()).sort();
    const last = months[months.length-1];
    const prev = months.length>=2 ? months[months.length-2] : null;
    const avgLast = last? average(buckets.get(last)) : null;
    const avgPrev = prev? average(buckets.get(prev)) : null;
    const delta   = (avgLast!=null && avgPrev!=null)? +(avgLast-avgPrev).toFixed(2) : null;
    if(delta!=null) rows.push({name, delta});
  });

  rows.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  return rows;
}

/* ============================================================
   PR-DETECTOR
   ============================================================ */
// Geef per oefening de volledige reeks PR-events (telkens wanneer een nieuw hoogste gewicht wordt gezet)
function computeAllPREvents(data, unit){
  const byExercise = new Map();
  for(const w of data.workouts||[]){
    for(const s of w.sets||[]){
      if(s.weightKg==null) continue;
      const weight = Math.round(fromKg(unit, s.weightKg)*100)/100;
      const arr = byExercise.get(s.name) || [];
      arr.push({date:w.date, weight});
      byExercise.set(s.name, arr);
    }
  }

  const allEvents = [];
  byExercise.forEach((arr, name)=>{
    arr.sort((a,b)=>new Date(a.date)-new Date(b.date));
    let best = -Infinity;
    let prevBest = null;
    for(const p of arr){
      if(p.weight>best){
        const delta = (best===-Infinity) ? null : +(p.weight - best).toFixed(2);
        const event = {
          name,
          date: p.date,
          weight: p.weight,
          prevBest: (best===-Infinity)? null : best,
          delta
        };
        allEvents.push(event);
        prevBest = (best===-Infinity)? null : best;
        best = p.weight;
      }
    }
  });

  // Sorteer alle PR-events (laatste eerst)
  allEvents.sort((a,b)=>new Date(b.date)-new Date(a.date));
  return allEvents;
}

// Huidige PR voor specifieke oefening
function getExercisePR(data, unit, exerciseName){
  const events = computeAllPREvents(data, unit).filter(e=> e.name===exerciseName);
  if(!events.length) return null;
  const last = events[events.length-1]; // laatste in tijd is huidige PR
  return { bestWeight:last.weight, bestDate:last.date };
}

// Recente PR’s binnen X dagen (default 45) — uniek per oefening (laatste event per oefening binnen venster)
function computeRecentPRs(data, unit, days=45){
  const events = computeAllPREvents(data, unit);
  if(!events.length) return [];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);

  const perExercise = new Map();
  for(const e of events){
    if(new Date(e.date) >= cutoff){
      // neem de meest recente event per oefening
      if(!perExercise.has(e.name)) perExercise.set(e.name, e);
      else {
        const curr = perExercise.get(e.name);
        if(new Date(e.date) > new Date(curr.date)) perExercise.set(e.name, e);
      }
    }
  }

  const recent = Array.from(perExercise.values());
  recent.sort((a,b)=>new Date(b.date)-new Date(a.date));
  return recent;
}

/* ============================================================
   MOTIVATION (30 varianten)
   ============================================================ */
const MOTIVATION = [
  "Blijf vlammen — progressie is progressie.",
  "Elke rep telt. Gas erop.",
  "Sterk én scherp. Op naar de volgende PR.",
  "Discipline wint van motivatie. Doorpakken.",
  "Het gaat de goede kant op — blijf bouwen.",
  "Rustig progressief — zo word je duurzaam sterker.",
  "Focus op techniek, het gewicht volgt.",
  "Zwaar is relatief. Jij wordt absoluut sterker.",
  "Kleine stappen, grote resultaten.",
  "Op weg naar je volgende PR — blijf knallen.",
  "Consistentie is je superkracht.",
  "Vandaag beter dan gisteren — klaar.",
  "Hou de basis strak, dan komt de rest vanzelf.",
  "Eén goede set kan je hele training maken.",
  "Tempo, vorm, focus — daarna pas gewicht.",
  "Herstel goed, groei beter.",
  "Je bent onderweg — blijf op koers.",
  "Geen shortcuts, wel vooruitgang.",
  "Kalm blijven, hard trainen.",
  "Progressie is geen toeval; het is een keuze.",
  "Je bent sterker dan je denkt.",
  "Elke set is een kans om te winnen.",
  "Morgen dankt jou voor wat je vandaag doet.",
  "Maak de rep — maak het verschil.",
  "Vertrouw het proces. Het werkt.",
  "Slijt de techniek, smeed de kracht.",
  "Hou het simpel, maak het zwaar.",
  "Weinig sets, veel intentie.",
  "Stap voor stap, kilo voor kilo.",
  "Blijf knallen — jij bepaalt het tempo."
];
function pickMotivation(){
  return MOTIVATION[Math.floor(Math.random()*MOTIVATION.length)];
}

/* ============================================================
   TOPBAR — logo midden-boven (home), dropdown rechts
   ============================================================ */
function TopBar({ current, onNavigate }) {
  return (
    <header className="hit-topbar">
      <div className="topbar-wrap">
        {/* Home / Logo (midden) */}
        <button
          onClick={() => onNavigate("start")}
          className="topbar-logo"
          aria-label="Home (HIT)"
          title="Home"
        >
          <img
            src="/unnamed-192.png"
            alt="HIT"
            className="logo-img neon-ring"
          />
          <span className="sr-only">Home</span>
        </button>

        {/* Dropdown (rechts) */}
        <div className="topbar-right">
          <select
            value={current}
            onChange={(e) => onNavigate(e.target.value)}
            className="select"
            aria-label="Navigatie"
          >
            <option value="start">Start</option>
            <option value="home">Workouts</option>
            <option value="exercises">Exercises</option>
            <option value="progress">Progressie</option>
            <option value="settings">Instellingen</option>
          </select>
        </div>
      </div>
    </header>
  );
}

/* Korte rotatie van bekende quotes (optioneel) */
const QUOTES = [
  { who: "Arnold Schwarzenegger", text: "The last three or four reps is what makes the muscle grow." },
  { who: "Mike Mentzer", text: "Hard work isn’t enough—training must be brief, intense and infrequent." },
];

/* ============================================================
   UI COMPONENTS
   ============================================================ */
function StartScreen({ onStartWorkout, onStartExercise, data, unit }){
  const [idx,setIdx]=useState(0);
  const q=QUOTES[idx];
  useEffect(()=>{ const id=setInterval(()=>setIdx(p=>(p+1)%QUOTES.length),10000); return ()=>clearInterval(id); },[]);

  // Top 3 maand-delta’s
  const monthly = useMemo(()=> computeMonthlyDeltas(data, unit).slice(0,3), [data, unit]);

  const statusText = useMemo(()=>{
    if(monthly.length===0) return "Nog geen data om samen te vatten.";
    const ups = monthly.filter(r=>r.delta>0).length;
    const downs = monthly.filter(r=>r.delta<0).length;
    if(ups && !downs) return "Sterker geworden in meerdere lifts.";
    if(ups && downs) return "Netto progressie — enkele lifts stijgen, andere even stabiel of licht omlaag.";
    return "Even stabiel — goede basis om door te bouwen.";
  },[monthly]);

  const motivation = useMemo(()=> pickMotivation(), [data?.workouts?.length]);

  // Recente PR's (laatste 45 dagen), max 5 tonen
  const recentPRs = useMemo(()=> computeRecentPRs(data, unit, 45).slice(0,5), [data, unit]);

  return (
    <div className="center-col">
      {/* Dashboard blok */}
      <div className="hit-card neon-border" style={{width:"100%"}}>
        <div className="font-semibold text-lg">📈 Mijn Progressie</div>
        <div style={{marginTop:8}}>
          {monthly.length>0 ? (
            <div>
              <div className="text-muted" style={{marginBottom:6}}>Progressie deze maand:</div>
              <ul style={{margin:0, paddingLeft:16}}>
                {monthly.map(r=>(
                  <li key={r.name} style={{marginBottom:4}}>
                    {r.name}: {r.delta>0? "+" : ""}{r.delta} {unit}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-muted">Nog te weinig data deze maand.</div>
          )}

          {/* Recente PR’s */}
          <div style={{marginTop:12}}>
            <div className="font-semibold" style={{display:"flex", alignItems:"center", gap:8}}>
              <Trophy className="icon accent" /> Recente PR’s
            </div>
            {recentPRs.length>0 ? (
              <ul style={{margin:6, paddingLeft:16}}>
                {recentPRs.map(pr=>(
                  <li key={`${pr.name}-${pr.date}`}>
                    {pr.name}: <strong>{pr.weight} {unit}</strong> • {formatDateEU(pr.date)}{typeof pr.delta==="number" ? `  (${pr.delta>0? "+" : ""}${pr.delta} ${unit})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted" style={{marginTop:4}}>Geen nieuwe PR’s in de laatste 45 dagen — jouw volgende is dichtbij.</div>
            )}
          </div>

          <div style={{marginTop:10}}><strong>Huidige status:</strong> {statusText}</div>
          <div style={{marginTop:6}}><strong>Vooruitblik:</strong> Op weg naar je volgende PR!</div>
          <div style={{marginTop:6}}>🔥 {motivation}</div>
        </div>
      </div>

      {/* Actieknoppen */}
      <button onClick={onStartWorkout} className="btn btn-primary neon">Start Workout</button>
      <button onClick={onStartExercise} className="btn btn-ghost neon-white">Start Exercise</button>

      {/* Quote blok */}
      <div className="hit-card neon-border" style={{marginTop:12}}>
        <blockquote className="text-2xl font-semibold leading-tight">“{q.text}”</blockquote>
        <p className="mt-2 text-muted">— {q.who}</p>
      </div>
    </div>
  );
}

function ExercisePicker({ onClose, onSelect, db }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return db.slice(0, 100);
    return db.filter(n => norm(n).includes(q)).slice(0, 100);
  }, [db, query]);
  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    return db.filter(n => norm(n).startsWith(q)).slice(0, 8);
  }, [db, query]);

  return (
    <div className="fixed inset-0 modal-overlay">
      <div className="hit-card neon-border" style={{ maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="text-lg font-semibold">Kies een oefening</h2>
        <div style={{ position: "relative" }}>
          <Search className="search-icon" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek…"
            className="input"
            style={{ paddingLeft: 36, marginTop: 8, marginBottom: 8 }}
          />
        </div>
        {suggestions.length > 0 && (
          <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
            Suggesties:{" "}
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => onSelect(s)} className="link">
                {s}
                {i < suggestions.length - 1 ? "," : ""}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {filtered.map(name => (
            <button key={name} onClick={() => onSelect(name)} className="list-item">{name}</button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={onClose} className="btn" style={{ maxWidth: 240 }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ data, onDelete, unit }) {
  if (!data.workouts.length) return <div className="text-muted">Nog geen workouts opgeslagen.</div>;
  return (
    <div style={{ display: "grid", gap: 12, width: "100%" }}>
      {data.workouts.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(w => (
        <div key={w.id} className="hit-card neon-border">
          <div style={{ fontWeight: 700 }}>{w.dayName}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{formatDateEU(w.date)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
            {w.sets.map((s, i) => {
              const display = s.weightKg != null ? `${Math.round(fromKg(unit, s.weightKg) * 100) / 100} ${unit}` : "—";
              return (
                <div key={i} className="list-item">
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  {s.note && <div className="text-muted" style={{ fontSize: 12 }}>{s.note}</div>}
                  <div style={{ marginTop: 4 }}>{display}{s.reps ? ` × ${s.reps}` : ""}</div>
                  {s.noteText && <div style={{ marginTop: 4 }}>{`📝 ${s.noteText}`}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => onDelete(w.id)} className="btn">Verwijderen <Trash2 className="icon" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkoutsScreen({ onPickDay, data, onDelete, unit }) {
  return (
    <div className="center-col">
      <div className="hit-card neon-border">
        <h1 className="text-xl font-semibold">Kies je workout</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
          {dayOptions.map(d => (
            <button key={d.key} onClick={() => onPickDay(d.key)} className="list-item">{d.label}</button>
          ))}
        </div>
      </div>

      <div className="hit-card neon-border">
        <h2 className="text-lg font-semibold">Mijn Workouts</h2>
        <HistoryList data={data} onDelete={onDelete} unit={unit} />
      </div>
    </div>
  );
}

function WorkoutForm({ dayKey, onSave, onCancel, unit, setUnit, customExerciseName }) {
  const plan = dayKey === "custom"
    ? { name: `Losse oefening – ${customExerciseName}`, exercises: [{ name: customExerciseName, note: "Log je werkset(ten)" }] }
    : EXERCISE_PLAN[dayKey];

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(() =>
    plan.exercises.map(ex => ({ name: ex.name, note: ex.note, weight: "", reps: "", done: false, noteText: "" }))
  );

  const toggleDone = (i) => setRows(r => r.map((row, idx) => (idx === i ? { ...row, done: !row.done } : row)));
  const updateField = (i, f, v) => setRows(r => r.map((row, idx) => (idx === i ? { ...row, [f]: v } : row)));

  const handleSave = () => onSave({
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    date, dayKey, dayName: plan.name, unitAtEntry: unit,
    sets: rows.map(s => ({
      name: s.name, note: s.note, done: s.done, reps: s.reps, noteText: s.noteText,
      enteredWeight: s.weight, weightKg: s.weight ? toKg(unit, s.weight) : null
    }))
  });

  return (
    <div className="fixed inset-0 modal-overlay">
      <div className="hit-card neon-border" style={{ maxWidth: 820, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>Datum (EU): {formatDateEU(date)}</p>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" style={{ maxWidth: 240 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setUnit("kg")} className={`btn ${unit === "kg" ? "btn-primary" : ""}`}>KG</button>
            <button onClick={() => setUnit("lbs")} className={`btn ${unit === "lbs" ? "btn-primary" : ""}`}>LBS</button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {rows.map((row, idx) => (
            <div key={idx} className="list-item" style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>{row.name}</div>
              {row.note && <div className="text-muted" style={{ fontSize: 12 }}>{row.note}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 520, justifyContent: "center" }}>
                  <input type="number" placeholder={`gewicht (${unit})`} inputMode="decimal" value={row.weight} onChange={(e) => updateField(idx, "weight", e.target.value)} className="input" />
                  <input type="number" placeholder="reps" inputMode="numeric" value={row.reps} onChange={(e) => updateField(idx, "reps", e.target.value)} className="input" />
                </div>
                <button onClick={() => toggleDone(idx)} className="btn">{row.done ? "✔️ Gedaan" : "Markeer gedaan"}</button>
              </div>
              <div className="note-row">
                <FileText className="icon accent" />
                <textarea
                  placeholder="Notitie (tempo, vorm, RIR, dropset-details…)"
                  value={row.noteText}
                  onChange={(e) => updateField(idx, "noteText", e.target.value)}
                  className="textarea"
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
          <button onClick={onCancel} className="btn">Annuleren</button>
          <button onClick={handleSave} className="btn btn-primary">
            <Save className="icon" /> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressView({ data, unit, db }){
  const [exercise,setExercise]=useState("");
  const [query,setQuery]=useState("");

  const allExercises=useMemo(()=> db || [], [db]);

  const suggestions=useMemo(()=>{ const q=norm(query); if(!q) return []; return allExercises.filter(n=>norm(n).startsWith(q)).slice(0,8); },[allExercises,query]);
  const filtered=useMemo(()=>{ const q=norm(query); if(!q) return allExercises.slice(0,80); return allExercises.filter(n=>norm(n).includes(q)).slice(0,80); },[allExercises,query]);

  const chartData=useMemo(()=>{
    if(!exercise) return [];
    const pts=[];
    for(const w of data.workouts){
      const m=(w.sets||[]).find(s=>s.name===exercise && s.weightKg!=null);
      if(m) pts.push({date:w.date, weight: Math.round(fromKg(unit,m.weightKg)*100)/100});
    }
    return pts.sort((a,b)=>new Date(a.date)-new Date(b.date));
  },[data,exercise,unit]);

  const best = chartData.length ? Math.max(...chartData.map(p=>p.weight)) : null;

  // Analyse met lange-termijn trend
  const stats = useMemo(()=> exercise? computeExerciseStats(data, unit, exercise) : null, [data, unit, exercise]);

  // PR-info (huidige PR + datum)
  const prInfo = useMemo(()=> exercise? getExercisePR(data, unit, exercise) : null, [data, unit, exercise]);

  const analysisText = useMemo(()=>{
    if(!stats) return "Selecteer een oefening om je voortgang te analyseren.";
    const parts = [];

    if(prInfo?.bestWeight){
      parts.push(`Huidige PR: ${prInfo.bestWeight} ${unit} op ${formatDateEU(prInfo.bestDate)}.`);
    }

    // Milestone sinds start
    if(stats.deltaAbs>0) parts.push(`Sinds start ben je +${stats.deltaAbs} ${unit} vooruit gegaan.`);
    else if(stats.deltaAbs<0) parts.push(`Sinds start is het -${Math.abs(stats.deltaAbs)} ${unit}. Komt goed — focus op vorm en herstel.`);
    else parts.push("Sinds start ben je stabiel in gewicht. Tijd om het trainingsplan te prikkelen.");

    // Lange-termijn trend (percentage)
    if(stats.longTermPct!=null){
      if(stats.longTermPct>0) parts.push(`T.o.v. je allereerste meting sta je nu gemiddeld +${stats.longTermPct}% (${stats.longTermTrend}).`);
      else if(stats.longTermPct<0) parts.push(`T.o.v. je allereerste meting is het -${Math.abs(stats.longTermPct)}% (${stats.longTermTrend}). Rustig bijsturen en doorpakken.`);
      else parts.push("Vergeleken met je allereerste meting sta je gelijk — solide basis om te versnellen.");
    }

    // Maandtrend
    if(stats.trendPct!=null){
      if(stats.trendPct>0) parts.push(`Deze maand gemiddeld ${stats.trendPct}% zwaarder dan vorige maand.`);
      else if(stats.trendPct<0) parts.push(`Deze maand gemiddeld ${Math.abs(stats.trendPct)}% lichter dan vorige maand — mogelijk deload of vermoeidheid.`);
      else parts.push("Deze maand gelijk aan vorige maand — consistentie is key.");
    }else{
      parts.push("Nog te weinig data voor een maandvergelijking.");
    }

    // Recent trend positief framen
    if(stats.recentTrend==="stijgend") parts.push("Lijn is stijgend — op weg naar je volgende PR!");
    else if(stats.recentTrend==="dalend") parts.push("Even wat terugval — rustig bijsturen met techniek en herstel.");
    else parts.push("Even stabiel — perfecte basis om door te pakken.");

    return parts.join(" ");
  },[stats, unit, prInfo]);

  return (
    <div className="center-col">
      <div className="hit-card neon-border">
        <div className="font-semibold text-lg">Progressie</div>

        <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap"}}>
          <div style={{position:"relative", width:"100%", maxWidth:520}}>
            <Search className="search-icon" />
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Zoek een oefening…" className="input" style={{paddingLeft:36}}/>
          </div>
          <button onClick={()=>{
            if(query){
              const exact=allExercises.find(n=>norm(n)===norm(query));
              const pick= exact || suggestions[0] || filtered[0] || "";
              setExercise(pick||"");
            }
          }} className="btn btn-primary">Kies</button>
        </div>

        {suggestions.length>0 && (
          <div className="text-sm text-muted" style={{marginTop:8}}>
            Suggesties:{" "}
            {suggestions.map((s,i)=>(
              <button key={s} onClick={()=>{ setExercise(s); setQuery(s); }} className="link">
                {s}{i<suggestions.length-1?",":""}
              </button>
            ))}
          </div>
        )}

        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:12}}>
          {filtered.map(name=>(
            <button key={name} onClick={()=>{ setExercise(name); setQuery(name); }} className="list-item">{name}</button>
          ))}
        </div>
      </div>

      {exercise ? (
        <div className="hit-card neon-border" style={{display:"grid", gap:12}}>
          <div className="chart-card neon-border">
            <div style={{display:"flex", justifyContent:"center", gap:8, marginBottom:8}}>
              <div className="font-semibold">{exercise}</div>
              {best!=null && <div className="text-muted">(beste: {best.toFixed(2)} {unit})</div>}
            </div>
            <div style={{width:"100%", height:288}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v)=>formatDateEU(v)} />
                  <YAxis tickFormatter={(v)=>`${v}${unit}`} />
                  <Tooltip formatter={(v)=>`${v} ${unit}`} labelFormatter={(l)=>formatDateEU(l)} />
                  <Line type="monotone" dataKey="weight" stroke="#ff1744" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tekstuele analyse */}
          <div className="hit-card neon-border">
            <div className="font-semibold">Analyse</div>
            <div style={{marginTop:6}}>{analysisText}</div>
          </div>
        </div>
      ) : (
        <div className="text-muted">Kies een oefening via de zoekbalk of lijst om je progressie te zien.</div>
      )}
    </div>
  );
}

/* ============================================================
   ROOT
   ============================================================ */
function App() {
  const [screen, setScreen] = useState("start");
  const [data, setData] = useState(() => loadData());
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState(null);
  const [dayForForm, setDayForForm] = useState(null);

  useEffect(() => { saveData(data); }, [data]);
  useEffect(() => { registerServiceWorker(); }, []);

  const unit = data.settings?.unit || "kg";
  const setUnit = (unitNext) => {
    const next = { ...data, settings: { ...(data.settings || {}), unit: unitNext } };
    setData(next); saveData(next);
  };

  // DB
  const { exercises: exerciseDB, loading: dbLoading, error: dbError } = useExerciseDB(data);

  const handleNavigate = (value) => {
    if (value === "exercises") { setScreen("start"); setShowExercisePicker(true); return; }
    setScreen(value);
  };

  const openDayPicker = () => setShowDayPicker(true);
  const openExercisePicker = () => setShowExercisePicker(true);

  const pickDay = (key) => { setDayForForm(key); setShowDayPicker(false); };
  const selectExercise = (name) => { setCustomExerciseName(name); setDayForForm("custom"); setShowExercisePicker(false); };

  const handleSaveWorkout = (payload) => {
    setData(prev => ({ ...prev, workouts: [...prev.workouts, payload] }));
    setDayForForm(null); setCustomExerciseName(null);
  };
  const handleDeleteWorkout = (id) =>
    setData(prev => ({ ...prev, workouts: prev.workouts.filter(w => w.id !== id) }));

  return (
    <div className="min-h-screen app-bg">
      <TopBar current={screen} onNavigate={handleNavigate} />
      <main>
        {screen === "start" && (
          <StartScreen
            onStartWorkout={openDayPicker}
            onStartExercise={openExercisePicker}
            data={data}
            unit={unit}
          />
        )}
        {screen === "home" && <WorkoutsScreen onPickDay={pickDay} data={data} onDelete={handleDeleteWorkout} unit={unit} />}
        {screen === "progress" && <ProgressView data={data} unit={unit} db={exerciseDB} />}
        {screen === "settings" && <Settings data={data} setData={setData} />}

        <div style={{ marginTop: 12, textAlign: "center" }} className="text-muted">
          {dbLoading ? "Oefeningendatabase laden…" : dbError ? "Kon oefeningendatabase niet verversen — gebruik cache/fallback." : ""}
        </div>
      </main>

      {showDayPicker && (
        <div className="fixed inset-0 modal-overlay">
          <div className="hit-card neon-border" style={{ maxWidth: 520 }}>
            <h2 className="text-lg font-semibold">Kies je dag</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
              {dayOptions.map(d => (
                <button key={d.key} onClick={() => pickDay(d.key)} className="list-item">{d.label}</button>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setShowDayPicker(false)} className="btn">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {showExercisePicker && (
        <ExercisePicker
          db={exerciseDB}
          onSelect={selectExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      )}

      {dayForForm && (
        <WorkoutForm
          dayKey={dayForForm}
          customExerciseName={customExerciseName}
          onSave={handleSaveWorkout}
          onCancel={() => { setDayForForm(null); setCustomExerciseName(null); }}
          unit={unit}
          setUnit={setUnit}
        />
      )}
    </div>
  );
}

/* ============================================================
   SETTINGS
   ============================================================ */
function Settings({ data, setData }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hit_joost_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = () => { try {
      const json = JSON.parse(reader.result);
      setData(json); saveData(json);
    } catch { alert("Ongeldig backup bestand"); } };
    reader.readAsText(file);
  };
  const clearAll = () => {
    if (confirm("Alles verwijderen?")) {
      const empty = { workouts: [], settings: { unit: data.settings?.unit || "kg" } };
      setData(empty); saveData(empty);
    }
  };

  return (
    <div className="center-col">
      <div className="hit-card neon-border">
        <div className="font-semibold mb-1">Backup</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={exportData} className="btn"><Download className="icon" /> Export</button>
          <label className="btn" style={{ cursor: "pointer" }}>
            <Upload className="icon" /> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="hit-card neon-border">
        <div className="font-semibold mb-2">Data</div>
        <button onClick={clearAll} className="btn">Alles wissen</button>
      </div>
    </div>
  );
}

/* ============================================================
   EXPORT (enige export)
   ============================================================ */
export default App;
