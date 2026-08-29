import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function ArpCacheMatrix({ nodes = [], onRefresh }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg border bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">Synchronized ARP Cache Table Inspector</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time Layer-2 Address Resolution tables maintained inside each individual virtual node.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1 bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {nodes.map((node) => {
          const isCompromised = node.status === 'COMPROMISED';
          const isIsolated = node.is_isolated;

          let cardBorder = 'border-slate-200 dark:border-slate-800';
          let titleColor = 'text-slate-900 dark:text-slate-200';

          if (isIsolated) {
            cardBorder = 'border-slate-300 dark:border-slate-600 opacity-70';
            titleColor = 'text-slate-500 dark:text-slate-400';
          } else if (isCompromised) {
            cardBorder = 'border-red-400 dark:border-red-500/80 glow-red';
            titleColor = 'text-red-600 dark:text-red-400';
          }

          return (
            <div key={node.id} className={`cyber-card p-4 border ${cardBorder}`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className={`font-bold text-sm ${titleColor} flex items-center gap-2`}>
                    {node.role === 'gateway' ? '🌐' : node.role === 'server' ? '🖧' : node.role === 'attacker' ? '💀' : '💻'}
                    {node.name}
                  </h4>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {node.ip} • <span className="text-sky-600 dark:text-cyan-400 font-semibold">{node.mac}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isCompromised
                      ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                  }`}
                >
                  {node.status}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800/80 text-left">
                      <th className="pb-1 font-semibold">IP Address</th>
                      <th className="pb-1 font-semibold">MAC Address</th>
                      <th className="pb-1 font-semibold">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                    {node.arp_cache && node.arp_cache.length > 0 ? (
                      node.arp_cache.map((entry, i) => (
                        <tr key={i} className={entry.is_poisoned ? 'bg-red-50 text-red-800 font-semibold dark:bg-red-950/60 dark:text-red-200' : ''}>
                          <td className="py-1.5">{entry.ip}</td>
                          <td className={`py-1.5 font-semibold ${entry.is_poisoned ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {entry.mac}
                          </td>
                          <td className="py-1.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                entry.is_poisoned ? 'bg-red-200 text-red-800 font-bold dark:bg-red-900 dark:text-red-200' : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {entry.state}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-3 text-center text-slate-400 italic">
                          Cache empty
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
