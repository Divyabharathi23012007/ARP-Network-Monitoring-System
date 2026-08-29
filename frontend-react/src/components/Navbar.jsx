import React from 'react';
import {
  Activity,
  Table2,
  Zap,
  Search,
  Bell,
  Lock,
  BarChart2,
  BookOpen,
} from 'lucide-react';

export default function Navbar({ currentTab, onTabChange }) {
  const tabs = [
    { id: 'overview', label: 'SOC Topology', icon: Activity },
    { id: 'cache', label: 'ARP Cache Matrix', icon: Table2 },
    { id: 'attack', label: 'Attack Simulator', icon: Zap, iconClass: 'text-red-500' },
    { id: 'packets', label: 'Wireshark-Lite Analyzer', icon: Search },
    { id: 'alerts', label: 'Security Alerts', icon: Bell, iconClass: 'text-amber-500' },
    { id: 'defense', label: 'Defense & Mitigation', icon: Lock, iconClass: 'text-emerald-500' },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart2 },
    { id: 'theory', label: 'Theory & Viva Prep', icon: BookOpen, iconClass: 'text-sky-500' },
  ];

  return (
    <nav className="mx-3 mb-3 flex flex-wrap gap-1.5 p-1 rounded-lg border bg-slate-200/80 border-slate-300 dark:bg-slate-900 dark:border-slate-800">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isActive
                ? 'bg-white text-sky-700 border-slate-300 shadow-sm dark:bg-blue-600/20 dark:text-blue-400 dark:border-blue-500/50'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent hover:bg-white/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <Icon className={`w-4 h-4 ${tab.iconClass || ''}`} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
