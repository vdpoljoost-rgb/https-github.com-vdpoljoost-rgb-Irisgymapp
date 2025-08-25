import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, BarChart2, CheckSquare, Save, Trash2, Upload, Download, Scale, FileText, Search } from "lucide-react";

// ----------------------------------------------------
// Config & helpers
// ----------------------------------------------------
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
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function formatDateEU(d) {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}
function toKg(unit, value) {
  const v = Number(value);
  if (!v && v !== 0) return 0;
  return unit === "lbs" ? v * KG_PER_LB : v;
}
function fromKg(unit, kg) {
  const v = Number(kg || 0);
  return unit === "lbs" ? v * LB_PER_KG : v;
}

// ----------------------------------------------------
// Oefeningenschema (Mentzer-stijl)
// ----------------------------------------------------
const EXERCISE_PLAN = {
  day1: {
    name: "Dag 1 – Legs + Calves + Abs",
    exercises: [
      { name: "Squat", note: "1 werkset 6–10" },
      { name: "Leg Press (machine)", note: "1 werkset 8–12 + 1–2 dropsets" },
      { name: "Romanian Deadlift", note: "1 werkset 6–10" },
      { name: "Leg Curl (machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Standing Calf Raise (machine)", note: "1 werkset 10–15 + 2 dropsets" },
      { name: "Hanging Leg Raises", note: "1 set tot falen (10–20)" },
      { name: "Ab Wheel Rollout", note: "1 set 8–12" }
    ]
  },
  day2: {
    name: "Dag 2 – Upper Body",
    exercises: [
      { name: "Bench Press", note: "1 werkset 6–10" },
      { name: "Pull-Up / Lat Pulldown", note: "1 werkset 6–10" },
      { name: "Incline Chest Press (machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Seated Row (machine)", note: "1 werkset 8–12 + dropset" },
      { name: "Machine Chest Fly", note: "1 werkset 8–12 + dropset" },
      { name: "Barbell Curl", note: "1 werkset 6–10" },
      { name: "Rope Pushdown (cable)", note: "1 werkset 8–12 + dropset" }
    ]
  },
  day3: {
    name: "Dag 3 – Shoulders + Calves + Cardio",
    exercises: [
      { name: "Overhead Press", note: "1 werkset 6–10" },
      { name: "Lateral Raise (dumbbell/machine)", note: "1 werkset 10–12 + dropset" },
      { name: "Rear Delt Fly (machine)", note: "1 werkset 10–12 + dropset" },
      { name: "Upright Row", note: "1 werkset 6–10" },
      { name: "Seated Calf Raise (machine)", note: "1 werkset 12–15 + dropset" },
      { name: "Ab Coaster", note: "3 sets tot falen" },
      { name: "Hanging Leg Raises", note: "2 sets tot falen" },
      { name: "Steady State Cardio", note: "30–40 min zone 2" }
    ]
  },
  day4: {
    name: "Dag 4 – Cardio / Active Recovery",
    exercises: [
      { name: "Steady State Cardio", note: "45–60 min zone 2" },
      { name: "Core stabiliteit (side planks, pallof press)", note: "optioneel" }
    ]
  }
};

const dayOptions = [
  { key: "day1", label: EXERCISE_PLAN.day1.name },
  { key: "day2", label: EXERCISE_PLAN.day2.name },
  { key: "day3", label: EXERCISE_PLAN.day3.name },
  { key: "day4", label: EXERCISE_PLAN.day4.name }
];

// ----------------------------------------------------
// Extra compound free-weight oefeningen (toegevoegd)
// ----------------------------------------------------
const ADDITIONAL_COMPOUND_EXERCISES = [
  // Lower body
  "Front Squat",
  "Low-Bar Back Squat",
  "High-Bar Back Squat",
  "Paused Squat",
  "Deficit Deadlift",
  "Conventional Deadlift",
  "Sumo Deadlift",
  "Snatch-Grip Deadlift",
  "Trap Bar Deadlift",
  "Barbell Hip Thrust",
  "Barbell Good Morning",
  "Barbell Walking Lunge",
  "Bulgarian Split Squat (DB/BB)",
  "Barbell Step-Up",
  "Overhead Squat",
  // Push (chest/shoulders/triceps)
  "Incline Barbell Bench Press",
  "Decline Barbell Bench Press",
  "Close-Grip Bench Press",
  "Paused Bench Press",
  "Standing Military Press",
  "Push Press",
  "Dumbbell Bench Press (Flat)",
  "Dumbbell Bench Press (Incline)",
  "Dumbbell Shoulder Press",
  "Arnold Press",
  // Pull (back/biceps)
  "Barbell Row (Pendlay)",
  "Barbell Row (Yates/Underhand)",
  "One-Arm Dumbbell Row",
  "Chest-Supported Dumbbell Row",
  "T-Bar Row (free plate landmine)",
  "Pull-Up",
  "Chin-Up",
  // Olympic style
  "Power Clean",
  "Power Snatch",
  "Push Jerk"
];

// ----------------------------------------------------
// UI – Topbar (met dropdown menu)
// ----------------------------------------------------
function TopBar({ current, onNavigate, unit, onToggleUnit }) {
  return (
    <div className="sticky top-0 z-10 bg-neutral-950 border-b border-red-900 text-white">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo + titel */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/unnamed-192.png"
              alt="App logo"
              className="w-10 h-10 rounded-full object-cover border-2 border-red-700"
            />
            <div className="font-semibold leading-tight text-lg sm:text-xl break-words">
              <div>High Intensity</div>
              <div>Training by Joost</div>
            </div>
          </div>

          {/* Dropdown navigatie + unit toggle */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={current}
              onChange={(e) => onNavigate(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white rounded-xl px-3 py-2"
              aria-label="Navigatie"
            >
              <option value="start">Start</option>
              <option value="home">Workouts</option>
              <option value="progress">Progressie</option>
              <option value="settings">Instellingen</option>
            </select>

            <button
              onClick={onToggleUnit}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center gap-2"
              title="Wissel eenheid"
            >
              <Scale className="w-4 h-4 text-red-500" />
              {unit.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Startpagina (dag-quote + Start Workout + Start Exercise)
// ----------------------------------------------------
function getDailyQuote() {
  const quotes = [
    { who: "Arnold Schwarzenegger", text: "The last three or four reps is what makes the muscle grow." },
    { who: "Kris Gethin", text: "Discipline means doing what needs to be done even when you don’t feel like it." },
    { who: "Mike Mentzer", text: "Hard work isn’t enough—training must be brief, intense and infrequent." }
  ];
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % quotes.length;
  return quotes[dayIndex];
}

function StartScreen({ onStartWorkout, onStartExercise }) {
  const q = getDailyQuote();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-white text-center px-6 gap-6">
      <div className="max-w-2xl">
        <p className="text-neutral-300 uppercase tracking-wide mb-3">Daily Motivation</p>
        <blockquote className="text-2xl sm:text-3xl font-semibold leading-tight">
          “{q.text}”
        </blockquote>
        <p className="mt-3 text-neutral-400">— {q.who}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <button
          onClick={onStartWorkout}
          className="px-8 py-4 rounded-2xl bg-red-700 hover:bg-red-600 text-white text-xl sm:text-2xl font-bold shadow-lg active:scale-95"
          aria-label="Start Workout"
        >
          Start Workout
        </button>
        <button
          onClick={onStartExercise}
          className="px-8 py-4 rounded-2xl bg-neutral-900 border border-neutral-700 hover:border-red-700 text-white text-xl sm:text-2xl font-bold shadow-lg active:scale-95"
          aria-label="Start Exercise"
        >
          Start Exercise
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// ExercisePicker (zoekbalk + typeahead)
// ----------------------------------------------------
function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function ExercisePicker({ onClose, onSelect }) {
  const builtIn = useMemo(() => {
    const set = new Set();
    Object.values(EXERCISE_PLAN).forEach((d) => d.exercises.forEach((e) => set.add(e.name)));
    ADDITIONAL_COMPOUND_EXERCISES.forEach((n) => set.add(n));
    return Array.from(set).sort();
  }, []);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return builtIn.slice(0, 60); // top 60 tonen als suggestie
    return builtIn.filter((n) => normalize(n).includes(q)).slice(0, 60);
  }, [builtIn, query]);

  // simpele typeahead: toon top 6 suggesties die met de letters beginnen
  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return builtIn.filter((n) => normalize(n).startsWith(q)).slice(0, 6);
  }, [builtIn, query]);

  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold">Kies een oefening</h2>
          <div className="ml-auto">
            <button onClick={onClose} className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-900">Sluiten</button>
          </div>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek (typ en krijg suggesties)…"
          className="w-full border border-neutral-700 bg-neutral-900 text-white rounded-xl px-3 py-2 mb-2"
        />

        {suggestions.length > 0 && (
          <div className="mb-3 text-sm text-neutral-300">
            Suggesties:{" "}
            {suggestions.map((s, i) => (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className="underline hover:text-white mr-2"
              >
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
              className="text-left p-3 rounded-xl border border-neutral-800 hover:border-red-700 hover:bg-neutral-900"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Overige UI componenten (ongewijzigd behalve kleine fixes)
// ----------------------------------------------------
function FloatingNewButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-5 right-5 p-4 rounded-full shadow-xl bg-red-700 text-white active:scale-95"
      aria-label="Nieuwe workout"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}

function DayPicker({ onPick, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 text-white flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold">Nieuwe workout</h2>
        </div>
        <p className="text-sm text-neutral-300 mb-3">Kies je dag om te starten:</p>
        <div className="grid grid-cols-1 gap-2">
          {dayOptions.map((d) => (
            <button
              key={d.key}
              onClick={() => onPick(d.key)}
              className="text-left p-3 rounded-xl border border-neutral-800 hover:border-red-700 hover:bg-neutral-900"
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-900">
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-sm text-neutral-300">
              Datum (EU): {formatDateEU(date)} — Voer gewicht in ({unit.toUpperCase()}) en vink af wat je hebt gedaan.
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-neutral-700 bg-neutral-900 text-white rounded-lg px-2 py-1"
          />
        </div>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="border border-neutral-800 rounded-xl p-3 flex flex-col gap-3 bg-neutral-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDone(idx)}
                  title="Gedaan"
                  className={`rounded-lg p-2 border ${row.done ? "bg-red-700 border-red-700" : "border-neutral-800 hover:bg-neutral-900"}`}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-neutral-400">{row.note}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`gewicht (${unit})`}
                    inputMode="decimal"
                    value={row.weight}
                    onChange={(e) => updateField(idx, "weight", e.target.value)}
                    className="w-28 border border-neutral-700 bg-neutral-900 text-white rounded-lg px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="reps"
                    inputMode="numeric"
                    value={row.reps}
                    onChange={(e) => updateField(idx, "reps", e.target.value)}
                    className="w-24 border border-neutral-700 bg-neutral-900 text-white rounded-lg px-2 py-1"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-red-500 mt-2" />
                <textarea
                  placeholder="Notitie (tempo, vorm, RIR, dropset-details, etc.)"
                  value={row.noteText}
                  onChange={(e) => updateField(idx, "noteText", e.target.value)}
                  className="w-full border border-neutral-700 bg-neutral-900 text-white rounded-lg px-2 py-1"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-3 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-900">
            Annuleren
          </button>
          <button onClick={handleSave} className="px-3 py-2 rounded-xl bg-red-700 text-white flex items-center gap-2">
            <Save className="w-4 h-4" /> Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ data, onDelete, unit }) {
  if (!data.workouts.length) {
    return (
      <div className="text-center text-neutral-400 py-8">
        Nog geen workouts opgeslagen. Klik op het{" "}
        <span className="inline-flex items-center gap-1 font-medium">
          <Plus className="w-4 h-4" /> plus-teken
        </span>{" "}
        om te starten.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {data.workouts
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((w) => (
          <div key={w.id} className="border border-neutral-800 rounded-2xl p-3 bg-neutral-950 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{w.dayName}</div>
                <div className="text-xs text-neutral-400">{formatDateEU(w.date)}</div>
              </div>
              <button
                onClick={() => onDelete(w.id)}
                className="p-2 rounded-lg border border-neutral-800 hover:border-red-700"
                title="Verwijderen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {w.sets.map((s, i) => {
                const display = s.weightKg != null ? `${Math.round(fromKg(unit, s.weightKg) * 100) / 100} ${unit}` : "—";
                return (
                  <div key={i} className="bg-neutral-900 rounded-xl p-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${s.done ? "bg-green-500" : "bg-neutral-600"}`}></span>
                      {s.name}
                    </div>
                    <div className="text-xs text-neutral-400">{s.note}</div>
                    <div className="text-sm mt-1">
                      {display}
                      {s.reps ? ` × ${s.reps}` : ""}
                    </div>
                    {s.noteText && <div className="text-xs text-neutral-300 mt-1">📝 {s.noteText}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

function ProgressView({ data, unit }) {
  const [exercise, setExercise] = useState("");

  const allExercises = useMemo(() => {
    const names = new Set();
    // uit plan
    Object.values(EXERCISE_PLAN).forEach((d) => d.exercises.forEach((e) => names.add(e.name)));
    // extra compounds
    ADDITIONAL_COMPOUND_EXERCISES.forEach((n) => names.add(n));
    // alles wat ooit gelogd is
    data.workouts.forEach((w) => w.sets.forEach((s) => names.add(s.name)));
    return Array.from(names).sort();
  }, [data]);

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <BarChart2 className="w-5 h-5 text-red-500" /> Progressie
        </div>
        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="border border-neutral-700 bg-neutral-900 text-white rounded-xl px-3 py-2 sm:ml-auto"
        >
          <option value="">Kies oefening…</option>
          {allExercises.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {exercise ? (
        <div className="border border-neutral-800 rounded-2xl p-3 bg-neutral-950">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">{exercise}</div>
            {best !== null && (
              <div className="text-sm">
                Beste: <span className="font-semibold">{best} {unit}</span>
              </div>
            )}
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
        <div className="text-neutral-400 text-sm">Selecteer een oefening om je gewichten over tijd te zien.</div>
      )}
    </div>
  );
}

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
      <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950">
        <div className="font-semibold mb-2">Eenheden</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnit("kg")}
            className={`px-3 py-2 rounded-xl border ${data.settings?.unit === "kg" ? "bg-red-700 border-red-700" : "border-neutral-800 hover:bg-neutral-900"}`}
          >
            KG
          </button>
          <button
            onClick={() => setUnit("lbs")}
            className={`px-3 py-2 rounded-xl border ${data.settings?.unit === "lbs" ? "bg-red-700 border-red-700" : "border-neutral-800 hover:bg-neutral-900"}`}
          >
            LBS
          </button>
        </div>
      </div>

      <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950">
        <div className="font-semibold mb-1">Backup</div>
        <div className="flex items-center gap-2">
          <button onClick={exportData} className="px-3 py-2 rounded-xl border border-neutral-800 hover:border-red-700">
            <Download className="w-4 h-4 inline mr-2" /> Export
          </button>
          <label className="px-3 py-2 rounded-xl border border-neutral-800 hover:border-red-700 cursor-pointer">
            <Upload className="w-4 h-4 inline mr-2" /> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950">
        <div className="font-semibold mb-2">Data</div>
        <button onClick={clearAll} className="px-3 py-2 rounded-xl border border-red-800 text-red-400 hover:bg-neutral-900">
          Alles wissen
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Root App
// ----------------------------------------------------
export default function App() {
  const [screen, setScreen] = useState("start"); // startpagina
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
  const selectExercise = (name) => {
    setCustomExerciseName(name);
    setDayForForm("custom");
    setShowExercisePicker(false);
  };

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
        {screen === "start" && (
          <StartScreen
            onStartWorkout={openDayPicker}
            onStartExercise={openExercisePicker}
          />
        )}

        {screen === "home" && (
          <>
            <h1 className="text-xl font-semibold mb-3">Mijn Workouts</h1>
            <HistoryList data={data} onDelete={handleDeleteWorkout} unit={unit} />
          </>
        )}

        {screen === "progress" && <ProgressView data={data} unit={unit} />}
        {screen === "settings" && <Settings data={data} setData={setData} />}
      </main>

      {screen !== "start" && <FloatingNewButton onClick={openDayPicker} />}
      {showDayPicker && <DayPicker onPick={pickDay} onClose={() => setShowDayPicker(false)} />}
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
