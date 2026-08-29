import React, { useState } from 'react';
import { Shield, FileCode, Copy, Check } from 'lucide-react';

export default function DefenseCenter({ nodes = [], isolatedMacs = [], onToggleIsolation, scripts = {} }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Switch Port Security */}
      <div className="cyber-card p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Switch Port Security & Quarantine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Isolate offending Layer-2 MAC addresses on the virtual switch.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3">Node</th>
                <th className="py-2 px-3">IP Address</th>
                <th className="py-2 px-3">MAC</th>
                <th className="py-2 px-3">State</th>
                <th className="py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {nodes.map((n) => {
                const isIso = isolatedMacs.includes(n.mac?.toUpperCase()) || n.is_isolated;
                return (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-200">{n.name}</td>
                    <td className="py-2 px-3">{n.ip}</td>
                    <td className="py-2 px-3 text-sky-600 dark:text-cyan-400 font-bold">{n.mac}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isIso
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                        }`}
                      >
                        {isIso ? 'QUARANTINED' : 'FORWARDING'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => onToggleIsolation(n.mac, !isIso)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          isIso
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        {isIso ? 'Unquarantine' : 'Isolate Port'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Static Binding Scripts */}
      <div className="cyber-card p-4 space-y-3">
        <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-sm text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
            <FileCode className="w-4 h-4" /> Static ARP Binding Deployment Scripts
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lock down IP-to-MAC associations permanently on host operating systems.
          </p>
        </div>

        {/* Windows */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Windows 10 / 11 (netsh)</span>
            <button
              onClick={() => copyToClipboard(scripts.windows || '', 'win')}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              {copiedKey === 'win' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copiedKey === 'win' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-2.5 rounded border text-[11px] font-mono overflow-x-auto max-h-28 bg-slate-50 border-slate-200 text-emerald-700 dark:bg-slate-950 dark:border-slate-800 dark:text-emerald-400">
            {scripts.windows || 'Loading...'}
          </pre>
        </div>

        {/* Linux */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Linux / Ubuntu (ip neigh)</span>
            <button
              onClick={() => copyToClipboard(scripts.linux || '', 'linux')}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              {copiedKey === 'linux' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copiedKey === 'linux' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-2.5 rounded border text-[11px] font-mono overflow-x-auto max-h-28 bg-slate-50 border-slate-200 text-emerald-700 dark:bg-slate-950 dark:border-slate-800 dark:text-emerald-400">
            {scripts.linux || 'Loading...'}
          </pre>
        </div>

        {/* Cisco */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cisco IOS Switch (Dynamic ARP Inspection)</span>
            <button
              onClick={() => copyToClipboard(scripts.cisco || '', 'cisco')}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              {copiedKey === 'cisco' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copiedKey === 'cisco' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-2.5 rounded border text-[11px] font-mono overflow-x-auto max-h-28 bg-slate-50 border-slate-200 text-emerald-700 dark:bg-slate-950 dark:border-slate-800 dark:text-emerald-400">
            {scripts.cisco || 'Loading...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
