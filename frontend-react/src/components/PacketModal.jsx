import React from 'react';
import { Binary, X } from 'lucide-react';

export default function PacketModal({ packet, onClose }) {
  if (!packet) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="cyber-card p-5 border border-sky-400 max-w-2xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Binary className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Deep Packet Inspection & Field Breakdown</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4 font-mono text-xs">
          <div className="p-3 rounded border bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            <h6 className="font-bold text-sky-600 dark:text-sky-400 mb-2">FRAME / ETHERNET LAYER II</h6>
            <div className="grid grid-cols-2 gap-2">
              <div>Destination MAC: <strong className="text-slate-900 dark:text-slate-100">{packet.target_mac}</strong></div>
              <div>Source MAC: <strong className="text-slate-900 dark:text-slate-100">{packet.sender_mac}</strong></div>
              <div>EtherType: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0x0806 (ARP)</span></div>
              <div>Frame Time: <span className="text-slate-500 dark:text-slate-400">{packet.time_str}</span></div>
            </div>
          </div>

          <div className="p-3 rounded border bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            <h6 className="font-bold text-sky-600 dark:text-sky-400 mb-2">ADDRESS RESOLUTION PROTOCOL (ARP) DECODER</h6>
            <div className="grid grid-cols-2 gap-2">
              <div>Hardware Type: <strong>{packet.hw_type || 1} (Ethernet 10Mb)</strong></div>
              <div>Protocol Type: <strong>{packet.proto_type || '0x0800'} (IPv4)</strong></div>
              <div>Hardware Size: <strong>{packet.hw_size || 6} bytes</strong></div>
              <div>Protocol Size: <strong>{packet.proto_size || 4} bytes</strong></div>
              <div>Opcode: <strong className="text-amber-600 dark:text-amber-400">{packet.opcode} ({packet.opcode_name})</strong></div>
              <div>Gratuitous ARP: <strong>{packet.is_gratuitous ? 'Yes (Announcement)' : 'No'}</strong></div>
              <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>Sender MAC Address: <strong className="text-sky-600 dark:text-cyan-400">{packet.sender_mac}</strong></div>
                <div>Sender IP Address: <strong className="text-sky-600 dark:text-cyan-400">{packet.sender_ip}</strong></div>
                <div>Target MAC Address: <strong className="text-slate-700 dark:text-slate-300">{packet.target_mac}</strong></div>
                <div>Target IP Address: <strong className="text-slate-700 dark:text-slate-300">{packet.target_ip}</strong></div>
              </div>
            </div>
          </div>

          {packet.is_anomalous && (
            <div className="bg-red-50 border border-red-300 p-3 rounded text-red-800 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300">
              <h6 className="font-bold text-red-600 dark:text-red-400 mb-1">⚠️ ANOMALY SIGNATURES DETECTED</h6>
              <ul className="list-disc list-inside space-y-1">
                {(packet.anomaly_reasons || []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 rounded border bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800">
            <h6 className="font-bold text-slate-500 dark:text-slate-400 mb-1">RAW FRAME HEX DUMP</h6>
            <div className="p-2 bg-slate-100 rounded text-emerald-700 dark:bg-black/80 dark:text-emerald-400 font-mono text-[11px] break-all leading-relaxed">
              {packet.raw_hex || 'FF FF FF FF FF FF 00 1A 2B 3C 4D 01 08 06 00 01 08 00 06 04 00 01'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
