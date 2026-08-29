import React from 'react';
import { ShieldAlert, ShieldCheck, RotateCcw, Volume2, VolumeX, Sun, Moon } from 'lucide-react';

export default function Header({
  metrics,
  isConnected,
  autoDefense,
  onToggleAutoDefense,
  onBroadcastHeal,
  onReset,
  soundEnabled,
  onToggleSound,
  isDark,
  onToggleTheme,
}) {
  const score = metrics?.current_threat_score || 0;
  const level = metrics?.threat_level || 'NORMAL';

  let badgeColor = isDark
    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
    : 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let barColor = 'bg-emerald-500';

  if (level === 'CRITICAL') {
    badgeColor = isDark
      ? 'bg-red-950 text-red-400 border-red-800'
      : 'bg-red-100 text-red-800 border-red-300';
    barColor = 'bg-red-600';
  } else if (level === 'HIGH') {
    badgeColor = isDark
      ? 'bg-amber-950 text-amber-400 border-amber-800'
      : 'bg-amber-100 text-amber-800 border-amber-300';
    barColor = 'bg-amber-500';
  } else if (level === 'ELEVATED') {
    badgeColor = isDark
      ? 'bg-yellow-950 text-yellow-400 border-yellow-800'
      : 'bg-yellow-100 text-yellow-800 border-yellow-300';
    barColor = 'bg-yellow-400';
  }

  return (
    <header className="cyber-card m-3 p-3.5 flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-wide flex items-center gap-2 text-slate-900 dark:text-white">
            ARP NETWORK MONITORING SYSTEM
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-mono dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
              SPRING BOOT + REACT
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Computer Networks Mini Project • Detect Abnormal Changes in Simulated ARP Mappings
          </p>
        </div>
      </div>

      {/* Threat Gauge & Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-yellow-300 dark:border-slate-700 dark:hover:bg-slate-700"
          title="Toggle Light / Dark Theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* Threat Score */}
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Threat Score</div>
            <div className="text-xs font-mono font-bold flex items-center justify-end gap-1.5 text-slate-900 dark:text-white">
              <span>{score}/100</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${badgeColor}`}>
                {level}
              </span>
            </div>
          </div>
          <div className="w-24 h-2.5 rounded-full overflow-hidden border bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700">
            <div
              className={`threat-meter-fill h-full ${barColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Auto Defense */}
        <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border bg-slate-100 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700">
          <input
            type="checkbox"
            checked={autoDefense}
            onChange={(e) => onToggleAutoDefense(e.target.checked)}
            className="rounded text-sky-600 focus:ring-0"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto-Mitigate</span>
        </label>

        {/* Action Buttons */}
        <button
          onClick={onBroadcastHeal}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <ShieldCheck className="w-4 h-4" />
          Broadcast Heal
        </button>

        <button
          onClick={onReset}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        <button
          onClick={onToggleSound}
          className="p-1.5 rounded-lg border bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Live Indicator */}
        <div
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${
            isConnected
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 live-pulse' : 'bg-red-500'
            }`}
          />
          {isConnected ? 'LIVE WS' : 'OFFLINE'}
        </div>
      </div>
    </header>
  );
}
