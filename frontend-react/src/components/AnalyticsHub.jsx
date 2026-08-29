import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Printer, Download } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function AnalyticsHub({ trafficHistory = [], metrics, alerts = [] }) {
  const lineLabels = trafficHistory.map((_, i) => `-${(trafficHistory.length - 1 - i) * 2}s`);
  const reqData = trafficHistory.map((t) => t.requests || 0);
  const repData = trafficHistory.map((t) => t.replies || 0);
  const garpData = trafficHistory.map((t) => t.garp || 0);
  const anomData = trafficHistory.map((t) => t.anomalies || 0);

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'ARP Requests',
        data: reqData,
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'ARP Replies',
        data: repData,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Gratuitous ARP',
        data: garpData,
        borderColor: '#D97706',
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Anomalies / Attacks',
        data: anomData,
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointRadius: 4,
      },
    ],
  };

  const doughnutData = {
    labels: [
      'MITM Poisoning',
      'Gateway Hijack',
      'GARP Storm',
      'Flip-Flop Churn',
      'Malformed Bogon',
      'Normal Traffic',
    ],
    datasets: [
      {
        data: [
          alerts.filter((a) => a.attack_type?.includes('MITM')).length,
          alerts.filter((a) => a.attack_type?.includes('Hijack')).length,
          alerts.filter((a) => a.attack_type?.includes('Storm')).length,
          alerts.filter((a) => a.attack_type?.includes('Flip-Flop')).length,
          alerts.filter((a) => a.attack_type?.includes('Malformed') || a.attack_type?.includes('Bogon')).length,
          Math.max(5, 20 - alerts.length),
        ],
        backgroundColor: ['#EF4444', '#F97316', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981'],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const report = {
      project_title: 'ARP Network Monitoring System – Detect abnormal changes in simulated ARP mappings',
      generated_at: new Date().toISOString(),
      metrics: metrics,
      total_alerts: alerts.length,
      alerts: alerts,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARP_Forensics_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="cyber-card p-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">Network Forensics & Incident Audit Hub</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Statistical breakdown and exportable forensic summaries for presentation and evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF Report
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1.5 bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="cyber-card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">TOTAL PACKETS ANALYZED</div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-cyan-400 mt-1">{metrics?.total_packets || 0}</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">ANOMALIES DETECTED</div>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">{metrics?.anomalies_detected || 0}</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">MITIGATIONS APPLIED</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{metrics?.mitigations_applied || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Line Chart */}
        <div className="lg:col-span-2 cyber-card p-4 h-72 flex flex-col">
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">
            Real-Time Protocol Throughput (Packets / Second)
          </h4>
          <div className="flex-1 relative">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                scales: {
                  x: {
                    grid: { color: 'rgba(203, 213, 225, 0.4)' },
                    ticks: { color: '#64748B', font: { size: 10 } },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(203, 213, 225, 0.4)' },
                    ticks: { color: '#64748B', font: { size: 10 }, stepSize: 1 },
                  },
                },
                plugins: {
                  legend: {
                    labels: { color: '#334155', font: { size: 11 }, boxWidth: 12 },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="cyber-card p-4 h-72 flex flex-col">
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">Detected Threat Distribution</h4>
          <div className="flex-1 relative">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#334155', font: { size: 10 }, boxWidth: 10 },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
