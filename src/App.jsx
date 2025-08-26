import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Save, Trash2, Upload, Download, FileText, Search } from "lucide-react";

/* =============================================================
   STORAGE / UNITS / HELPERS
   ============================================================= */
const STORAGE_KEY = "hit_joost_centered_v2";
const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

function registerServiceWorker(){ if("serviceWorker" in navigator){ navigator.serviceWorker.register("/sw.js").catch(()=>{}); } }
function loadData(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw):{workouts:[], settings:{unit:"kg"}} }catch{ return {workouts:[], settings:{unit:"kg"}} }
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
function formatDateEU(d){ const dt=new Date(d); const dd=String(dt.getDate()).padStart(2,"0"); const mm=String(dt.getMonth()+1).padStart(2,"0"); return `${dd}-${mm}-${dt.getFullYear()}`; }
function toKg(unit,v){ const n=Number(v); if(!n && n!==0) return 0; return unit==="lbs"? n*KG_PER_LB: n; }
function fromKg(unit,kg){ const n=Number(kg||0); return unit==="lbs"? n*LB_PER_KG: n; }
const norm=(s)=>s.toLowerCase().replace(/\s+/g," ").trim();

/* =============================================================
   EXERCISE PLAN (blijft zoals je had — kan je zelf finetunen)
   ============================================================= */
const EXERCISE_PLAN={
  day1:{name:"Dag 1 – Legs + Calves + Abs",exercises:[
    {name:"Squat (Free Weights)",note:"1 werkset 6–10"},
    {name:"Leg Press (Machine)",note:"1 werkset 8–12 + 1–2 dropsets"},
    {name:"Romanian Deadlift (Free Weights)",note:"1 werkset 6–10"},
    {name:"Lying Leg Curl (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Standing Calf Raise (Machine)",note:"1 werkset 10–15 + 2 dropsets"},
    {name:"Hanging Leg Raise (Bodyweight)",note:"1 set tot falen (10–20)"},
    {name:"Ab Wheel Rollout (Bodyweight)",note:"1 set 8–12"}
  ]},
  day2:{name:"Dag 2 – Upper Body",exercises:[
    {name:"Barbell Bench Press (Free Weights)",note:"1 werkset 6–10"},
    {name:"Lat Pulldown (Machine)",note:"1 werkset 6–10"},
    {name:"Incline Chest Press (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Seated Row (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Pec Deck Fly (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Barbell Curl (Free Weights)",note:"1 werkset 6–10"},
    {name:"Rope Pushdown (Machine)",note:"1 werkset 8–12 + dropset"}
  ]},
  day3:{name:"Dag 3 – Shoulders + Calves + Cardio",exercises:[
    {name:"Barbell Overhead Press (Free Weights)",note:"1 werkset 6–10"},
    {name:"Lateral Raise (Machine)",note:"1 werkset 10–12 + dropset"},
    {name:"Rear Delt Fly (Machine)",note:"1 werkset 10–12 + dropset"},
    {name:"Upright Row (Free Weights)",note:"1 werkset 6–10"},
    {name:"Seated Calf Raise (Machine)",note:"1 werkset 12–15 + dropset"},
    {name:"Ab Coaster (Machine)",note:"3 sets tot falen"},
    {name:"Hanging Leg Raise (Bodyweight)",note:"2 sets tot falen"},
    {name:"Steady State Cardio",note:"30–40 min zone 2"}
  ]},
  day4:{name:"Dag 4 – Cardio / Active Recovery",exercises:[
    {name:"Steady State Cardio",note:"45–60 min zone 2"},
    {name:"Core stabiliteit (Pallof Press) (Machine)",note:"optioneel"}
  ]}
};
const dayOptions=[
  {key:"day1",label:EXERCISE_PLAN.day1.name},
  {key:"day2",label:EXERCISE_PLAN.day2.name},
  {key:"day3",label:EXERCISE_PLAN.day3.name},
  {key:"day4",label:EXERCISE_PLAN.day4.name},
];

/* =============================================================
   MASTER LIST ALL_EXERCISES — voorzien van (Machine)/(Free Weights)/(Bodyweight)
   Niet letterlijk "alles" op aarde, maar zeer compleet voor een commerciële gym.
   ============================================================= */
const ALL_EXERCISES = [
  // ── Lower body ───────────────────────────────────────────────
  "Barbell Back Squat (Free Weights)",
  "Front Squat (Free Weights)",
  "Box Squat (Free Weights)",
  "Overhead Squat (Free Weights)",
  "Romanian Deadlift (Free Weights)",
  "Conventional Deadlift (Free Weights)",
  "Sumo Deadlift (Free Weights)",
  "Deficit Deadlift (Free Weights)",
  "Trap Bar Deadlift (Free Weights)",
  "Barbell Good Morning (Free Weights)",
  "Barbell Lunge (Free Weights)",
  "Bulgarian Split Squat (Free Weights)",
  "Walking Lunge (Free Weights)",
  "Step-Up (Free Weights)",
  "Hip Thrust (Free Weights)",
  "Glute Bridge (Free Weights)",
  "Leg Press (Machine)",
  "Hack Squat (Machine)",
  "Smith Machine Squat (Machine)",
  "Smith Machine Lunge (Machine)",
  "Leg Extension (Machine)",
  "Lying Leg Curl (Machine)",
  "Seated Leg Curl (Machine)",
  "Standing Calf Raise (Machine)",
  "Seated Calf Raise (Machine)",
  "Hip Abduction (Machine)",
  "Hip Adduction (Machine)",
  "Glute Kickback (Machine)",

  // ── Chest ───────────────────────────────────────────────────
  "Barbell Bench Press (Free Weights)",
  "Incline Barbell Bench Press (Free Weights)",
  "Decline Barbell Bench Press (Free Weights)",
  "Close-Grip Barbell Bench Press (Free Weights)",
  "Dumbbell Bench Press (Free Weights)",
  "Incline Dumbbell Bench Press (Free Weights)",
  "Dumbbell Fly (Free Weights)",
  "Dumbbell Pullover (Free Weights)",
  "Chest Press (Machine)",
  "Incline Chest Press (Machine)",
  "Decline Chest Press (Machine)",
  "Pec Deck Fly (Machine)",
  "Cable Crossover (Machine)",

  // ── Back ────────────────────────────────────────────────────
  "Barbell Row (Free Weights)",
  "Pendlay Row (Free Weights)",
  "Yates Row (Free Weights)",
  "Dumbbell Row (Free Weights)",
  "T-Bar Row (Free Weights)",
  "Seal Row (Free Weights)",
  "Lat Pulldown (Machine)",
  "Close-Grip Pulldown (Machine)",
  "Straight Arm Pulldown (Machine)",
  "Seated Row (Machine)",
  "Chest-Supported Row (Machine)",
  "Assisted Pull-Up (Machine)",

  // ── Shoulders ───────────────────────────────────────────────
  "Barbell Overhead Press (Free Weights)",
  "Seated Barbell Press (Free Weights)",
  "Push Press (Free Weights)",
  "Dumbbell Shoulder Press (Free Weights)",
  "Arnold Press (Free Weights)",
  "Lateral Raise (Free Weights)",
  "Front Raise (Free Weights)",
  "Rear Delt Fly (Free Weights)",
  "Upright Row (Free Weights)",
  "Smith Machine Shoulder Press (Machine)",
  "Lateral Raise (Machine)",
  "Rear Delt Fly (Machine)",
  "Face Pull (Machine)",

  // ── Arms ────────────────────────────────────────────────────
  "Barbell Curl (Free Weights)",
  "EZ-Bar Curl (Free Weights)",
  "Dumbbell Curl (Free Weights)",
  "Incline Dumbbell Curl (Free Weights)",
  "Hammer Curl (Free Weights)",
  "Concentration Curl (Free Weights)",
  "Preacher Curl (Machine)",
  "Cable Curl (Machine)",
  "Reverse Curl (Machine)",
  "Skull Crusher (Free Weights)",
  "Overhead Dumbbell Extension (Free Weights)",
  "Close-Grip Bench Press (Free Weights)",
  "Tricep Pushdown (Machine)",
  "Overhead Cable Extension (Machine)",
  "Rope Pushdown (Machine)",
  "Cable Kickback (Machine)",

  // ── Core / Lower back ───────────────────────────────────────
  "Hanging Leg Raise (Bodyweight)",
  "Hanging Knee Raise (Bodyweight)",
  "Captain's Chair Leg Raise (Machine)",
  "Ab Coaster (Machine)",
  "Ab Crunch (Machine)",
  "Cable Crunch (Machine)",
  "Ab Wheel Rollout (Bodyweight)",
  "Plank (Bodyweight)",
  "Side Plank (Bodyweight)",
  "Pallof Press (Machine)",
  "Back Extension (Machine)",
  "Back Extension (Bodyweight)",

  // ── Bodyweight upper/lower ──────────────────────────────────
  "Pull-Up (Bodyweight)",
  "Chin-Up (Bodyweight)",
  "Push-Up (Bodyweight)",
  "Dips (Bodyweight)",
  "Handstand Push-Up (Bodyweight)",
  "Inverted Row (Bodyweight)",
  "Pistol Squat (Bodyweight)",
  "Bodyweight Lunge (Bodyweight)",
  "Wall Sit (Bodyweight)",

  // ── Olympic / power variants (Free Weights) ──────────────────
  "Power Clean (Free Weights)",
  "Clean and Press (Free Weights)",
  "Power Snatch (Free Weights)",
  "Push Jerk (Free Weights)"
];

/* =============================================================
   TOPBAR
   ============================================================= */
function TopBar({ current, onNavigate }) {
  return (
    <div className="hit-topbar">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>onNavigate("start")} className="flex items-center gap-3 min-w-0 group" aria-label="Home">
            <img src="/unnamed-192.png" alt="App logo" className="w-10 h-10 rounded-full object-cover" style={{border:"2px solid #b91c1c"}}/>
            <div className="app-title">High Intensity<br/>Training by Joost</div>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={current}
              onChange={(e)=>onNavigate(e.target.value)}
              className="select" aria-label="Navigatie" style={{width:180}}
            >
              <option value="start">Start</option>
              <option value="home">Workouts</option>
              <option value="exercises">Exercises</option>
              <option value="progress">Progressie</option>
              <option value="settings">Instellingen</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   QUOTES (kleine flair)
   ============================================================= */
const QUOTES=[
  {who:"Arnold Schwarzenegger",text:"The last three or four reps is what makes the muscle grow."},
  {who:"Arnold Schwarzenegger",text:"Strength does not come from winning. Your struggles develop your strengths."},
  {who:"Kris Gethin",text:"Discipline means doing what needs to be done even when you don’t feel like it."},
  {who:"Mike Mentzer",text:"Hard work isn’t enough—training must be brief, intense and infrequent."}
];

function StartScreen({ onStartWorkout, onStartExercise }){
  const [idx,setIdx]=useState(0);
  const q=QUOTES[idx];
  useEffect(()=>{ const id=setInterval(()=>setIdx(p=>(p+1)%QUOTES.length),10000); return ()=>clearInterval(id); },[]);
  return (
    <div className="center-col">
      <button onClick={onStartWorkout} className="btn btn-primary">Start Workout</button>
      <button onClick={onStartExercise} className="btn btn-ghost">Start Exercise</button>
      <div className="hit-card" style={{marginTop:12}}>
        <blockquote className="text-2xl font-semibold leading-tight">“{q.text}”</blockquote>
        <p className="mt-2 text-muted">— {q.who}</p>
      </div>
    </div>
  );
}

/* =============================================================
   EXERCISE PICKER — gebruikt nu de MASTER LIST (ALL_EXERCISES)
   met typeahead-suggesties.
   ============================================================= */
function ExercisePicker({ onClose, onSelect }){
  const builtIn = useMemo(()=> ALL_EXERCISES.slice().sort(), []);
  const [query,setQuery]=useState("");
  const filtered=useMemo(()=>{
    const q=norm(query); if(!q) return builtIn.slice(0,80);
    return builtIn.filter(n=>norm(n).includes(q)).slice(0,80);
  },[builtIn,query]);
  const suggestions=useMemo(()=>{
    const q=norm(query); if(!q) return [];
    return builtIn.filter(n=>norm(n).startsWith(q)).slice(0,8);
  },[builtIn,query]);

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-center justify-center p-4">
      <div className="hit-card" style={{maxWidth:720, maxHeight:"90vh", overflowY:"auto"}}>
        <h2 className="text-lg font-semibold">Kies een oefening</h2>
        <input autoFocus value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Zoek (typ en krijg suggesties)…" className="input" style={{marginTop:8, marginBottom:8}}/>
        {suggestions.length>0 && (
          <div className="text-sm text-muted" style={{marginBottom:8}}>
            Suggesties: {suggestions.map((s,i)=>(
              <button key={s} onClick={()=>onSelect(s)} className="underline" style={{marginRight:8}}>
                {s}{i<suggestions.length-1?",":""}
              </button>
            ))}
          </div>
        )}
        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8}}>
          {filtered.map(name=>(
            <button key={name} onClick={()=>onSelect(name)} className="list-item">{name}</button>
          ))}
        </div>
        <div style={{marginTop:12}}>
          <button onClick={onClose} className="btn" style={{maxWidth:240}}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   WORKOUTS LIST / HISTORY
   ============================================================= */
function WorkoutsScreen({ onPickDay, data, onDelete, unit }){
  return (
    <div className="center-col">
      <div className="hit-card">
        <h1 className="text-xl font-semibold">Kies je workout</h1>
        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:8}}>
          {dayOptions.map(d=>(
            <button key={d.key} onClick={()=>onPickDay(d.key)} className="list-item">{d.label}</button>
          ))}
        </div>
      </div>
      <div className="hit-card">
        <h2 className="text-lg font-semibold">Mijn Workouts</h2>
        <HistoryList data={data} onDelete={onDelete} unit={unit}/>
      </div>
    </div>
  );
}

function HistoryList({ data, onDelete, unit }){
  if(!data.workouts.length) return <div className="text-muted">Nog geen workouts opgeslagen.</div>;
  return (
    <div style={{display:"grid", gap:12, width:"100%"}}>
      {data.workouts.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(w=>(
        <div key={w.id} className="hit-card">
          <div style={{fontWeight:700}}>{w.dayName}</div>
          <div className="text-muted" style={{fontSize:12}}>{formatDateEU(w.date)}</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:8}}>
            {w.sets.map((s,i)=>{
              const display=s.weightKg!=null? `${Math.round(fromKg(unit,s.weightKg)*100)/100} ${unit}` : "—";
              return (
                <div key={i} className="list-item">
                  <div style={{fontWeight:700}}>{s.name}</div>
                  {s.note && <div className="text-muted" style={{fontSize:12}}>{s.note}</div>}
                  <div style={{marginTop:4}}>{display}{s.reps?` × ${s.reps}`:""}</div>
                  {s.noteText && <div style={{marginTop:4}}>{`📝 ${s.noteText}`}</div>}
                </div>
              );
            })}
          </div>
          <div style={{marginTop:10}}>
            <button onClick={()=>onDelete(w.id)} className="btn" style={{maxWidth:220}}>
              Verwijderen <Trash2 style={{width:16,height:16, marginLeft:6}}/>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =============================================================
   WORKOUT FORM — unit switch ALLEEN hier zichtbaar
   ============================================================= */
function WorkoutForm({ dayKey, onSave, onCancel, unit, setUnit, customExerciseName }){
  const plan = dayKey==="custom"
    ? {name:`Losse oefening – ${customExerciseName}`, exercises:[{name:customExerciseName, note:"Log je werkset(ten)"}]}
    : EXERCISE_PLAN[dayKey];

  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [rows,setRows]=useState(()=>plan.exercises.map(ex=>({name:ex.name, note:ex.note, weight:"", reps:"", done:false, noteText:""})));

  const toggleDone=(i)=>setRows(r=>r.map((row,idx)=>idx===i? {...row,done:!row.done}:row));
  const updateField=(i,f,v)=>setRows(r=>r.map((row,idx)=>idx===i? {...row,[f]:v}:row));

  const handleSave=()=>onSave({
    id:Date.now().toString(),
    createdAt:new Date().toISOString(),
    date, dayKey, dayName:plan.name, unitAtEntry:unit,
    sets: rows.map(s=>({name:s.name, note:s.note, done:s.done, reps:s.reps, noteText:s.noteText, enteredWeight:s.weight, weightKg:s.weight? toKg(unit,s.weight): null}))
  });

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-center justify-center p-4">
      <div className="hit-card" style={{maxWidth:820, maxHeight:"90vh", overflowY:"auto"}}>
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <p className="text-muted" style={{fontSize:14, marginTop:4}}>
          Datum (EU): {formatDateEU(date)}
        </p>

        {/* Alleen hier unit wisselen */}
        <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap"}}>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="input" style={{maxWidth:240}}/>
          <div style={{display:"flex", gap:8}}>
            <button onClick={()=>setUnit("kg")} className="btn" style={{maxWidth:140, background: unit==="kg" ? "#b91c1c" : "#111"}}>KG</button>
            <button onClick={()=>setUnit("lbs")} className="btn" style={{maxWidth:140, background: unit==="lbs" ? "#b91c1c" : "#111"}}>LBS</button>
          </div>
        </div>

        <div style={{display:"grid", gap:10, marginTop:12}}>
          {rows.map((row,idx)=>(
            <div key={idx} className="list-item" style={{display:"grid", gap:10}}>
              <div style={{fontWeight:700}}>{row.name}</div>
              {row.note && <div className="text-muted" style={{fontSize:12}}>{row.note}</div>}
              <div style={{display:"flex", flexDirection:"column", gap:8, alignItems:"center"}}>
                <div style={{display:"flex", gap:8, width:"100%", maxWidth:520, justifyContent:"center"}}>
                  <input type="number" placeholder={`gewicht (${unit})`} inputMode="decimal" value={row.weight} onChange={(e)=>updateField(idx,"weight",e.target.value)} className="input"/>
                  <input type="number" placeholder="reps" inputMode="numeric" value={row.reps} onChange={(e)=>updateField(idx,"reps",e.target.value)} className="input"/>
                </div>
                <button onClick={()=>toggleDone(idx)} className="btn" style={{maxWidth:220}}>
                  {row.done? "✔️ Gedaan":"Markeer gedaan"}
                </button>
              </div>
              <div style={{display:"flex", gap:8, alignItems:"flex-start", justifyContent:"center"}}>
                <FileText style={{width:16, height:16, marginTop:6, color:"#b91c1c"}}/>
                <textarea placeholder="Notitie (tempo, vorm, RIR, dropset-details…)" value={row.noteText} onChange={(e)=>updateField(idx,"noteText",e.target.value)} className="textarea"/>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex", gap:10, justifyContent:"center", marginTop:12}}>
          <button onClick={onCancel} className="btn" style={{maxWidth:220}}>Annuleren</button>
          <button onClick={handleSave} className="btn btn-primary" style={{maxWidth:220}}>
            <Save style={{width:16,height:16, marginRight:6}}/> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   PROGRESS VIEW — zoekt binnen ALLE_EXERCISES + gelogde namen
   ============================================================= */
function ProgressView({ data, unit }){
  const [exercise,setExercise]=useState("");
  const [query,setQuery]=useState("");

  const allExercises=useMemo(()=>{
    const names=new Set(ALL_EXERCISES);
    data.workouts.forEach(w=>w.sets.forEach(s=>names.add(s.name)));
    return Array.from(names).sort();
  },[data]);

  const suggestions=useMemo(()=>{ const q=norm(query); if(!q) return []; return allExercises.filter(n=>norm(n).startsWith(q)).slice(0,8); },[allExercises,query]);
  const filtered=useMemo(()=>{ const q=norm(query); if(!q) return allExercises.slice(0,80); return allExercises.filter(n=>norm(n).includes(q)).slice(0,80); },[allExercises,query]);

  const chartData=useMemo(()=>{
    if(!exercise) return [];
    const pts=[];
    for(const w of data.workouts){
      const m=w.sets.find(s=>s.name===exercise && s.weightKg!=null);
      if(m) pts.push({date:w.date, weight: Math.round(fromKg(unit,m.weightKg)*100)/100});
    }
    return pts.sort((a,b)=>new Date(a.date)-new Date(b.date));
  },[data,exercise,unit]);

  const best = chartData.length ? Math.max(...chartData.map(p=>p.weight)) : null;

  return (
    <div className="center-col">
      <div className="hit-card">
        <div className="font-semibold text-lg">Progressie</div>

        <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap"}}>
          <div style={{position:"relative", width:"100%", maxWidth:520}}>
            <Search className="w-4 h-4" style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", opacity:.7}}/>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Zoek een oefening…" className="input" style={{paddingLeft:36}}/>
          </div>
          <button onClick={()=>{
            if(query){
              const exact=allExercises.find(n=>norm(n)===norm(query));
              const pick= exact || suggestions[0] || filtered[0] || "";
              setExercise(pick||"");
            }
          }} className="btn btn-primary" style={{maxWidth:200}}>Kies</button>
        </div>

        {suggestions.length>0 && (
          <div className="text-sm text-muted" style={{marginTop:8}}>
            Suggesties:{" "}
            {suggestions.map((s,i)=>(
              <button key={s} onClick={()=>{ setExercise(s); setQuery(s); }} className="underline" style={{marginRight:8}}>
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
        <div className="chart-card">
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
                <Line type="monotone" dataKey="weight" stroke="#b91c1c" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-muted">Kies een oefening via de zoekbalk of lijst om je progressie te zien.</div>
      )}
    </div>
  );
}

/* =============================================================
   ROOT APP
   ============================================================= */
export default function App(){
  const [screen,setScreen]=useState("start");
  const [data,setData]=useState(()=>loadData());
  const [showDayPicker,setShowDayPicker]=useState(false);
  const [showExercisePicker,setShowExercisePicker]=useState(false);
  const [customExerciseName,setCustomExerciseName]=useState(null);
  const [dayForForm,setDayForForm]=useState(null);

  useEffect(()=>{ saveData(data); },[data]);
  useEffect(()=>{ registerServiceWorker(); },[]);

  const unit = data.settings?.unit || "kg";
  const setUnit = (unitNext)=>{
    const next={...data, settings:{...(data.settings||{}), unit:unitNext}};
    setData(next); saveData(next);
  };

  const handleNavigate=(value)=>{
    if(value==="exercises"){ setScreen("start"); setShowExercisePicker(true); return; }
    setScreen(value);
  };

  const openDayPicker = ()=>setShowDayPicker(true);
  const openExercisePicker = ()=>setShowExercisePicker(true);

  const pickDay=(key)=>{ setDayForForm(key); setShowDayPicker(false); };
  const selectExercise=(name)=>{ setCustomExerciseName(name); setDayForForm("custom"); setShowExercisePicker(false); };

  const handleSaveWorkout=(payload)=>{ setData(prev=>({...prev, workouts:[...prev.workouts, payload]})); setDayForForm(null); setCustomExerciseName(null); };
  const handleDeleteWorkout=(id)=>setData(prev=>({...prev, workouts: prev.workouts.filter(w=>w.id!==id)}));

  return (
    <div className="min-h-screen" style={{background:"#000", color:"#fff"}}>
      <TopBar current={screen} onNavigate={handleNavigate} />

      <main>
        {screen==="start" && <StartScreen onStartWorkout={openDayPicker} onStartExercise={openExercisePicker} />}
        {screen==="home" && <WorkoutsScreen onPickDay={pickDay} data={data} onDelete={handleDeleteWorkout} unit={unit} />}
        {screen==="progress" && <ProgressView data={data} unit={unit} />}
        {screen==="settings" && <Settings data={data} setData={setData} />}
      </main>

      {showDayPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="hit-card" style={{maxWidth:520}}>
            <h2 className="text-lg font-semibold">Kies je dag</h2>
            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:8}}>
              {dayOptions.map(d=>(
                <button key={d.key} onClick={()=>pickDay(d.key)} className="list-item">{d.label}</button>
              ))}
            </div>
            <div style={{marginTop:12, display:"flex", justifyContent:"center", gap:10}}>
              <button onClick={()=>setShowDayPicker(false)} className="btn" style={{maxWidth:220}}>Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {showExercisePicker && <ExercisePicker onSelect={selectExercise} onClose={()=>setShowExercisePicker(false)} />}

      {dayForForm && (
        <WorkoutForm
          dayKey={dayForForm}
          customExerciseName={customExerciseName}
          onSave={handleSaveWorkout}
          onCancel={()=>{ setDayForForm(null); setCustomExerciseName(null); }}
          unit={unit}
          setUnit={setUnit}
        />
      )}
    </div>
  );
}

/* =============================================================
   SETTINGS (backup/import/clear) — unit switch NIET hier, maar in WorkoutForm
   ============================================================= */
function Settings({ data, setData }){
  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`hit_joost_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };
  const importData=(file)=>{
    const reader=new FileReader();
    reader.onload=()=>{ try{ const json=JSON.parse(reader.result); setData(json); saveData(json); } catch{ alert("Ongeldig backup bestand"); } };
    reader.readAsText(file);
  };
  const clearAll=()=>{
    if(confirm("Alles verwijderen?")){
      const empty={workouts:[], settings:{unit: data.settings?.unit || "kg"}};
      setData(empty); saveData(empty);
    }
  };

  return (
    <div className="center-col">
      <div className="hit-card">
        <div className="font-semibold mb-1">Backup</div>
        <div style={{display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
          <button onClick={exportData} className="btn" style={{maxWidth:220}}>
            <Download className="w-4 h-4" style={{display:"inline", marginRight:6}}/> Export
          </button>
          <label className="btn" style={{maxWidth:220, cursor:"pointer"}}>
            <Upload className="w-4 h-4" style={{display:"inline", marginRight:6}}/> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files?.[0] && importData(e.target.files[0])}/>
          </label>
        </div>
      </div>

      <div className="hit-card">
        <div className="font-semibold mb-2">Data</div>
        <button onClick={clearAll} className="btn" style={{maxWidth:220}}>Alles wissen</button>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Save, Trash2, Upload, Download, FileText, Search } from "lucide-react";

/* =============================================================
   STORAGE / UNITS / HELPERS
   ============================================================= */
const STORAGE_KEY = "hit_joost_centered_v2";
const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

function registerServiceWorker(){ if("serviceWorker" in navigator){ navigator.serviceWorker.register("/sw.js").catch(()=>{}); } }
function loadData(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw):{workouts:[], settings:{unit:"kg"}} }catch{ return {workouts:[], settings:{unit:"kg"}} }
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
function formatDateEU(d){ const dt=new Date(d); const dd=String(dt.getDate()).padStart(2,"0"); const mm=String(dt.getMonth()+1).padStart(2,"0"); return `${dd}-${mm}-${dt.getFullYear()}`; }
function toKg(unit,v){ const n=Number(v); if(!n && n!==0) return 0; return unit==="lbs"? n*KG_PER_LB: n; }
function fromKg(unit,kg){ const n=Number(kg||0); return unit==="lbs"? n*LB_PER_KG: n; }
const norm=(s)=>s.toLowerCase().replace(/\s+/g," ").trim();

/* =============================================================
   EXERCISE PLAN (blijft zoals je had — kan je zelf finetunen)
   ============================================================= */
const EXERCISE_PLAN={
  day1:{name:"Dag 1 – Legs + Calves + Abs",exercises:[
    {name:"Squat (Free Weights)",note:"1 werkset 6–10"},
    {name:"Leg Press (Machine)",note:"1 werkset 8–12 + 1–2 dropsets"},
    {name:"Romanian Deadlift (Free Weights)",note:"1 werkset 6–10"},
    {name:"Lying Leg Curl (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Standing Calf Raise (Machine)",note:"1 werkset 10–15 + 2 dropsets"},
    {name:"Hanging Leg Raise (Bodyweight)",note:"1 set tot falen (10–20)"},
    {name:"Ab Wheel Rollout (Bodyweight)",note:"1 set 8–12"}
  ]},
  day2:{name:"Dag 2 – Upper Body",exercises:[
    {name:"Barbell Bench Press (Free Weights)",note:"1 werkset 6–10"},
    {name:"Lat Pulldown (Machine)",note:"1 werkset 6–10"},
    {name:"Incline Chest Press (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Seated Row (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Pec Deck Fly (Machine)",note:"1 werkset 8–12 + dropset"},
    {name:"Barbell Curl (Free Weights)",note:"1 werkset 6–10"},
    {name:"Rope Pushdown (Machine)",note:"1 werkset 8–12 + dropset"}
  ]},
  day3:{name:"Dag 3 – Shoulders + Calves + Cardio",exercises:[
    {name:"Barbell Overhead Press (Free Weights)",note:"1 werkset 6–10"},
    {name:"Lateral Raise (Machine)",note:"1 werkset 10–12 + dropset"},
    {name:"Rear Delt Fly (Machine)",note:"1 werkset 10–12 + dropset"},
    {name:"Upright Row (Free Weights)",note:"1 werkset 6–10"},
    {name:"Seated Calf Raise (Machine)",note:"1 werkset 12–15 + dropset"},
    {name:"Ab Coaster (Machine)",note:"3 sets tot falen"},
    {name:"Hanging Leg Raise (Bodyweight)",note:"2 sets tot falen"},
    {name:"Steady State Cardio",note:"30–40 min zone 2"}
  ]},
  day4:{name:"Dag 4 – Cardio / Active Recovery",exercises:[
    {name:"Steady State Cardio",note:"45–60 min zone 2"},
    {name:"Core stabiliteit (Pallof Press) (Machine)",note:"optioneel"}
  ]}
};
const dayOptions=[
  {key:"day1",label:EXERCISE_PLAN.day1.name},
  {key:"day2",label:EXERCISE_PLAN.day2.name},
  {key:"day3",label:EXERCISE_PLAN.day3.name},
  {key:"day4",label:EXERCISE_PLAN.day4.name},
];

/* =============================================================
   MASTER LIST ALL_EXERCISES — voorzien van (Machine)/(Free Weights)/(Bodyweight)
   Niet letterlijk "alles" op aarde, maar zeer compleet voor een commerciële gym.
   ============================================================= */
const ALL_EXERCISES = [
  // ── Lower body ───────────────────────────────────────────────
  "Barbell Back Squat (Free Weights)",
  "Front Squat (Free Weights)",
  "Box Squat (Free Weights)",
  "Overhead Squat (Free Weights)",
  "Romanian Deadlift (Free Weights)",
  "Conventional Deadlift (Free Weights)",
  "Sumo Deadlift (Free Weights)",
  "Deficit Deadlift (Free Weights)",
  "Trap Bar Deadlift (Free Weights)",
  "Barbell Good Morning (Free Weights)",
  "Barbell Lunge (Free Weights)",
  "Bulgarian Split Squat (Free Weights)",
  "Walking Lunge (Free Weights)",
  "Step-Up (Free Weights)",
  "Hip Thrust (Free Weights)",
  "Glute Bridge (Free Weights)",
  "Leg Press (Machine)",
  "Hack Squat (Machine)",
  "Smith Machine Squat (Machine)",
  "Smith Machine Lunge (Machine)",
  "Leg Extension (Machine)",
  "Lying Leg Curl (Machine)",
  "Seated Leg Curl (Machine)",
  "Standing Calf Raise (Machine)",
  "Seated Calf Raise (Machine)",
  "Hip Abduction (Machine)",
  "Hip Adduction (Machine)",
  "Glute Kickback (Machine)",

  // ── Chest ───────────────────────────────────────────────────
  "Barbell Bench Press (Free Weights)",
  "Incline Barbell Bench Press (Free Weights)",
  "Decline Barbell Bench Press (Free Weights)",
  "Close-Grip Barbell Bench Press (Free Weights)",
  "Dumbbell Bench Press (Free Weights)",
  "Incline Dumbbell Bench Press (Free Weights)",
  "Dumbbell Fly (Free Weights)",
  "Dumbbell Pullover (Free Weights)",
  "Chest Press (Machine)",
  "Incline Chest Press (Machine)",
  "Decline Chest Press (Machine)",
  "Pec Deck Fly (Machine)",
  "Cable Crossover (Machine)",

  // ── Back ────────────────────────────────────────────────────
  "Barbell Row (Free Weights)",
  "Pendlay Row (Free Weights)",
  "Yates Row (Free Weights)",
  "Dumbbell Row (Free Weights)",
  "T-Bar Row (Free Weights)",
  "Seal Row (Free Weights)",
  "Lat Pulldown (Machine)",
  "Close-Grip Pulldown (Machine)",
  "Straight Arm Pulldown (Machine)",
  "Seated Row (Machine)",
  "Chest-Supported Row (Machine)",
  "Assisted Pull-Up (Machine)",

  // ── Shoulders ───────────────────────────────────────────────
  "Barbell Overhead Press (Free Weights)",
  "Seated Barbell Press (Free Weights)",
  "Push Press (Free Weights)",
  "Dumbbell Shoulder Press (Free Weights)",
  "Arnold Press (Free Weights)",
  "Lateral Raise (Free Weights)",
  "Front Raise (Free Weights)",
  "Rear Delt Fly (Free Weights)",
  "Upright Row (Free Weights)",
  "Smith Machine Shoulder Press (Machine)",
  "Lateral Raise (Machine)",
  "Rear Delt Fly (Machine)",
  "Face Pull (Machine)",

  // ── Arms ────────────────────────────────────────────────────
  "Barbell Curl (Free Weights)",
  "EZ-Bar Curl (Free Weights)",
  "Dumbbell Curl (Free Weights)",
  "Incline Dumbbell Curl (Free Weights)",
  "Hammer Curl (Free Weights)",
  "Concentration Curl (Free Weights)",
  "Preacher Curl (Machine)",
  "Cable Curl (Machine)",
  "Reverse Curl (Machine)",
  "Skull Crusher (Free Weights)",
  "Overhead Dumbbell Extension (Free Weights)",
  "Close-Grip Bench Press (Free Weights)",
  "Tricep Pushdown (Machine)",
  "Overhead Cable Extension (Machine)",
  "Rope Pushdown (Machine)",
  "Cable Kickback (Machine)",

  // ── Core / Lower back ───────────────────────────────────────
  "Hanging Leg Raise (Bodyweight)",
  "Hanging Knee Raise (Bodyweight)",
  "Captain's Chair Leg Raise (Machine)",
  "Ab Coaster (Machine)",
  "Ab Crunch (Machine)",
  "Cable Crunch (Machine)",
  "Ab Wheel Rollout (Bodyweight)",
  "Plank (Bodyweight)",
  "Side Plank (Bodyweight)",
  "Pallof Press (Machine)",
  "Back Extension (Machine)",
  "Back Extension (Bodyweight)",

  // ── Bodyweight upper/lower ──────────────────────────────────
  "Pull-Up (Bodyweight)",
  "Chin-Up (Bodyweight)",
  "Push-Up (Bodyweight)",
  "Dips (Bodyweight)",
  "Handstand Push-Up (Bodyweight)",
  "Inverted Row (Bodyweight)",
  "Pistol Squat (Bodyweight)",
  "Bodyweight Lunge (Bodyweight)",
  "Wall Sit (Bodyweight)",

  // ── Olympic / power variants (Free Weights) ──────────────────
  "Power Clean (Free Weights)",
  "Clean and Press (Free Weights)",
  "Power Snatch (Free Weights)",
  "Push Jerk (Free Weights)"
];

/* =============================================================
   TOPBAR
   ============================================================= */
function TopBar({ current, onNavigate }) {
  return (
    <div className="hit-topbar">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>onNavigate("start")} className="flex items-center gap-3 min-w-0 group" aria-label="Home">
            <img src="/unnamed-192.png" alt="App logo" className="w-10 h-10 rounded-full object-cover" style={{border:"2px solid #b91c1c"}}/>
            <div className="app-title">High Intensity<br/>Training by Joost</div>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={current}
              onChange={(e)=>onNavigate(e.target.value)}
              className="select" aria-label="Navigatie" style={{width:180}}
            >
              <option value="start">Start</option>
              <option value="home">Workouts</option>
              <option value="exercises">Exercises</option>
              <option value="progress">Progressie</option>
              <option value="settings">Instellingen</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   QUOTES (kleine flair)
   ============================================================= */
const QUOTES=[
  {who:"Arnold Schwarzenegger",text:"The last three or four reps is what makes the muscle grow."},
  {who:"Arnold Schwarzenegger",text:"Strength does not come from winning. Your struggles develop your strengths."},
  {who:"Kris Gethin",text:"Discipline means doing what needs to be done even when you don’t feel like it."},
  {who:"Mike Mentzer",text:"Hard work isn’t enough—training must be brief, intense and infrequent."}
];

function StartScreen({ onStartWorkout, onStartExercise }){
  const [idx,setIdx]=useState(0);
  const q=QUOTES[idx];
  useEffect(()=>{ const id=setInterval(()=>setIdx(p=>(p+1)%QUOTES.length),10000); return ()=>clearInterval(id); },[]);
  return (
    <div className="center-col">
      <button onClick={onStartWorkout} className="btn btn-primary">Start Workout</button>
      <button onClick={onStartExercise} className="btn btn-ghost">Start Exercise</button>
      <div className="hit-card" style={{marginTop:12}}>
        <blockquote className="text-2xl font-semibold leading-tight">“{q.text}”</blockquote>
        <p className="mt-2 text-muted">— {q.who}</p>
      </div>
    </div>
  );
}

/* =============================================================
   EXERCISE PICKER — gebruikt nu de MASTER LIST (ALL_EXERCISES)
   met typeahead-suggesties.
   ============================================================= */
function ExercisePicker({ onClose, onSelect }){
  const builtIn = useMemo(()=> ALL_EXERCISES.slice().sort(), []);
  const [query,setQuery]=useState("");
  const filtered=useMemo(()=>{
    const q=norm(query); if(!q) return builtIn.slice(0,80);
    return builtIn.filter(n=>norm(n).includes(q)).slice(0,80);
  },[builtIn,query]);
  const suggestions=useMemo(()=>{
    const q=norm(query); if(!q) return [];
    return builtIn.filter(n=>norm(n).startsWith(q)).slice(0,8);
  },[builtIn,query]);

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-center justify-center p-4">
      <div className="hit-card" style={{maxWidth:720, maxHeight:"90vh", overflowY:"auto"}}>
        <h2 className="text-lg font-semibold">Kies een oefening</h2>
        <input autoFocus value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Zoek (typ en krijg suggesties)…" className="input" style={{marginTop:8, marginBottom:8}}/>
        {suggestions.length>0 && (
          <div className="text-sm text-muted" style={{marginBottom:8}}>
            Suggesties: {suggestions.map((s,i)=>(
              <button key={s} onClick={()=>onSelect(s)} className="underline" style={{marginRight:8}}>
                {s}{i<suggestions.length-1?",":""}
              </button>
            ))}
          </div>
        )}
        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8}}>
          {filtered.map(name=>(
            <button key={name} onClick={()=>onSelect(name)} className="list-item">{name}</button>
          ))}
        </div>
        <div style={{marginTop:12}}>
          <button onClick={onClose} className="btn" style={{maxWidth:240}}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   WORKOUTS LIST / HISTORY
   ============================================================= */
function WorkoutsScreen({ onPickDay, data, onDelete, unit }){
  return (
    <div className="center-col">
      <div className="hit-card">
        <h1 className="text-xl font-semibold">Kies je workout</h1>
        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:8}}>
          {dayOptions.map(d=>(
            <button key={d.key} onClick={()=>onPickDay(d.key)} className="list-item">{d.label}</button>
          ))}
        </div>
      </div>
      <div className="hit-card">
        <h2 className="text-lg font-semibold">Mijn Workouts</h2>
        <HistoryList data={data} onDelete={onDelete} unit={unit}/>
      </div>
    </div>
  );
}

function HistoryList({ data, onDelete, unit }){
  if(!data.workouts.length) return <div className="text-muted">Nog geen workouts opgeslagen.</div>;
  return (
    <div style={{display:"grid", gap:12, width:"100%"}}>
      {data.workouts.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(w=>(
        <div key={w.id} className="hit-card">
          <div style={{fontWeight:700}}>{w.dayName}</div>
          <div className="text-muted" style={{fontSize:12}}>{formatDateEU(w.date)}</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:8}}>
            {w.sets.map((s,i)=>{
              const display=s.weightKg!=null? `${Math.round(fromKg(unit,s.weightKg)*100)/100} ${unit}` : "—";
              return (
                <div key={i} className="list-item">
                  <div style={{fontWeight:700}}>{s.name}</div>
                  {s.note && <div className="text-muted" style={{fontSize:12}}>{s.note}</div>}
                  <div style={{marginTop:4}}>{display}{s.reps?` × ${s.reps}`:""}</div>
                  {s.noteText && <div style={{marginTop:4}}>{`📝 ${s.noteText}`}</div>}
                </div>
              );
            })}
          </div>
          <div style={{marginTop:10}}>
            <button onClick={()=>onDelete(w.id)} className="btn" style={{maxWidth:220}}>
              Verwijderen <Trash2 style={{width:16,height:16, marginLeft:6}}/>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =============================================================
   WORKOUT FORM — unit switch ALLEEN hier zichtbaar
   ============================================================= */
function WorkoutForm({ dayKey, onSave, onCancel, unit, setUnit, customExerciseName }){
  const plan = dayKey==="custom"
    ? {name:`Losse oefening – ${customExerciseName}`, exercises:[{name:customExerciseName, note:"Log je werkset(ten)"}]}
    : EXERCISE_PLAN[dayKey];

  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [rows,setRows]=useState(()=>plan.exercises.map(ex=>({name:ex.name, note:ex.note, weight:"", reps:"", done:false, noteText:""})));

  const toggleDone=(i)=>setRows(r=>r.map((row,idx)=>idx===i? {...row,done:!row.done}:row));
  const updateField=(i,f,v)=>setRows(r=>r.map((row,idx)=>idx===i? {...row,[f]:v}:row));

  const handleSave=()=>onSave({
    id:Date.now().toString(),
    createdAt:new Date().toISOString(),
    date, dayKey, dayName:plan.name, unitAtEntry:unit,
    sets: rows.map(s=>({name:s.name, note:s.note, done:s.done, reps:s.reps, noteText:s.noteText, enteredWeight:s.weight, weightKg:s.weight? toKg(unit,s.weight): null}))
  });

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-center justify-center p-4">
      <div className="hit-card" style={{maxWidth:820, maxHeight:"90vh", overflowY:"auto"}}>
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <p className="text-muted" style={{fontSize:14, marginTop:4}}>
          Datum (EU): {formatDateEU(date)}
        </p>

        {/* Alleen hier unit wisselen */}
        <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap"}}>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="input" style={{maxWidth:240}}/>
          <div style={{display:"flex", gap:8}}>
            <button onClick={()=>setUnit("kg")} className="btn" style={{maxWidth:140, background: unit==="kg" ? "#b91c1c" : "#111"}}>KG</button>
            <button onClick={()=>setUnit("lbs")} className="btn" style={{maxWidth:140, background: unit==="lbs" ? "#b91c1c" : "#111"}}>LBS</button>
          </div>
        </div>

        <div style={{display:"grid", gap:10, marginTop:12}}>
          {rows.map((row,idx)=>(
            <div key={idx} className="list-item" style={{display:"grid", gap:10}}>
              <div style={{fontWeight:700}}>{row.name}</div>
              {row.note && <div className="text-muted" style={{fontSize:12}}>{row.note}</div>}
              <div style={{display:"flex", flexDirection:"column", gap:8, alignItems:"center"}}>
                <div style={{display:"flex", gap:8, width:"100%", maxWidth:520, justifyContent:"center"}}>
                  <input type="number" placeholder={`gewicht (${unit})`} inputMode="decimal" value={row.weight} onChange={(e)=>updateField(idx,"weight",e.target.value)} className="input"/>
                  <input type="number" placeholder="reps" inputMode="numeric" value={row.reps} onChange={(e)=>updateField(idx,"reps",e.target.value)} className="input"/>
                </div>
                <button onClick={()=>toggleDone(idx)} className="btn" style={{maxWidth:220}}>
                  {row.done? "✔️ Gedaan":"Markeer gedaan"}
                </button>
              </div>
              <div style={{display:"flex", gap:8, alignItems:"flex-start", justifyContent:"center"}}>
                <FileText style={{width:16, height:16, marginTop:6, color:"#b91c1c"}}/>
                <textarea placeholder="Notitie (tempo, vorm, RIR, dropset-details…)" value={row.noteText} onChange={(e)=>updateField(idx,"noteText",e.target.value)} className="textarea"/>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex", gap:10, justifyContent:"center", marginTop:12}}>
          <button onClick={onCancel} className="btn" style={{maxWidth:220}}>Annuleren</button>
          <button onClick={handleSave} className="btn btn-primary" style={{maxWidth:220}}>
            <Save style={{width:16,height:16, marginRight:6}}/> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   PROGRESS VIEW — zoekt binnen ALLE_EXERCISES + gelogde namen
   ============================================================= */
function ProgressView({ data, unit }){
  const [exercise,setExercise]=useState("");
  const [query,setQuery]=useState("");

  const allExercises=useMemo(()=>{
    const names=new Set(ALL_EXERCISES);
    data.workouts.forEach(w=>w.sets.forEach(s=>names.add(s.name)));
    return Array.from(names).sort();
  },[data]);

  const suggestions=useMemo(()=>{ const q=norm(query); if(!q) return []; return allExercises.filter(n=>norm(n).startsWith(q)).slice(0,8); },[allExercises,query]);
  const filtered=useMemo(()=>{ const q=norm(query); if(!q) return allExercises.slice(0,80); return allExercises.filter(n=>norm(n).includes(q)).slice(0,80); },[allExercises,query]);

  const chartData=useMemo(()=>{
    if(!exercise) return [];
    const pts=[];
    for(const w of data.workouts){
      const m=w.sets.find(s=>s.name===exercise && s.weightKg!=null);
      if(m) pts.push({date:w.date, weight: Math.round(fromKg(unit,m.weightKg)*100)/100});
    }
    return pts.sort((a,b)=>new Date(a.date)-new Date(b.date));
  },[data,exercise,unit]);

  const best = chartData.length ? Math.max(...chartData.map(p=>p.weight)) : null;

  return (
    <div className="center-col">
      <div className="hit-card">
        <div className="font-semibold text-lg">Progressie</div>

        <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap"}}>
          <div style={{position:"relative", width:"100%", maxWidth:520}}>
            <Search className="w-4 h-4" style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", opacity:.7}}/>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Zoek een oefening…" className="input" style={{paddingLeft:36}}/>
          </div>
          <button onClick={()=>{
            if(query){
              const exact=allExercises.find(n=>norm(n)===norm(query));
              const pick= exact || suggestions[0] || filtered[0] || "";
              setExercise(pick||"");
            }
          }} className="btn btn-primary" style={{maxWidth:200}}>Kies</button>
        </div>

        {suggestions.length>0 && (
          <div className="text-sm text-muted" style={{marginTop:8}}>
            Suggesties:{" "}
            {suggestions.map((s,i)=>(
              <button key={s} onClick={()=>{ setExercise(s); setQuery(s); }} className="underline" style={{marginRight:8}}>
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
        <div className="chart-card">
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
                <Line type="monotone" dataKey="weight" stroke="#b91c1c" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-muted">Kies een oefening via de zoekbalk of lijst om je progressie te zien.</div>
      )}
    </div>
  );
}

/* =============================================================
   ROOT APP
   ============================================================= */
export default function App(){
  const [screen,setScreen]=useState("start");
  const [data,setData]=useState(()=>loadData());
  const [showDayPicker,setShowDayPicker]=useState(false);
  const [showExercisePicker,setShowExercisePicker]=useState(false);
  const [customExerciseName,setCustomExerciseName]=useState(null);
  const [dayForForm,setDayForForm]=useState(null);

  useEffect(()=>{ saveData(data); },[data]);
  useEffect(()=>{ registerServiceWorker(); },[]);

  const unit = data.settings?.unit || "kg";
  const setUnit = (unitNext)=>{
    const next={...data, settings:{...(data.settings||{}), unit:unitNext}};
    setData(next); saveData(next);
  };

  const handleNavigate=(value)=>{
    if(value==="exercises"){ setScreen("start"); setShowExercisePicker(true); return; }
    setScreen(value);
  };

  const openDayPicker = ()=>setShowDayPicker(true);
  const openExercisePicker = ()=>setShowExercisePicker(true);

  const pickDay=(key)=>{ setDayForForm(key); setShowDayPicker(false); };
  const selectExercise=(name)=>{ setCustomExerciseName(name); setDayForForm("custom"); setShowExercisePicker(false); };

  const handleSaveWorkout=(payload)=>{ setData(prev=>({...prev, workouts:[...prev.workouts, payload]})); setDayForForm(null); setCustomExerciseName(null); };
  const handleDeleteWorkout=(id)=>setData(prev=>({...prev, workouts: prev.workouts.filter(w=>w.id!==id)}));

  return (
    <div className="min-h-screen" style={{background:"#000", color:"#fff"}}>
      <TopBar current={screen} onNavigate={handleNavigate} />

      <main>
        {screen==="start" && <StartScreen onStartWorkout={openDayPicker} onStartExercise={openExercisePicker} />}
        {screen==="home" && <WorkoutsScreen onPickDay={pickDay} data={data} onDelete={handleDeleteWorkout} unit={unit} />}
        {screen==="progress" && <ProgressView data={data} unit={unit} />}
        {screen==="settings" && <Settings data={data} setData={setData} />}
      </main>

      {showDayPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="hit-card" style={{maxWidth:520}}>
            <h2 className="text-lg font-semibold">Kies je dag</h2>
            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:8, marginTop:8}}>
              {dayOptions.map(d=>(
                <button key={d.key} onClick={()=>pickDay(d.key)} className="list-item">{d.label}</button>
              ))}
            </div>
            <div style={{marginTop:12, display:"flex", justifyContent:"center", gap:10}}>
              <button onClick={()=>setShowDayPicker(false)} className="btn" style={{maxWidth:220}}>Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {showExercisePicker && <ExercisePicker onSelect={selectExercise} onClose={()=>setShowExercisePicker(false)} />}

      {dayForForm && (
        <WorkoutForm
          dayKey={dayForForm}
          customExerciseName={customExerciseName}
          onSave={handleSaveWorkout}
          onCancel={()=>{ setDayForForm(null); setCustomExerciseName(null); }}
          unit={unit}
          setUnit={setUnit}
        />
      )}
    </div>
  );
}

/* =============================================================
   SETTINGS (backup/import/clear) — unit switch NIET hier, maar in WorkoutForm
   ============================================================= */
function Settings({ data, setData }){
  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`hit_joost_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };
  const importData=(file)=>{
    const reader=new FileReader();
    reader.onload=()=>{ try{ const json=JSON.parse(reader.result); setData(json); saveData(json); } catch{ alert("Ongeldig backup bestand"); } };
    reader.readAsText(file);
  };
  const clearAll=()=>{
    if(confirm("Alles verwijderen?")){
      const empty={workouts:[], settings:{unit: data.settings?.unit || "kg"}};
      setData(empty); saveData(empty);
    }
  };

  return (
    <div className="center-col">
      <div className="hit-card">
        <div className="font-semibold mb-1">Backup</div>
        <div style={{display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
          <button onClick={exportData} className="btn" style={{maxWidth:220}}>
            <Download className="w-4 h-4" style={{display:"inline", marginRight:6}}/> Export
          </button>
          <label className="btn" style={{maxWidth:220, cursor:"pointer"}}>
            <Upload className="w-4 h-4" style={{display:"inline", marginRight:6}}/> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files?.[0] && importData(e.target.files[0])}/>
          </label>
        </div>
      </div>

      <div className="hit-card">
        <div className="font-semibold mb-2">Data</div>
        <button onClick={clearAll} className="btn" style={{maxWidth:220}}>Alles wissen</button>
      </div>
    </div>
  );
}
