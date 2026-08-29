import React from 'react';
import { Layers, Pause, Play } from 'lucide-react';

export default function WiresharkAnalyzer({
  packets = [],
  isPaused,
  onTogglePause,
  onInspectPacket,
}) {
  return (
    <div className="space-y-3">
      <div className="cyber-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">Wireshark-Lite Live Packet Stream</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deep packet inspection for all Layer-2 Ethernet and ARP frame headers in real-time.
            </p>
          </div>
        </div>
        <button
          onClick={onTogglePause}
          className="px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1.5 bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-600" /> Resume Stream
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Stream
            </>
          )}
        </button>
      </div>

      <div className="cyber-card overflow-hidden">
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-mono sticky top-0 border-b bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Packet ID</th>
                <th className="py-2.5 px-3">Opcode</th>
                <th className="py-2.5 px-3">Sender (SPA / SHA)</th>
                <th className="py-2.5 px-3">Target (TPA)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-xs">
              {packets.map((pkt) => {
                const isAnom = pkt.is_anomalous;
                const isHeal = pkt.id && pkt.id.startsWith('HEAL');

                let rowBg = 'hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors';
                if (isAnom) rowBg = 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
                if (isHeal) rowBg = 'bg-emerald-50 border-l-4 border-emerald-500 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50';

                return (
                  <tr key={pkt.id} onClick={() => onInspectPacket(pkt)} className={rowBg}>
                    <td className="py-2 px-3 text-slate-500">{pkt.time_str}</td>
                    <td className="py-2 px-3 font-semibold">{pkt.id}</td>
                    <td className="py-2 px-3">
                      {pkt.opcode === 1 ? (
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-semibold dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800">
                          REQ
                        </span>
                      ) : pkt.is_gratuitous ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                          GARP
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                          REP
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sky-700 dark:text-cyan-300 font-semibold">
                      {pkt.sender_ip} <span className="text-slate-400 text-[10px]">({pkt.sender_mac})</span>
                    </td>
                    <td className="py-2 px-3">{pkt.target_ip}</td>
                    <td className="py-2 px-3">
                      {isAnom ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">⚠️ ANOMALY</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
