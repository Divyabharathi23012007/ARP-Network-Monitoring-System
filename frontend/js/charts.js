/**
 * Charts Engine - Real-time Network Throughput & Attack Analytics
 */

class AnalyticsEngine {
    constructor() {
        this.trafficChart = null;
        this.attackChart = null;
        this.historyLength = 15;
        this.labels = [];
        this.reqData = [];
        this.repData = [];
        this.garpData = [];
        this.anomData = [];

        this.initCharts();
    }

    initCharts() {
        const trafficCtx = document.getElementById('trafficThroughputChart');
        if (trafficCtx) {
            for (let i = this.historyLength - 1; i >= 0; i--) {
                this.labels.push(`-${i * 2}s`);
                this.reqData.push(0);
                this.repData.push(0);
                this.garpData.push(0);
                this.anomData.push(0);
            }

            this.trafficChart = new Chart(trafficCtx, {
                type: 'line',
                data: {
                    labels: this.labels,
                    datasets: [
                        {
                            label: 'ARP Requests',
                            data: this.reqData,
                            borderColor: '#38BDF8',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 2
                        },
                        {
                            label: 'ARP Replies',
                            data: this.repData,
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 2
                        },
                        {
                            label: 'Gratuitous ARP',
                            data: this.garpData,
                            borderColor: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 2
                        },
                        {
                            label: 'Anomalies / Attacks',
                            data: this.anomData,
                            borderColor: '#EF4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderWidth: 3,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 300 },
                    scales: {
                        x: {
                            grid: { color: 'rgba(51, 65, 85, 0.3)' },
                            ticks: { color: '#94A3B8', font: { size: 10 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(51, 65, 85, 0.3)' },
                            ticks: { color: '#94A3B8', font: { size: 10 }, stepSize: 1 }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#E2E8F0', font: { size: 11 }, boxWidth: 12 }
                        }
                    }
                }
            });
        }

        const attackCtx = document.getElementById('attackDistributionChart');
        if (attackCtx) {
            this.attackChart = new Chart(attackCtx, {
                type: 'doughnut',
                data: {
                    labels: ['MITM Poisoning', 'Gateway Hijack', 'GARP Storm', 'Flip-Flop Churn', 'Bogon Headers', 'Normal Traffic'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0, 10],
                        backgroundColor: [
                            '#EF4444',
                            '#F97316',
                            '#F59E0B',
                            '#8B5CF6',
                            '#EC4899',
                            '#10B981'
                        ],
                        borderColor: '#111827',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#E2E8F0', font: { size: 10 }, boxWidth: 10 }
                        }
                    }
                }
            });
        }
    }

    pushTrafficData(req, rep, garp, anom) {
        if (!this.trafficChart) return;
        this.reqData.shift();
        this.reqData.push(req);
        this.repData.shift();
        this.repData.push(rep);
        this.garpData.shift();
        this.garpData.push(garp);
        this.anomData.shift();
        this.anomData.push(anom);
        this.trafficChart.update();
    }

    updateAttackDistribution(breakdown) {
        if (!this.attackChart) return;
        const keys = ['MITM ARP Poisoning', 'Critical Infrastructure Hijack', 'Gratuitous ARP (GARP) Storm', 'High-Frequency ARP Flip-Flop', 'Malformed ARP Header'];
        const values = keys.map(k => {
            let sum = 0;
            for (const [name, count] of Object.entries(breakdown || {})) {
                if (name.includes(k) || k.includes(name)) sum += count;
            }
            return sum;
        });

        const normalCount = Math.max(1, 20 - values.reduce((a, b) => a + b, 0));
        this.attackChart.data.datasets[0].data = [...values, normalCount];
        this.attackChart.update();
    }
}

