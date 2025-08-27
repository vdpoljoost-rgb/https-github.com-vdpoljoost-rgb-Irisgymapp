import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Save, Trash2, Upload, Download, FileText, Search } from "lucide-react";

/* ============================================================
   STORAGE / HELPERS
   ============================================================ */
const STORAGE_KEY = "hit_joost_centered_v2";
const EX_DB_CACHE_KEY = "hit_exercise_db_cache_v1";
const EX_DB_URL = "/all_exercises.json";

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

  // laadt cache direct
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

  // ververst van /all_exercises.json
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
   UI COMPONENTS
   ============================================================ */
function TopBar({ current, onNavigate }) {
  return (
    <div className="hit-topbar">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate("start")} className="flex items-center gap-3 min-w-0 group" aria-label="Home">
            <img src="/unnamed-192.png" alt="App logo" className="w-10 h-10 rounded-full object-cover neon-ring" />
            <div className="app-title">High Intensity<br />Training by Joost</div>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={current}
              onChange={(e) => onNavigate(e.target.value)}
              className="select"
              aria-label="Navigatie"
              style={{ width: 180 }}
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

const QUOTES = [
  { who: "Arnold Schwarzenegger", text: "The last three or four reps is what makes the muscle grow." },
  { who: "Mike Mentzer", text: "Hard work isn’t enough—training must be brief, intense and infrequent." },
];

function StartScreen({ onStartWorkout, onStartExercise }) {
  const [idx, setIdx] = useState(0);
  const q = QUOTES[idx];
  useEffect(() => {
    const id = setInterval(() => setIdx(p => (p + 1) % QUOTES.length), 10000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="center-col">
      <button onClick={onStartWorkout} className="btn btn-primary neon">Start Workout</button>
      <button onClick={onStartExercise} className="btn btn-ghost neon-white">Start Exercise</button>
      <div className="hit-card neon-border" style={{ marginTop: 12 }}>
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

function ProgressView({ data, unit, db }) {
  const [exercise, setExercise] = useState("");
  const [query, setQuery] = useState("");

  const allExercises = useMemo(() => db || [], [db]);

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    return allExercises.filter(n => norm(n).startsWith(q)).slice(0, 8);
  }, [allExercises, query]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return allExercises.slice(0, 80);
    return allExercises.filter(n => norm(n).includes(q)).slice(0, 80);
  }, [allExercises, query]);

  const chartData = useMemo(() => {
    if (!exercise) return [];
    const pts = [];
    for (const w of data.workouts) {
      const m = (w.sets || []).find(s => s.name === exercise && s.weightKg != null);
      if (m) pts.push({ date: w.date, weight: Math.round(fromKg(unit, m.weightKg) * 100) / 100 });
    }
    return pts.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data, exercise, unit]);

  const best = chartData.length ? Math.max(...chartData.map(p => p.weight)) : null;

  return (
    <div className="center-col">
      <div className="hit-card neon-border">
        <div className="font-semibold text-lg">Progressie</div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 520 }}>
            <Search className="search-icon" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek een oefening…" className="input" style={{ paddingLeft: 36 }} />
          </div>
          <button
            onClick={() => {
              if (query) {
                const exact = allExercises.find(n => norm(n) === norm(query));
                const pick = exact || suggestions[0] || filtered[0] || "";
                setExercise(pick || "");
              }
            }}
            className="btn btn-primary"
          >
            Kies
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="text-sm text-muted" style={{ marginTop: 8 }}>
            Suggesties:{" "}
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => { setExercise(s); setQuery(s); }} className="link">
                {s}{i < suggestions.length - 1 ? "," : ""}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 12 }}>
          {filtered.map(name => (
            <button key={name} onClick={() => { setExercise(name); setQuery(name); }} className="list-item">{name}</button>
          ))}
        </div>
      </div>

      {exercise ? (
        <div className="chart-card neon-border">
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <div className="font-semibold">{exercise}</div>
            {best != null && <div className="text-muted">(beste: {best.toFixed(2)} {unit})</div>}
          </div>
          <div style={{ width: "100%", height: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => formatDateEU(v)} />
                <YAxis tickFormatter={(v) => `${v}${unit}`} />
                <Tooltip formatter={(v) => `${v} ${unit}`} labelFormatter={(l) => formatDateEU(l)} />
                <Line type="monotone" dataKey="weight" stroke="#ff1744" dot />
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
        {screen === "start" && <StartScreen onStartWorkout={openDayPicker} onStartExercise={openExercisePicker} />}
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
