import { useState, useEffect, useCallback, useRef } from "react";

const START_DATE = new Date("2026-02-22");

const SUBJECTS = [
  { id: "math",    label: "Math",    target: 250, examDate: new Date("2026-05-14"), color: "#60a5fa", dim: "#1e3a5f" },
  { id: "physics", label: "Physics", target: 100, examDate: new Date("2026-04-28"), color: "#34d399", dim: "#0f3328" },
  { id: "econ",    label: "Econ",    target: 50,  examDate: new Date("2026-05-12"), color: "#fbbf24", dim: "#3d2d00" },
  { id: "english", label: "English", target: 15,  examDate: new Date("2026-05-07"), color: "#f87171", dim: "#3d0f0f" },
];

const WEEKLY_RATE = { math: 15, physics: 10.8, econ: 5, english: 1.5 };
const NO_WORKOUT_DAYS = [1, 3];

const DAILY_TARGETS = {
  0: { math: 2.0, physics: 2.0,  econ: 1.0, english: 1.0 },
  1: { math: 2.0, physics: 2.25, econ: 0,   english: 0   },
  2: { math: 2.0, physics: 1.0,  econ: 1.0, english: 0   },
  3: { math: 2.0, physics: 2.25, econ: 0,   english: 0   },
  4: { math: 2.0, physics: 1.0,  econ: 1.0, english: 0   },
  5: { math: 2.0, physics: 1.0,  econ: 0.5, english: 0.5 },
  6: { math: 2.0, physics: 2.0,  econ: 1.5, english: 0   },
};

// Full weekly schedule for the Schedule tab
const SCHEDULE = [
  { day: "Monday",    type: "A",   math: 2.0, physics: 2.25, econ: 0,   english: 0,   total: 4.25, workout: false },
  { day: "Tuesday",   type: "B",   math: 2.0, physics: 1.0,  econ: 1.0, english: 0,   total: 4.0,  workout: true  },
  { day: "Wednesday", type: "A",   math: 2.0, physics: 2.25, econ: 0,   english: 0,   total: 4.25, workout: false },
  { day: "Thursday",  type: "B",   math: 2.0, physics: 1.0,  econ: 1.0, english: 0,   total: 4.0,  workout: true  },
  { day: "Friday",    type: "C",   math: 2.0, physics: 1.0,  econ: 0.5, english: 0.5, total: 4.0,  workout: true  },
  { day: "Saturday",  type: "A+B", math: 2.0, physics: 2.0,  econ: 1.5, english: 0,   total: 6.0,  workout: true  },
  { day: "Sunday",    type: "A+C", math: 2.0, physics: 2.0,  econ: 1.0, english: 1.0, total: 6.0,  workout: true  },
];

function weeksElapsed() {
  return Math.max(0, (Date.now() - START_DATE.getTime()) / (1000 * 60 * 60 * 24 * 7));
}
function daysUntil(date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}
function todayKey() { return new Date().toISOString().slice(0, 10); }
function getTodayWorkout() { return !NO_WORKOUT_DAYS.includes(new Date().getDay()); }

export default function App() {
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ib-logs") || "{}"); } catch { return {}; }
  });
  const [workout, setWorkout] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ib-workout") || "{}"); } catch { return {}; }
  });
  const [input, setInput] = useState({ math: "", physics: "", econ: "", english: "" });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("log");

  // Timer
  const FOCUS_SECS = 90 * 60;
  const BREAK_SECS = 20 * 60;
  const [timerSubject, setTimerSubject] = useState("math");
  const [timerMode, setTimerMode] = useState("idle"); // idle | focus | stopped | break | done
  const [timeLeft, setTimeLeft] = useState(FOCUS_SECS);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [blocksToday, setBlocksToday] = useState(0);
  const intervalRef = useRef(null);

  const persist = useCallback((newLogs, newWorkout) => {
    localStorage.setItem("ib-logs", JSON.stringify(newLogs));
    localStorage.setItem("ib-workout", JSON.stringify(newWorkout));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
        if (timerMode === "focus") setElapsed(e => e + 1);
      }, 1000);
    } else if (running && timeLeft === 0) {
      if (timerMode === "focus") {
        setTimerMode("stopped");
        setRunning(false);
        if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
      } else if (timerMode === "break") {
        setTimerMode("done");
        setRunning(false);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [running, timeLeft, timerMode]);

  function startFocus() { setTimerMode("focus"); setTimeLeft(FOCUS_SECS); setElapsed(0); setRunning(true); }
  function stopTimer() { setRunning(false); setTimerMode("stopped"); }
  function startBreak() { setTimerMode("break"); setTimeLeft(BREAK_SECS); setRunning(true); }
  function resetTimer() { setRunning(false); setTimerMode("idle"); setTimeLeft(FOCUS_SECS); setElapsed(0); }
  function togglePause() { setRunning(r => !r); }

  function logTimerSession() {
    const hrs = Math.round((elapsed / 3600) * 100) / 100;
    if (hrs <= 0) return;
    const key = todayKey();
    const entry = { ...logs[key] };
    entry[timerSubject] = Math.round(((parseFloat(entry[timerSubject]) || 0) + hrs) * 100) / 100;
    const newLogs = { ...logs, [key]: entry };
    setLogs(newLogs);
    persist(newLogs, workout);
    setBlocksToday(b => b + 1);
    setElapsed(0);
    setTimerMode("idle");
    setTimeLeft(FOCUS_SECS);
  }

  function fmtTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return m + ":" + s;
  }
  function timerPct() {
    const total = timerMode === "break" ? BREAK_SECS : FOCUS_SECS;
    return ((total - timeLeft) / total) * 100;
  }

  function getTotalHours(id) {
    return Object.values(logs).reduce((s, d) => s + (parseFloat(d[id]) || 0), 0);
  }
  function logToday() {
    const key = todayKey();
    const entry = { ...logs[key] };
    let changed = false;
    SUBJECTS.forEach(s => {
      const v = parseFloat(input[s.id]);
      if (!isNaN(v) && v > 0) { entry[s.id] = (parseFloat(entry[s.id]) || 0) + v; changed = true; }
    });
    if (!changed) return;
    const newLogs = { ...logs, [key]: entry };
    setLogs(newLogs);
    setInput({ math: "", physics: "", econ: "", english: "" });
    persist(newLogs, workout);
  }
  function toggleWorkout() {
    const key = todayKey();
    const nw = { ...workout, [key]: !workout[key] };
    setWorkout(nw);
    persist(logs, nw);
  }

  const todayHasWorkout = getTodayWorkout();
  const todayWorkoutDone = workout[todayKey()] || false;
  const weeksGone = weeksElapsed();
  const workoutDays = Object.values(workout).filter(Boolean).length;
  const activeSubject = SUBJECTS.find(s => s.id === timerSubject);
  const elapsedHrs = Math.round((elapsed / 3600) * 100) / 100;
  const todayDayIndex = new Date().getDay();
  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][todayDayIndex];

  return (
    <div style={{ background: "#080c14", minHeight: "100dvh", fontFamily: "'DM Mono','Courier New',monospace", color: "#e2e8f0", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #080c14; }
        ::-webkit-scrollbar { width: 0; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .tab-btn { cursor: pointer; flex: 1; padding: 10px 2px; border: none; font-family: inherit; font-size: 10px; letter-spacing: 0.06em; transition: all 0.2s; background: transparent; }
        .tab-active { color: #60a5fa; border-bottom: 2px solid #60a5fa; }
        .tab-inactive { color: #334155; border-bottom: 2px solid transparent; }
        .log-btn { background: #1d4ed8; color: white; border: none; border-radius: 10px; padding: 14px; font-family: inherit; font-size: 14px; cursor: pointer; width: 100%; letter-spacing: 0.06em; -webkit-appearance: none; }
        .log-btn:active { background: #1e40af; }
        .stop-btn { background: #7f1d1d; color: #fca5a5; border: none; border-radius: 10px; padding: 14px; font-family: inherit; font-size: 14px; cursor: pointer; letter-spacing: 0.06em; -webkit-appearance: none; }
        .input-field { background: #0f172a; border: 1px solid #1e293b; color: #e2e8f0; border-radius: 8px; padding: 12px 40px 12px 14px; font-family: inherit; font-size: 16px; width: 100%; outline: none; -webkit-appearance: none; appearance: none; }
        .input-field:focus { border-color: #3b82f6; }
        .card { background: #0d1626; border: 1px solid #1a2744; border-radius: 14px; padding: 18px; margin-bottom: 12px; }
        .pill { border-radius: 6px; padding: 4px 12px; font-size: 12px; display: inline-block; }
        .workout-btn { border-radius: 8px; padding: 10px 18px; font-family: inherit; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s; -webkit-appearance: none; white-space: nowrap; }
        .sched-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .sched-table th { color: #475569; font-weight: 400; padding: 6px 6px; text-align: left; border-bottom: 1px solid #1a2744; letter-spacing: 0.06em; font-size: 10px; }
        .sched-table td { padding: 10px 6px; border-bottom: 1px solid #0f1a2e; vertical-align: middle; }
        .sched-table tr.today-row td { background: #0d1f3c; }
        .sched-table tr.today-row td:first-child { border-left: 2px solid #60a5fa; padding-left: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#080c14", borderBottom: "1px solid #1a2744", padding: "calc(env(safe-area-inset-top) + 20px) 20px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>IB GRIND</div>
            <div style={{ color: "#334155", fontSize: 10, letterSpacing: "0.1em" }}>MAY 2026</div>
          </div>
          {saved && <span style={{ color: "#34d399", fontSize: 12 }}>✓ SAVED</span>}
        </div>
        <div style={{ display: "flex" }}>
          {["log", "timer", "schedule", "progress", "history"].map(t => (
            <button key={t} className={`tab-btn ${activeTab === t ? "tab-active" : "tab-inactive"}`} onClick={() => setActiveTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* ─── LOG ─── */}
        {activeTab === "log" && (
          <>
            <div style={{ color: "#334155", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}
            </div>

            <div className="card">
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>TODAY SO FAR</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SUBJECTS.map(s => {
                  const done = parseFloat(logs[todayKey()]?.[s.id]) || 0;
                  const target = DAILY_TARGETS[new Date().getDay()][s.id];
                  const pct = target > 0 ? Math.min(100, (done / target) * 100) : 0;
                  const remaining = Math.max(0, target - done);
                  const complete = done >= target && target > 0;
                  if (target === 0 && done === 0) return null;
                  return (
                    <div key={s.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                        <div style={{ fontSize: 12, color: s.color }}>{s.label}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          {target > 0 && !complete && <span style={{ fontSize: 10, color: "#475569" }}>{remaining.toFixed(2).replace(/\.?0+$/, "")}h left</span>}
                          {complete && <span style={{ fontSize: 10, color: "#34d399" }}>✓ done</span>}
                          <span style={{ fontSize: 14, fontWeight: 500, color: complete ? "#34d399" : "#e2e8f0" }}>
                            {done.toFixed(1)}<span style={{ fontSize: 10, color: "#475569" }}>/{target > 0 ? target : "—"}h</span>
                          </span>
                        </div>
                      </div>
                      {target > 0 && (
                        <div style={{ background: "#0a0f1e", borderRadius: 3, height: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: complete ? "#34d399" : s.color, borderRadius: 3, transition: "width 0.4s ease" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 14 }}>LOG SESSION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {SUBJECTS.map(s => (
                  <div key={s.id}>
                    <div style={{ fontSize: 10, color: s.color, marginBottom: 6, letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</div>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" inputMode="decimal" min="0" step="0.25" placeholder="0.0"
                        value={input[s.id]} onChange={e => setInput(v => ({ ...v, [s.id]: e.target.value }))} />
                      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#334155", fontSize: 13 }}>h</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="log-btn" onClick={logToday}>+ ADD TO LOG</button>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, color: todayHasWorkout ? "#e2e8f0" : "#334155" }}>
                  {todayHasWorkout ? "💪 45min Workout" : "🧠 Rest Day"}
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                  {todayHasWorkout ? (todayWorkoutDone ? "Done! 🔥" : "Not logged yet") : "Mon & Wed = no workout"}
                </div>
              </div>
              {todayHasWorkout && (
                <button className="workout-btn" onClick={toggleWorkout} style={{
                  background: todayWorkoutDone ? "#064e3b" : "#1e293b",
                  color: todayWorkoutDone ? "#34d399" : "#64748b",
                  border: `1px solid ${todayWorkoutDone ? "#065f46" : "#253347"}`,
                }}>{todayWorkoutDone ? "✓ DONE" : "MARK DONE"}</button>
              )}
            </div>
          </>
        )}

        {/* ─── TIMER ─── */}
        {activeTab === "timer" && (
          <>
            <div style={{ color: "#334155", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
              90 MIN FOCUS · 20 MIN BREAK · {blocksToday} BLOCK{blocksToday !== 1 ? "S" : ""} TODAY
            </div>

            {(timerMode === "idle" || timerMode === "stopped") && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>STUDYING</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SUBJECTS.map(s => (
                    <button key={s.id} onClick={() => setTimerSubject(s.id)} style={{
                      background: timerSubject === s.id ? s.dim : "#0a0f1e",
                      border: "1px solid " + (timerSubject === s.id ? s.color : "#1a2744"),
                      color: timerSubject === s.id ? s.color : "#475569",
                      borderRadius: 8, padding: 12, fontFamily: "inherit", fontSize: 13, cursor: "pointer",
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Clock */}
            <div className="card" style={{ textAlign: "center", padding: "32px 18px", borderColor: timerMode === "break" ? "#065f46" : timerMode === "focus" ? activeSubject?.dim : "#1a2744" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", marginBottom: 8, color: timerMode === "break" ? "#34d399" : timerMode === "focus" ? activeSubject?.color : timerMode === "stopped" ? "#fbbf24" : "#475569" }}>
                {timerMode === "idle" ? "READY" : timerMode === "focus" ? `${activeSubject?.label} · FOCUS` : timerMode === "stopped" ? "SESSION ENDED" : timerMode === "break" ? "BREAK · GO WALK" : "BREAK DONE"}
              </div>
              <div style={{ fontSize: 72, fontWeight: 300, letterSpacing: "0.05em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
                color: timerMode === "break" ? "#34d399" : timerMode === "focus" ? activeSubject?.color : timerMode === "stopped" ? "#fbbf24" : "#e2e8f0" }}>
                {timerMode === "done" ? "✓" : timerMode === "stopped" ? fmtTime(elapsed) : fmtTime(timeLeft)}
              </div>

              {timerMode === "stopped" && (
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 12 }}>
                  {elapsedHrs.toFixed(2)}h studied · log it to save
                </div>
              )}
              {(timerMode === "focus" || timerMode === "break") && (
                <div style={{ margin: "20px auto 0", maxWidth: 280, background: "#0a0f1e", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <div style={{ width: timerPct() + "%", height: "100%", background: timerMode === "break" ? "#34d399" : activeSubject?.color, borderRadius: 4, transition: "width 1s linear" }} />
                </div>
              )}
              {timerMode === "break" && (
                <div style={{ color: "#475569", fontSize: 12, marginTop: 16 }}>Step away from your desk 🚶</div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              {timerMode === "idle" && (
                <button className="log-btn" onClick={startFocus}>START 90 MIN BLOCK</button>
              )}
              {timerMode === "focus" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={togglePause} style={{ flex: 1, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 10, padding: 14, fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>
                    {running ? "PAUSE" : "RESUME"}
                  </button>
                  <button className="stop-btn" onClick={stopTimer}>STOP</button>
                </div>
              )}
              {timerMode === "stopped" && (
                <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
                  <button className="log-btn" onClick={logTimerSession}>
                    LOG {elapsedHrs.toFixed(2)}h TO {activeSubject?.label.toUpperCase()}
                  </button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={startBreak} style={{ flex: 1, background: "#064e3b", color: "#34d399", border: "1px solid #065f46", borderRadius: 10, padding: 14, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
                      START BREAK
                    </button>
                    <button onClick={resetTimer} style={{ background: "transparent", color: "#475569", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>
                      DISCARD
                    </button>
                  </div>
                </div>
              )}
              {timerMode === "break" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={togglePause} style={{ flex: 1, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 10, padding: 14, fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>
                    {running ? "PAUSE" : "RESUME"}
                  </button>
                  <button onClick={resetTimer} style={{ background: "transparent", color: "#475569", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>✕</button>
                </div>
              )}
              {timerMode === "done" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="log-btn" onClick={startFocus} style={{ flex: 1 }}>ANOTHER BLOCK</button>
                  <button onClick={resetTimer} style={{ background: "transparent", color: "#475569", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>DONE</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── SCHEDULE ─── */}
        {activeTab === "schedule" && (
          <>
            <div style={{ color: "#334155", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>WEEKLY PLAN</div>

            <div className="card" style={{ padding: "14px 12px", overflowX: "auto" }}>
              <table className="sched-table">
                <thead>
                  <tr>
                    <th>DAY</th>
                    <th style={{ color: "#60a5fa" }}>MATH</th>
                    <th style={{ color: "#34d399" }}>PHYS</th>
                    <th style={{ color: "#fbbf24" }}>ECON</th>
                    <th style={{ color: "#f87171" }}>ENG</th>
                    <th>WO</th>
                    <th style={{ textAlign: "right" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE.map(row => {
                    const isToday = row.day === todayName;
                    return (
                      <tr key={row.day} className={isToday ? "today-row" : ""}>
                        <td>
                          <div style={{ color: isToday ? "#60a5fa" : "#94a3b8", fontWeight: isToday ? 500 : 400, fontSize: 12 }}>{row.day.slice(0, 3).toUpperCase()}</div>
                          {isToday && <div style={{ fontSize: 9, color: "#3b82f6", marginTop: 2 }}>TODAY</div>}
                        </td>
                        <td style={{ color: row.math > 0 ? "#60a5fa" : "#1e293b" }}>{row.math > 0 ? `${row.math}h` : "—"}</td>
                        <td style={{ color: row.physics > 0 ? "#34d399" : "#1e293b" }}>{row.physics > 0 ? `${row.physics}h` : "—"}</td>
                        <td style={{ color: row.econ > 0 ? "#fbbf24" : "#1e293b" }}>{row.econ > 0 ? `${row.econ}h` : "—"}</td>
                        <td style={{ color: row.english > 0 ? "#f87171" : "#1e293b" }}>{row.english > 0 ? `${row.english}h` : "—"}</td>
                        <td style={{ color: row.workout ? "#34d399" : "#1e293b" }}>{row.workout ? "💪" : "—"}</td>
                        <td style={{ textAlign: "right", color: "#e2e8f0", fontWeight: 500 }}>{row.total}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Weekly totals */}
            <div className="card">
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>WEEKLY TOTALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                {SUBJECTS.map(s => {
                  const wkly = SCHEDULE.reduce((sum, r) => sum + (r[s.id] || 0), 0);
                  return (
                    <div key={s.id} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 500, color: s.color }}>{wkly}<span style={{ fontSize: 10 }}>h</span></div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 10 }}>EXAM DATES</div>
              {SUBJECTS.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0f1a2e" }}>
                  <span style={{ fontSize: 12, color: s.color }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {s.examDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {daysUntil(s.examDate)}d left
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── PROGRESS ─── */}
        {activeTab === "progress" && (
          <>
            <div style={{ color: "#334155", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
              WEEK {Math.ceil(weeksGone)} · {weeksGone.toFixed(1)} WEEKS ELAPSED
            </div>
            {SUBJECTS.map(s => {
              const done = getTotalHours(s.id);
              const pct = Math.min(100, (done / s.target) * 100);
              const daysLeft = daysUntil(s.examDate);
              const weeksLeft = daysLeft / 7;
              const expected = weeksGone * WEEKLY_RATE[s.id];
              const delta = done - expected;
              const remaining = Math.max(0, s.target - done);
              const neededPerWeek = weeksLeft > 0 ? remaining / weeksLeft : 0;
              return (
                <div key={s.id} className="card" style={{ borderColor: s.dim }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: s.color }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                        {s.examDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {daysLeft}d left
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 26, fontWeight: 500, color: s.color, lineHeight: 1 }}>
                        {done.toFixed(1)}<span style={{ fontSize: 12, color: "#475569" }}>h</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#475569" }}>of {s.target}h</div>
                    </div>
                  </div>
                  <div style={{ background: "#0a0f1e", borderRadius: 4, height: 6, marginBottom: 12, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${s.dim}, ${s.color})`, borderRadius: 4, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "PACE", val: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}h`, sub: delta >= 0 ? "ahead" : "behind", color: delta >= 0 ? "#34d399" : "#f87171" },
                      { label: "LEFT", val: `${remaining.toFixed(1)}h`, sub: `${pct.toFixed(0)}% done`, color: "#e2e8f0" },
                      { label: "NEED/WK", val: `${neededPerWeek.toFixed(1)}h`, sub: `plan: ${WEEKLY_RATE[s.id]}h`, color: neededPerWeek > WEEKLY_RATE[s.id] ? "#f87171" : "#34d399" },
                    ].map(({ label, val, sub, color }) => (
                      <div key={label} style={{ background: "#0a0f1e", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 9, color: "#475569", marginBottom: 4, letterSpacing: "0.08em" }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 500, color }}>{val}</div>
                        <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#e2e8f0" }}>💪 Workouts</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>45min · 5 days/week</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 500, color: "#34d399" }}>{workoutDays}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>sessions</div>
              </div>
            </div>
          </>
        )}

        {/* ─── HISTORY ─── */}
        {activeTab === "history" && (
          <>
            <div style={{ color: "#334155", fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>DAILY LOG</div>
            {Object.keys(logs).length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "#334155", padding: 40 }}>No sessions logged yet.</div>
            ) : (
              Object.entries(logs).sort(([a], [b]) => b.localeCompare(a)).map(([date, entry]) => {
                const total = SUBJECTS.reduce((s, sub) => s + (parseFloat(entry[sub.id]) || 0), 0);
                const d = new Date(date + "T12:00:00");
                const didWorkout = workout[date];
                const workoutScheduled = !NO_WORKOUT_DAYS.includes(d.getDay());
                return (
                  <div key={date} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>
                        {d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {workoutScheduled && <span style={{ fontSize: 11, color: didWorkout ? "#34d399" : "#334155" }}>{didWorkout ? "💪" : "○"} workout</span>}
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0" }}>{total.toFixed(1)}h</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {SUBJECTS.map(s => {
                        const h = parseFloat(entry[s.id]) || 0;
                        if (!h) return null;
                        return <span key={s.id} className="pill" style={{ background: s.dim, color: s.color }}>{s.label} {h}h</span>;
                      })}
                    </div>
                  </div>
                );
              })
            )}
            {Object.keys(logs).length > 0 && (
              <div className="card" style={{ background: "#0a0f1e" }}>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>ALL-TIME</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                  {SUBJECTS.map(s => (
                    <div key={s.id} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 500, color: s.color }}>{getTotalHours(s.id).toFixed(1)}<span style={{ fontSize: 10 }}>h</span></div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: "#334155" }}>/{s.target}h</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
