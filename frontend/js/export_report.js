/**
 * Forensics & Academic Incident Report Exporter
 */

class ReportExporter {
    static async downloadJsonReport() {
        try {
            const res = await fetch('/api/export/summary');
            const data = await res.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ARP_Forensics_Report_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Failed to generate JSON report: ' + e);
        }
    }

    static async printReport() {
        try {
            const res = await fetch('/api/export/summary');
            const data = await res.json();
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow popups to generate the printable report.');
                return;
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>ARP Network Security Forensic Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                        h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
                        h2 { color: #1e40af; margin-top: 25px; }
                        .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
                        .badge-critical { background: #fee2e2; color: #991b1b; }
                        .badge-high { background: #ffedd5; color: #9a3412; }
                        .badge-normal { background: #dcfce7; color: #166534; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
                        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                        th { background: #f1f5f9; }
                        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <h1>Computer Networks Mini Project - Forensic Incident Audit</h1>
                    <h3>${data.project_title}</h3>
                    
                    <div class="meta-box">
                        <p><strong>Generated At:</strong> ${data.generated_at}</p>
                        <p><strong>Network Security Threat Level:</strong> <span class="badge ${data.metrics.threat_level === 'CRITICAL' ? 'badge-critical' : 'badge-normal'}">${data.metrics.threat_level} (${data.metrics.current_threat_score} / 100)</span></p>
                        <p><strong>Total ARP Packets Analyzed:</strong> ${data.total_packets_recorded}</p>
                        <p><strong>Total Anomalies Detected:</strong> ${data.total_anomalies_recorded}</p>
                        <p><strong>Active Rogue Quarantines:</strong> ${data.isolated_macs.join(', ') || 'None'}</p>
                    </div>

                    <h2>1. Virtual Topology Status Summary</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Node Name</th>
                                <th>Role</th>
                                <th>IP Address</th>
                                <th>Legitimate MAC</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.nodes.map(n => `
                                <tr>
                                    <td><strong>${n.name}</strong></td>
                                    <td>${n.role}</td>
                                    <td><code>${n.ip}</code></td>
                                    <td><code>${n.mac}</code></td>
                                    <td><span class="badge ${n.status === 'COMPROMISED' ? 'badge-critical' : 'badge-normal'}">${n.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <h2>2. Security Incident Log (Recent Alerts)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Severity</th>
                                <th>Attack Type</th>
                                <th>Victim IP</th>
                                <th>Claimed MAC</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.recent_alerts.map(a => `
                                <tr>
                                    <td>${a.time_str}</td>
                                    <td><span class="badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}">${a.severity}</span></td>
                                    <td><strong>${a.attack_type}</strong></td>
                                    <td><code>${a.victim_ip}</code></td>
                                    <td><code>${a.claimed_mac}</code></td>
                                    <td>${a.description}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 11px; color: #64748b;">
                        Generated by ARP Network Monitoring System • Computer Networks Laboratory Mini Project.
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);

        } catch (e) {
            alert('Failed to print report: ' + e);
        }
    }
}

