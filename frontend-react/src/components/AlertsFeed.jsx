import React from 'react';
import { ShieldAlert, ShieldCheck, Wrench } from 'lucide-react';

export default function AlertsFeed({ alerts = [] }) {
  return (
    <div className="space-y-3">
      <div className="cyber-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">Security Anomaly & Incident Log</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time alert notifications triggered by DAI baseline violations, rate spikes, and churn detectors.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <ShieldCheck className="inline-block w-8 h-8 text-emerald-500 mb-2" />
            <p>No active anomalies detected. Network operating normally.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            let badgeClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
            if (alert.severity === 'HIGH') badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800';
            if (alert.severity === 'MEDIUM') badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800';

            return (
              <div
                key={alert.id}
                className="cyber-card p-4 border-l-4 border-l-red-500 glow-red animate-fade-in mb-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                      {alert.severity}
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">{alert.attack_type}</h5>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{alert.time_str}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">{alert.description}</p>
                <div className="p-2 rounded text-[11px] font-mono flex flex-wrap gap-x-4 gap-y-1 mb-2 border bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-400">
                  <div>
                    <span className="text-slate-500">Victim:</span>{' '}
                    <strong className="text-slate-900 dark:text-slate-200">{alert.victim_ip}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Claimed MAC:</span>{' '}
                    <strong className="text-red-600 dark:text-red-400">{alert.claimed_mac}</strong>
                  </div>
                  {alert.legitimate_mac && (
                    <div>
                      <span className="text-slate-500">Legitimate:</span>{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">{alert.legitimate_mac}</strong>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 inline-block" />
                  <span>
                    <strong>Recommended Fix:</strong>{' '}
                    {alert.mitigation_suggested || 'Quarantine MAC and verify Static Bindings.'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
