function TopBar({ current, onNavigate, unit, onToggleUnit }) {
  return (
    <div className="sticky top-0 z-10 bg-neutral-950 border-b border-red-900 text-white">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo + titel -> klik = Home/Start */}
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
            <div className="font-semibold leading-tight text-left text-lg sm:text-xl break-words">
              <div>High Intensity</div>
              <div>Training by Joost</div>
            </div>
          </button>

          {/* Dropdown + unit toggle */}
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
              {unit.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
