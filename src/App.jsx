import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart2, CheckSquare, Save, Trash2, Upload, Download, FileText, Search } from "lucide-react";

const STORAGE_KEY = "high_intensity_training_by_joost_v1";
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
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function formatDateEU(d) {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}
function toKg(unit, value) { const v = Number(value); if (!v && v !== 0) return 0; return unit === "lbs" ? v * KG_PER_LB : v; }
function fromKg(unit, kg) { const v = Number(kg || 0); return unit === "lbs" ? v * LB_PER_KG : v; }

/* ---------- Plan ---------- */
const EXERCISE_PLAN = {
  day1: { name: "Dag 1 – Legs + Calves + Abs", exercises: [
    { name: "Squat", note: "1 werkset 6–10" },
    { name: "Leg Press (machine)", note: "1 werkset 8–12 + 1–2 dropsets" },
    { name: "Romanian Deadlift", note: "1 werkset 6–10" },
    { name: "Leg Curl (machine)", note: "1 werkset 8–12 + dropset" },
    { name: "Standing Calf Raise (machine)", note: "1 werkset 10–15 + 2 dropsets" },
    { name: "Hanging Leg Raises", note: "1 set tot falen (10–20)" },
    { name: "Ab Wheel Rollout", note: "1 set 8–12" }
  ]},
  day2: { name: "Dag 2 – Upper Body", exercises: [
    { name: "Bench Press", note: "1 werkset 6–10" },
    { name: "Pull-Up / Lat Pulldown", note: "1 werkset 6–10" },
    { name: "Incline Chest Press (machine)", note: "1 werkset 8–12 + dropset" },
    { name: "Seated Row (machine)", note: "1 werkset 8–12 + dropset" },
    { name: "Machine Chest Fly", note: "1 werkset 8–12 + dropset" },
    { name: "Barbell Curl", note: "1 werkset 6–10" },
    { name: "Rope Pushdown (cable)", note: "1 werkset 8–12 + dropset" }
  ]},
  day3: { name: "Dag 3 – Shoulders + Calves + Cardio", exercises: [
    { name: "Overhead Press", note: "1 werkset 6–10" },
    { name: "Lateral Raise (dumbbell/machine)", note: "1 werkset 10–12 + dropset" },
    { name: "Rear Delt Fly (machine)", note: "1 werkset 10–12 + dropset" },
    { name: "Upright Row", note: "1 werkset 6–10" },
    { name: "Seated Calf Raise (machine)", note: "1 werkset 12–15 + dropset" },
    { name: "Ab Coaster", note: "3 sets tot falen" },
    { name: "Hanging Leg Raises", note: "2 sets tot falen" },
    { name: "Steady State Cardio", note: "30–40 min zone 2" }
  ]},
  day4: { name: "Dag 4 – Cardio / Active Recovery", exercises: [
    { name: "Steady State Cardio", note: "45–60 min zone 2" },
    { name: "Core stabiliteit (side planks, pallof press)", note: "optioneel" }
  ]}
};
const dayOptions = [
  { key: "day1", label: EXERCISE_PLAN.day1.name },
  { key: "day2", label: EXERCISE_PLAN.day2.name },
  { key: "day3", label: EXERCISE_PLAN.day3.name },
  { key: "day4", label: EXERCISE_PLAN.day4.name }
];

const ADDITIONAL_COMPOUND_EXERCISES = [
  "Front Squat","Low-Bar Back Squat","High-Bar Back Squat","Paused Squat","Deficit Deadlift",
  "Conventional Deadlift","Sumo Deadlift","Snatch-Grip Deadlift","Trap Bar Deadlift","Barbell Hip Thrust",
  "Barbell Good Morning","Barbell Walking Lunge","Bulgarian Split Squat (DB/BB)","Barbell Step-Up",
  "Overhead Squat","Incline Barbell Bench Press","Decline Barbell Bench Press","Close-Grip Bench Press",
  "Paused Bench Press","Standing Military Press","Push Press","Dumbbell Bench Press (Flat)",
  "Dumbbell Bench Press (Incline)","Dumbbell Shoulder Press","Arnold Press","Barbell Row (Pendlay)",
  "Barbell Row (Yates/Underhand)","One-Arm Dumbbell Row","Chest-Supported Dumbbell Row","T-Bar Row (free plate landmine)",
  "Pull-Up","Chin-Up","Power Clean","Power Snatch","Push Jerk"
];

/* ---------- Topbar ---------- */
function TopBar({ current, onNavigate, unit, onToggleUnit }) {
  return (
    <div className="sticky top-0 z-10 bg-neutral-950 border-b border-red-900 text-white hit-topbar">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("start")}
            className="flex items-center gap-3 min-w-0 group"
            aria-label="Ga naar Start"
          >
            <img
              src="/unnamed-192.png"
              alt="App logo"
              className="w-10 h-10 rounded-full object-cover border-2 border-red-700 group-active:scale-95"
            />
            {/* App-naam groter, ander font, wit */}
            <div className="app-title">High Intensity{'\n'}Training by Joost</div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={current}
              onChange={(e) => onNavigate(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white rounded-xl px-3 py-2 select"
              aria-label="Navigatie"
            >
              <option value="start">Start</option>
              <option value="home">Workouts</option>
              <option value="progress">Progressie</option>
              <option value="settings">Instellingen</option>
            </select>

            <button
              onClick={onToggleUnit}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 btn"
              title="Wissel eenheid"
            >
              {unit.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Quotes ---------- */
const QUOTES = [
  { who: "Arnold Schwarzenegger", text: "The last three or four reps is what makes the muscle grow." },
  { who: "Arnold Schwarzenegger", text: "Strength does not come from winning. Your struggles develop your strengths." },
  { who: "Kris Gethin", text: "Discipline means doing what needs to be done even when you don’t feel like it." },
  { who: "Mike Mentzer", text: "Hard work isn’t enough—training must be brief, intense and infrequent." }
];

/* ---------- Start (gecentreerd, knoppen onder elkaar, quote eronder) ---------- */
function StartScreen({ onStartWorkout, onStartExercise }) {
  const [idx, setIdx] = useState(0);
  const q = QUOTES[idx];
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % QUOTES.length), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-white text-center">
      {/* Grote knoppen – onder elkaar en gecentreerd */}
      <div className="w-full max-w-[520px] flex flex-col gap-3 px-4">
        <button onClick={onStartWorkout} className="btn btn-primary text-white">Start Workout</button>
        <button onClick={onStartExercise} className="btn btn-ghost text-white">Start Exercise</button>
      </div>

      {/* Quote eronder */}
      <div className="mt-6 px-6 w-full max-w-2xl">
        <div className="hit-card">
          <blockquote className="text-2xl font-semibold leading-tight">“{q.text}”</blockquote>
          <p className="mt-2 text-muted">— {q.who}</p>
        </div>
      </div>
    </div>
  );
}

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

/* ---------- ExercisePicker ---------- */
function ExercisePicker({ onClose, onSelect }) {
  const builtIn = useMemo(() => {
    const set = new Set();
    Object.values(EXERCISE_PLAN).forEach((d) => d.exercises.forEach((e) => set.add(e.name)));
    ADDITIONAL_COMPOUND_EXERCISES.forEach((n) => set.add(n));
    return Array.from(set).sort();
  }, []);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return builtIn.slice(0, 60);
    return builtIn.filter((n) => norm(n).includes(q)).slice(0, 60);
  }, [builtIn, query]);
  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    return builtIn.filter((n) => norm(n).startsWith(q)).slice(0, 6);
  }, [builtIn, query]);

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl p-4 max-h-[90vh] overflow-y-auto hit-card">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-[#b91c1c]" />
          <h2 className="text-lg font-semibold">Kies een oefening</h2>
          <div className="ml-auto">
            <button onClick={onClose} className="btn">Sluiten</button>
          </div>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek (typ en krijg suggesties)…"
          className="input mb-2"
        />

        {suggestions.length > 0 && (
          <div className="mb-3 text-sm text-muted">
            Suggesties:{" "}
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => onSelect(s)} className="underline hover:text-white mr-2">
                {s}{i < suggestions.length - 1 ? "," : ""}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((name) => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className="list-item text-left hover:border-[#b91c1c]"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Workouts ---------- */
function WorkoutsScreen({ onPickDay, data, onDelete, unit }) {
  return (
    <div className="space-y-4 text-white">
      <div className="hit-card">
        <h1 className="text-xl font-semibold mb-3">Kies je workout</h1>
        <div className="grid grid-cols-1 gap-2">
          {dayOptions.map((d) => (
            <button
              key={d.key}
              onClick={() => onPickDay(d.key)}
              className="list-item text-left hover:border-[#b91c1c]"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hit-card">
        <h2 className="text-lg font-semibold mb-2">Mijn Workouts</h2>
        <HistoryList data={data} onDelete={onDelete} unit={unit} />
      </div>
    </div>
  );
}

/* ---------- History ---------- */
function HistoryList({ data, onDelete, unit }) {
  if (!data.workouts.length) {
    return <div className="text-center text-muted py-8">Nog geen workouts opgeslagen.</div>;
  }
  return (
    <div className="space-y-3">
      {data.workouts
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((w) => (
          <div key={w.id} className="hit-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{w.dayName}</div>
                <div className="text-xs text-muted">{formatDateEU(w.date)}</div>
              </div>
              <button
                onClick={() => onDelete(w.id)}
                className="btn btn-danger"
                title="Verwijderen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {w.sets.map((s, i) => {
                const display = s.weightKg != null ? `${Math.round(fromKg(unit, s.weightKg) * 100) / 100} ${unit}` : "—";
                return (
                  <div key={i} className="list-item">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${s.done ? "bg-green-500" : "bg-neutral-600"}`}></span>
                      <span className="text-white">{s.name}</span>
                    </div>
                    <div className="text-xs text-muted">{s.note}</div>
                    <div className="text-sm mt-1 text-white">
                      {display}{s.reps ? ` × ${s.reps}` : ""}
                    </div>
                    {s.noteText && <div className="text-xs text-white/90 mt-1">📝 {s.noteText}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

/* ---------- WorkoutForm ---------- */
function WorkoutForm({ dayKey, onSave, onCancel, unit, customExerciseName }) {
  const plan = dayKey === "custom"
    ? { name: `Losse oefening – ${customExerciseName}`, exercises: [{ name: customExerciseName, note: "Log je werkset(ten)" }] }
    : EXERCISE_PLAN[dayKey];

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(() =>
    plan.exercises.map((ex) => ({ name: ex.name, note: ex.note, weight: "", reps: "", done: false, noteText: "" }))
  );

  const toggleDone = (idx) => setRows((r) => r.map((row, i) => (i === idx ? { ...row, done: !row.done } : row)));
  const updateField = (idx, field, value) => setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  const handleSave = () => {
    const payload = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      date,
      dayKey,
      dayName: plan.name,
      unitAtEntry: unit,
      sets: rows.map((s) => ({
        name: s.name,
        note: s.note,
        done: s.done,
        reps: s.reps,
        noteText: s.noteText,
        enteredWeight: s.weight,
        weightKg: s.weight ? toKg(unit, s.weight) : null
      }))
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl p-4 max-h-[90vh] overflow-y-auto hit-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
            <p className="text-sm text-muted">
              Datum (EU): {formatDateEU(date)} — Voer gewicht in ({unit.toUpperCase()}) en vink af wat je hebt gedaan.
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="list-item flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDone(idx)}
                  title="Gedaan"
                  className={`btn ${row.done ? "btn-primary" : ""}`}
                  style={{ width: 44, height: 44, padding: 0 }}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{row.name}</div>
                  <div className="text-xs text-muted">{row.note}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`gewicht (${unit})`}
                    inputMode="decimal"
                    value={row.weight}
                    onChange={(e) => updateField(idx, "weight", e.target.value)}
                    className="input w-28"
                  />
                  <input
                    type="number"
                    placeholder="reps"
                    inputMode="numeric"
                    value={row.reps}
                    onChange={(e) => updateField(idx, "reps", e.target.value)}
                    className="input w-24"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-[#b91c1c] mt-2" />
                <textarea
                  placeholder="Notitie (tempo, vorm, RIR, dropset-details, etc.)"
                  value={row.noteText}
                  onChange={(e) => updateField(idx, "noteText", e.target.value)}
                  className="textarea"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn">Annuleren</button>
          <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Progressie ---------- */
function ProgressView({ data, unit }) {
  const [exercise, setExercise] = useState("");
  const [query, setQuery] = useState("");

  const allExercises = useMemo(() => {
    const names = new Set();
    Object.values(EXERCISE_PLAN).forEach((d) => d.exercises.forEach((e) => names.add(e.name)));
    ADDITIONAL_COMPOUND_EXERCISES.forEach((n) => names.add(n));
    data.workouts.forEach((w) => w.sets.forEach((s) => names.add(s.name)));
    return Array.from(names).sort();
  }, [data]);

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    return allExercises.filter((n) => norm(n).startsWith(q)).slice(0, 6);
  }, [allExercises, query]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return allExercises.slice(0, 60);
    return allExercises.filter((n) => norm(n).includes(q)).slice(0, 60);
  }, [allExercises, query]);

  const chartData = useMemo(() => {
    if (!exercise) return [];
    const points = [];
    for (const w of data.workouts) {
      const match = w.sets.find((s) => s.name === exercise && s.weightKg != null);
      if (match) points.push({ date: w.date, weight: Math.round(fromKg(unit, match.weightKg) * 100) / 100 });
    }
    return points.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data, exercise, unit]);

  const best = chartData.length ? Math.max(...chartData.map((p) => p.weight)) : null;

  return (
    <div className="space-y-4 text-white">
      <div className="hit-card">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-5 h-5 text-[#b91c1c]" />
          <div className="font-semibold text-lg">Progressie</div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek een oefening… (typ om suggesties te zien)"
                className="input pl-9"
              />
            </div>
            <button
              onClick={() => {
                if (query) {
                  const exact = allExercises.find((n) => norm(n) === norm(query));
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
            <div className="mt-2 text-sm text-muted">
              Suggesties:{" "}
              {suggestions.map((s, i) => (
                <button key={s} onClick={() => { setExercise(s); setQuery(s); }} className="underline hover:text-white mr-2">
                  {s}{i < suggestions.length - 1 ? "," : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((name) => (
            <button
              key={name}
              onClick={() => { setExercise(name); setQuery(name); }}
              className={`list-item text-left ${exercise === name ? "border-[#b91c1c]" : "hover:border-[#b91c1c]"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {exercise ? (
        <div className="chart-card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-white">{exercise}</div>
            {best !== null && <div className="text-sm">Beste: <span className="font-semibold">{best} {unit}</span></div>}
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => formatDateEU(v)} />
                <YAxis tickFormatter={(v) => `${v}${unit}`} />
                <Tooltip formatter={(v) => `${v} ${unit}`} labelFormatter={(l) => formatDateEU(l)} />
                <Line type="monotone" dataKey="weight" stroke="#b91c1c" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-muted text-sm">Kies een oefening via de zoekbalk of lijst om je progressie te zien.</div>
      )}
    </div>
  );
}

/* ---------- Settings ---------- */
function Settings({ data, setData }) {
  const setUnit = (unit) => {
    const next = { ...data, settings: { ...(data.settings || {}), unit } };
    setData(next);
    saveData(next);
  };
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
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        setData(json);
        saveData(json);
      } catch {
        alert("Ongeldig backup bestand");
      }
    };
    reader.readAsText(file);
  };
  const clearAll = () => {
    if (confirm("Alles verwijderen?")) {
      const empty = { workouts: [], settings: { unit: data.settings?.unit || "kg" } };
      setData(empty);
      saveData(empty);
    }
  };

  return (
    <div className="space-y-3 text-white">
      <div className="hit-card">
        <div className="font-semibold mb-2">Eenheden</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUnit("kg")} className={`btn ${data.settings?.unit === "kg" ? "btn-primary" : ""}`}>KG</button>
          <button onClick={() => setUnit("lbs")} className={`btn ${data.settings?.unit === "lbs" ? "btn-primary" : ""}`}>LBS</button>
        </div>
      </div>

      <div className="hit-card">
        <div className="font-semibold mb-1">Backup</div>
        <div className="flex items-center gap-2">
          <button onClick={exportData} className="btn"><Download className="w-4 h-4 inline mr-2" /> Export</button>
          <label className="btn cursor-pointer">
            <Upload className="w-4 h-4 inline mr-2" /> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="hit-card">
        <div className="font-semibold mb-2">Data</div>
        <button onClick={clearAll} className="btn btn-danger">Alles wissen</button>
      </div>
    </div>
  );
}

/* ---------- Root ---------- */
export default function App() {
  const [screen, setScreen] = useState("start");
  const [data, setData] = useState(() => loadData());
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState(null);
  const [dayForForm, setDayForForm] = useState(null);

  useEffect(() => { saveData(data); }, [data]);
  useEffect(() => { registerServiceWorker(); }, []);

  const unit = data.settings?.unit || "kg";

  const openDayPicker = () => setShowDayPicker(true);
  const openExercisePicker = () => setShowExercisePicker(true);

  const pickDay = (key) => { setDayForForm(key); setShowDayPicker(false); };
  const selectExercise = (name) => { setCustomExerciseName(name); setDayForForm("custom"); setShowExercisePicker(false); };

  const handleSaveWorkout = (payload) => { setData((prev) => ({ ...prev, workouts: [...prev.workouts, payload] })); setDayForForm(null); setCustomExerciseName(null); };
  const handleDeleteWorkout = (id) => setData((prev) => ({ ...prev, workouts: prev.workouts.filter((w) => w.id !== id) }));

  const toggleUnit = () => {
    const next = unit === "kg" ? "lbs" : "kg";
    const updated = { ...data, settings: { ...(data.settings || {}), unit: next } };
    setData(updated); saveData(updated);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <TopBar current={screen} onNavigate={setScreen} unit={unit} onToggleUnit={toggleUnit} />

      <main className="mx-auto max-w-3xl px-4 py-4">
        {screen === "start" && <StartScreen onStartWorkout={openDayPicker} onStartExercise={openExercisePicker} />}
        {screen === "home" && <WorkoutsScreen onPickDay={pickDay} data={data} onDelete={handleDeleteWorkout} unit={unit} />}
        {screen === "progress" && <ProgressView data={data} unit={unit} />}
        {screen === "settings" && <Settings data={data} setData={setData} />}
      </main>

      {/* Modals */}
      {showDayPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 w-full max-w-md hit-card">
            <h2 className="mb-4 text-white font-semibold">Kies je dag</h2>
            <div className="grid grid-cols-1 gap-2">
              {dayOptions.map((d) => (
                <button key={d.key} onClick={() => pickDay(d.key)} className="list-item text-left hover:border-[#b91c1c]">
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowDayPicker(false)} className="btn">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {showExercisePicker && <ExercisePicker onSelect={selectExercise} onClose={() => setShowExercisePicker(false)} />}

      {dayForForm && (
        <WorkoutForm
          dayKey={dayForForm}
          customExerciseName={customExerciseName}
          onSave={handleSaveWorkout}
          onCancel={() => { setDayForForm(null); setCustomExerciseName(null); }}
          unit={unit}
        />
      )}
    </div>
  );
}
