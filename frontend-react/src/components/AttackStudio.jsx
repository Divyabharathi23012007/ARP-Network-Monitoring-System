import React, { useState } from 'react';
import { Flame, Split, Radio, Wind, Repeat, Terminal, Send, Zap } from 'lucide-react';

export default function AttackStudio({ onLaunchAttack, onSendCustomPacket }) {
  const [customForm, setCustomForm] = useState({
    opcode: 2,
    sender_ip: '192.168.1.1',
    sender_mac: 'AA:BB:CC:DD:EE:66',
    target_ip: '192.168.1.101',
    target_mac: '00:1A:2B:3C:4D:A1',
  });

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    onSendCustomPacket({
      ...customForm,
      opcode: parseInt(customForm.opcode),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Attack Scenarios (2 Cols) */}
      <div className="lg:col-span-2 space-y-3">
        <div className="cyber-card p-4">
          <h3 className="font-bold text-sm text-red-600 flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4" /> Pre-Configured ARP Attack Scenarios
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Launch standard and sophisticated ARP attack scenarios against the virtual network to test detection algorithms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Scenario 1: MITM */}
            <div className="p-3.5 rounded-lg border flex flex-col justify-between bg-red-50/50 border-red-200 hover:border-red-400 dark:bg-slate-900 dark:border-red-900/40 dark:hover:border-red-600 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <Split className="w-4 h-4 text-red-600" /> Man-In-The-Middle (MITM) Poisoning
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                    CRITICAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Poisons Host A (<span className="font-mono font-semibold">192.168.1.101</span>) and Default Gateway (
                  <span className="font-mono font-semibold">192.168.1.1</span>) simultaneously, intercepting all bidirectional subnet traffic.
                </p>
              </div>
              <button
                onClick={() =>
                  onLaunchAttack({
                    attack_type: 'mitm',
                    victim_ip: '192.168.1.101',
                    target_ip: '192.168.1.1',
                    spoofed_mac: 'AA:BB:CC:DD:EE:66',
                  })
                }
                className="w-full py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" /> Launch MITM Attack
              </button>
            </div>

            {/* Scenario 2: Gateway Hijack */}
            <div className="p-3.5 rounded-lg border flex flex-col justify-between bg-red-50/50 border-red-200 hover:border-red-400 dark:bg-slate-900 dark:border-red-900/40 dark:hover:border-red-600 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-amber-600" /> Default Gateway Impersonation
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                    CRITICAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Broadcasts fake Gratuitous ARP declaring the Gateway IP <span className="font-mono font-semibold">192.168.1.1</span> belongs to the Attacker MAC.
                </p>
              </div>
              <button
                onClick={() =>
                  onLaunchAttack({
                    attack_type: 'gateway_hijack',
                    target_ip: '192.168.1.1',
                    spoofed_mac: 'AA:BB:CC:DD:EE:66',
                  })
                }
                className="w-full py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" /> Launch Gateway Hijack
              </button>
            </div>

            {/* Scenario 3: GARP Storm */}
            <div className="p-3.5 rounded-lg border flex flex-col justify-between bg-amber-50/50 border-amber-200 hover:border-amber-400 dark:bg-slate-900 dark:border-amber-900/40 dark:hover:border-amber-600 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-amber-600" /> Gratuitous ARP (GARP) Storm
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                    HIGH
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Floods 12 rapid Gratuitous ARP frames to saturate switch forwarding tables and test sliding-window rate limit triggers.
                </p>
              </div>
              <button
                onClick={() =>
                  onLaunchAttack({
                    attack_type: 'garp_storm',
                    count: 12,
                  })
                }
                className="w-full py-1.5 rounded text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" /> Launch GARP Storm
              </button>
            </div>

            {/* Scenario 4: Flip Flop */}
            <div className="p-3.5 rounded-lg border flex flex-col justify-between bg-purple-50/50 border-purple-200 hover:border-purple-400 dark:bg-slate-900 dark:border-purple-900/40 dark:hover:border-purple-600 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-purple-600" /> High-Frequency MAC Flip-Flop
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800">
                    HIGH
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Alternates between legitimate and rogue MAC addresses in rapid succession to trigger the MAC Flapping churn detector.
                </p>
              </div>
              <button
                onClick={() =>
                  onLaunchAttack({
                    attack_type: 'flip_flop',
                    target_ip: '192.168.1.1',
                  })
                }
                className="w-full py-1.5 rounded text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" /> Launch Flip-Flop
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Packet Crafter Form (1 Col) */}
      <div className="cyber-card p-4">
        <h3 className="font-bold text-sm text-sky-600 flex items-center gap-2 mb-1">
          <Terminal className="w-4 h-4" /> Custom ARP Packet Builder
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Construct and inject an arbitrary ARP packet to test custom payload inspection rules.
        </p>

        <form onSubmit={handleCustomSubmit} className="space-y-2.5 text-xs font-mono">
          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">ARP Opcode</label>
            <select
              value={customForm.opcode}
              onChange={(e) => setCustomForm({ ...customForm, opcode: e.target.value })}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="2">2 - ARP Reply (is-at)</option>
              <option value="1">1 - ARP Request (who-has)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Sender IP (SPA)</label>
            <input
              type="text"
              value={customForm.sender_ip}
              onChange={(e) => setCustomForm({ ...customForm, sender_ip: e.target.value })}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Sender MAC (SHA)</label>
            <input
              type="text"
              value={customForm.sender_mac}
              onChange={(e) => setCustomForm({ ...customForm, sender_mac: e.target.value })}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Target IP (TPA)</label>
            <input
              type="text"
              value={customForm.target_ip}
              onChange={(e) => setCustomForm({ ...customForm, target_ip: e.target.value })}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">Target MAC (THA)</label>
            <input
              type="text"
              value={customForm.target_mac}
              onChange={(e) => setCustomForm({ ...customForm, target_mac: e.target.value })}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3 py-2 rounded text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" /> Inject Packet Into Subnet
          </button>
        </form>
      </div>
    </div>
  );
}
