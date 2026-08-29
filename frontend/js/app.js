/**
 * Main Application Controller - Cyber SOC Frontend
 */

class AppController {
    constructor() {
        this.ws = null;
        this.topology = null;
        this.analytics = null;
        this.soundEnabled = true;
        this.isStreamPaused = false;
        this.selectedPacket = null;
        this.selectedNode = null;
        this.currentTab = 'overview';
        this.autoDefense = false;
        this.audioCtx = null;

        this.init();
    }

    init() {
        // Initialize visualizer and analytics
        this.topology = new TopologyVisualizer('topologyCanvas');
        this.analytics = new AnalyticsEngine();

        this.initTabs();
        this.initWebSocket();
        this.initControls();
        this.fetchInitialData();
    }

    playAlertSound() {
        if (!this.soundEnabled) return;
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.25);
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }

    initTabs() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.nav-tab').forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-content').forEach(c => {
            if (c.id === `tab-${tabName}`) {
                c.classList.remove('hidden');
            } else {
                c.classList.add('hidden');
            }
        });

        if (tabName === 'overview' && this.topology) {
            setTimeout(() => this.topology.initCanvasSize(), 50);
        }
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/traffic`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.updateConnectionStatus(true);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleSocketMessage(msg);
            } catch (e) {
                console.error('WS Parse Error:', e);
            }
        };

        this.ws.onclose = () => {
            this.updateConnectionStatus(false);
            // Reconnect after 2 seconds
            setTimeout(() => this.initWebSocket(), 2000);
        };

        this.ws.onerror = () => {
            this.updateConnectionStatus(false);
        };
    }

    updateConnectionStatus(connected) {
        const badge = document.getElementById('wsStatusBadge');
        if (badge) {
            if (connected) {
                badge.className = 'tag-badge bg-emerald-950 text-emerald-400 border border-emerald-800';
                badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 live-pulse"></span> LIVE SOC CONNECTED';
            } else {
                badge.className = 'tag-badge bg-red-950 text-red-400 border border-red-800';
                badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-400"></span> DISCONNECTED (RETRYING...)';
            }
        }
    }

    handleSocketMessage(msg) {
        if (msg.type === 'INITIAL_STATE') {
            this.renderTopologyData(msg.data);
            if (msg.recent_packets) {
                msg.recent_packets.reverse().forEach(p => this.appendPacketRow(p, false));
            }
            if (msg.recent_alerts) {
                msg.recent_alerts.reverse().forEach(a => this.appendAlertCard(a, false));
            }
        } else if (msg.type === 'TOPOLOGY_UPDATE') {
            this.renderTopologyData(msg.data);
            if (msg.new_alerts && msg.new_alerts.length > 0) {
                msg.new_alerts.forEach(a => {
                    this.appendAlertCard(a, true);
                    this.playAlertSound();
                });
            }
        } else if (msg.type === 'PACKET_STREAM') {
            const p = msg.packet;
            if (p) {
                const isHeal = p.id && p.id.startsWith('HEAL');
                this.topology.addPacketAnimation(p.sender_ip, p.target_ip, p.is_anomalous, isHeal);
                if (!this.isStreamPaused) {
                    this.appendPacketRow(p, true);
                }
            }
            if (msg.alerts && msg.alerts.length > 0) {
                msg.alerts.forEach(a => {
                    this.appendAlertCard(a, true);
                    this.playAlertSound();
                });
            }
            if (msg.threat_metrics) {
                this.updateThreatMetrics(msg.threat_metrics);
            }
        } else if (msg.type === 'RESET') {
            this.renderTopologyData(msg.data);
            document.getElementById('packetStreamTableBody').innerHTML = '';
            document.getElementById('alertsFeedContainer').innerHTML = `
                <div class="text-center py-8 text-slate-500 text-sm">
                    <i class="lucide lucide-shield-check inline-block w-8 h-8 text-emerald-500/50 mb-2"></i>
                    <p>No active anomalies detected. Network operating normally.</p>
                </div>
            `;
        }
    }

    async fetchInitialData() {
        try {
            const [topRes, scriptsRes] = await Promise.all([
                fetch('/api/topology'),
                fetch('/api/mitigation/scripts')
            ]);
            const topData = await topRes.json();
            this.renderTopologyData(topData);

            const scriptsData = await scriptsRes.json();
            this.renderDefenseScripts(scriptsData);
        } catch (e) {
            console.error('Fetch error:', e);
        }
    }

    renderTopologyData(data) {
        if (!data) return;
        this.topology.updateData(data.nodes);
        this.updateThreatMetrics(data.metrics);
        this.renderArpCacheMatrix(data.nodes);
        this.renderIsolationTable(data.nodes, data.isolated_macs || []);

        if (this.selectedNode) {
            const match = data.nodes.find(n => n.id === this.selectedNode.id);
            if (match) this.renderNodeDetailDrawer(match);
        }
    }

    updateThreatMetrics(metrics) {
        if (!metrics) return;
        
        // Threat Score Bar & Gauge
        const score = metrics.current_threat_score;
        const level = metrics.threat_level;
        
        const scoreVal = document.getElementById('threatScoreVal');
        const levelBadge = document.getElementById('threatLevelBadge');
        const scoreBar = document.getElementById('threatScoreBar');

        if (scoreVal) scoreVal.innerText = `${score}/100`;
        if (scoreBar) {
            scoreBar.style.width = `${score}%`;
            if (level === 'CRITICAL') scoreBar.className = 'threat-meter-fill h-full bg-red-600';
            else if (level === 'HIGH') scoreBar.className = 'threat-meter-fill h-full bg-amber-500';
            else if (level === 'ELEVATED') scoreBar.className = 'threat-meter-fill h-full bg-yellow-400';
            else scoreBar.className = 'threat-meter-fill h-full bg-emerald-500';
        }

        if (levelBadge) {
            levelBadge.innerText = level;
            if (level === 'CRITICAL') levelBadge.className = 'tag-badge bg-red-950 text-red-400 border border-red-800';
            else if (level === 'HIGH') levelBadge.className = 'tag-badge bg-amber-950 text-amber-400 border border-amber-800';
            else if (level === 'ELEVATED') levelBadge.className = 'tag-badge bg-yellow-950 text-yellow-400 border border-yellow-800';
            else levelBadge.className = 'tag-badge bg-emerald-950 text-emerald-400 border border-emerald-800';
        }

        // Mini counters
        this.setElText('statTotalPackets', metrics.total_packets);
        this.setElText('statRequests', metrics.arp_requests);
        this.setElText('statReplies', metrics.arp_replies);
        this.setElText('statAnomalies', metrics.anomalies_detected);

        // Push to throughput chart
        if (this.analytics) {
            this.analytics.pushTrafficData(
                metrics.arp_requests,
                metrics.arp_replies,
                metrics.gratuitous_arp,
                metrics.anomalies_detected
            );
        }

        // Auto defense toggle status
        const autoDefCheck = document.getElementById('autoDefenseCheckbox');
        if (autoDefCheck) autoDefCheck.checked = metrics.auto_defense_enabled;
    }

    setElText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val !== undefined ? val : '-';
    }

    renderArpCacheMatrix(nodes) {
        const container = document.getElementById('arpCacheMatrixContainer');
        if (!container) return;

        let html = '';
        nodes.forEach(node => {
            const isCompromised = node.status === 'COMPROMISED';
            const isIsolated = node.is_isolated;

            let cardBorder = 'border-slate-800';
            let titleColor = 'text-slate-200';
            if (isIsolated) { cardBorder = 'border-slate-600 opacity-70'; titleColor = 'text-slate-400'; }
            else if (isCompromised) { cardBorder = 'border-red-500/80 glow-red'; titleColor = 'text-red-400'; }

            html += `
                <div class="cyber-card p-4 border ${cardBorder}">
                    <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                        <div>
                            <h4 class="font-bold text-sm ${titleColor} flex items-center gap-2">
                                ${node.role === 'gateway' ? '🌐' : (node.role === 'server' ? '🖧' : (node.role === 'attacker' ? '💀' : '💻'))}
                                ${node.name}
                            </h4>
                            <div class="text-xs font-mono text-slate-400">${node.ip} • <span class="text-cyan-400">${node.mac}</span></div>
                        </div>
                        <span class="tag-badge ${isCompromised ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}">
                            ${node.status}
                        </span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs font-mono">
                            <thead>
                                <tr class="text-slate-400 border-b border-slate-800/80 text-left">
                                    <th class="pb-1 font-semibold">IP Address</th>
                                    <th class="pb-1 font-semibold">MAC Address</th>
                                    <th class="pb-1 font-semibold">State</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/40">
            `;

            if (node.arp_cache && node.arp_cache.length > 0) {
                node.arp_cache.forEach(entry => {
                    const isEntryPoisoned = entry.is_poisoned;
                    const rowClass = isEntryPoisoned ? 'cache-row-poisoned' : '';
                    html += `
                        <tr class="${rowClass}">
                            <td class="py-1.5">${entry.ip}</td>
                            <td class="py-1.5 font-semibold ${isEntryPoisoned ? 'text-red-400' : 'text-slate-300'}">${entry.mac}</td>
                            <td class="py-1.5">
                                <span class="inline-block px-1.5 py-0.5 rounded text-[10px] ${isEntryPoisoned ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-300'}">
                                    ${entry.state}
                                </span>
                            </td>
                        </tr>
                    `;
                });
            } else {
                html += `<tr><td colspan="3" class="py-3 text-center text-slate-500 italic">Cache empty</td></tr>`;
            }

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    appendPacketRow(pkt, prepend = true) {
        const tbody = document.getElementById('packetStreamTableBody');
        if (!tbody) return;

        const isAnom = pkt.is_anomalous;
        const isHeal = pkt.id && pkt.id.startsWith('HEAL');
        
        let rowClass = 'hover:bg-slate-800/50 cursor-pointer text-xs font-mono transition-colors';
        if (isAnom) rowClass += ' packet-row-anomalous';
        if (isHeal) rowClass += ' packet-row-heal';

        let opcodeBadge = `<span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">REQ</span>`;
        if (pkt.opcode === 2) {
            opcodeBadge = pkt.is_gratuitous ? 
                `<span class="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">GARP</span>` : 
                `<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">REP</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td class="py-2 px-3 text-slate-400">${pkt.time_str}</td>
            <td class="py-2 px-3 font-semibold text-slate-300">${pkt.id}</td>
            <td class="py-2 px-3">${opcodeBadge}</td>
            <td class="py-2 px-3 text-cyan-300">${pkt.sender_ip} <span class="text-slate-500 text-[10px]">(${pkt.sender_mac})</span></td>
            <td class="py-2 px-3 text-slate-300">${pkt.target_ip}</td>
            <td class="py-2 px-3">
                ${isAnom ? `<span class="text-red-400 font-bold flex items-center gap-1">⚠️ ANOMALY</span>` : `<span class="text-emerald-400">Normal</span>`}
            </td>
        `;

        tr.addEventListener('click', () => {
            this.openPacketInspectorModal(pkt);
        });

        if (prepend && tbody.firstChild) {
            tbody.insertBefore(tr, tbody.firstChild);
        } else {
            tbody.appendChild(tr);
        }

        // Limit rows to 100
        while (tbody.children.length > 100) {
            tbody.removeChild(tbody.lastChild);
        }
    }

    appendAlertCard(alert, prepend = true) {
        const container = document.getElementById('alertsFeedContainer');
        if (!container) return;

        // Clear empty placeholder if present
        if (container.querySelector('.text-slate-500')) {
            container.innerHTML = '';
        }

        let badgeClass = 'bg-red-950 text-red-400 border-red-800';
        if (alert.severity === 'HIGH') badgeClass = 'bg-amber-950 text-amber-400 border-amber-800';
        if (alert.severity === 'MEDIUM') badgeClass = 'bg-yellow-950 text-yellow-400 border-yellow-800';

        const div = document.createElement('div');
        div.className = 'cyber-card p-4 border border-red-500/40 glow-red animate-fade-in mb-3';
        div.innerHTML = `
            <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                    <span class="tag-badge ${badgeClass}">${alert.severity}</span>
                    <h5 class="font-bold text-sm text-slate-100">${alert.attack_type}</h5>
                </div>
                <span class="text-xs font-mono text-slate-400">${alert.time_str}</span>
            </div>
            <p class="text-xs text-slate-300 mb-2 leading-relaxed">${alert.description}</p>
            <div class="bg-slate-900/80 p-2 rounded text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mb-2">
                <div><span class="text-slate-500">Victim:</span> <strong class="text-slate-200">${alert.victim_ip}</strong></div>
                <div><span class="text-slate-500">Claimed MAC:</span> <strong class="text-red-400">${alert.claimed_mac}</strong></div>
                ${alert.legitimate_mac ? `<div><span class="text-slate-500">Legitimate:</span> <strong class="text-emerald-400">${alert.legitimate_mac}</strong></div>` : ''}
            </div>
            <div class="text-[11px] text-sky-400 flex items-center gap-1.5">
                <i class="lucide lucide-wrench inline-block w-3.5 h-3.5"></i>
                <span><strong>Recommended Fix:</strong> ${alert.mitigation_suggested || 'Quarantine MAC and verify Static Bindings.'}</span>
            </div>
        `;

        if (prepend && container.firstChild) {
            container.insertBefore(div, container.firstChild);
        } else {
            container.appendChild(div);
        }

        // Update attack distribution chart if analytics active
        if (this.analytics) {
            fetch('/api/export/summary').then(r => r.json()).then(d => {
                if (d.attack_breakdown) this.analytics.updateAttackDistribution(d.attack_breakdown);
            }).catch(() => {});
        }
    }

    openPacketInspectorModal(pkt) {
        this.selectedPacket = pkt;
        const modal = document.getElementById('packetModal');
        const content = document.getElementById('packetModalContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="space-y-4 font-mono text-xs">
                <div class="bg-slate-950 p-3 rounded border border-slate-800">
                    <h6 class="font-bold text-sky-400 mb-2">FRAME / ETHERNET LAYER II</h6>
                    <div class="grid grid-cols-2 gap-2 text-slate-300">
                        <div>Destination MAC: <strong class="text-slate-100">${pkt.target_mac}</strong></div>
                        <div>Source MAC: <strong class="text-slate-100">${pkt.sender_mac}</strong></div>
                        <div>EtherType: <span class="text-emerald-400">0x0806 (ARP)</span></div>
                        <div>Frame Time: <span class="text-slate-400">${pkt.time_str}</span></div>
                    </div>
                </div>

                <div class="bg-slate-950 p-3 rounded border border-slate-800">
                    <h6 class="font-bold text-sky-400 mb-2">ADDRESS RESOLUTION PROTOCOL (ARP) DECODER</h6>
                    <div class="grid grid-cols-2 gap-2 text-slate-300">
                        <div>Hardware Type: <strong>${pkt.hw_type} (Ethernet 10Mb)</strong></div>
                        <div>Protocol Type: <strong>${pkt.proto_type} (IPv4)</strong></div>
                        <div>Hardware Size: <strong>${pkt.hw_size} bytes</strong></div>
                        <div>Protocol Size: <strong>${pkt.proto_size} bytes</strong></div>
                        <div>Opcode: <strong class="text-amber-400">${pkt.opcode} (${pkt.opcode_name})</strong></div>
                        <div>Gratuitous ARP: <strong>${pkt.is_gratuitous ? 'Yes (Announcement)' : 'No'}</strong></div>
                        <div class="col-span-2 pt-2 border-t border-slate-800">
                            <div>Sender MAC Address: <strong class="text-cyan-400">${pkt.sender_mac}</strong></div>
                            <div>Sender IP Address: <strong class="text-cyan-400">${pkt.sender_ip}</strong></div>
                            <div>Target MAC Address: <strong class="text-slate-300">${pkt.target_mac}</strong></div>
                            <div>Target IP Address: <strong class="text-slate-300">${pkt.target_ip}</strong></div>
                        </div>
                    </div>
                </div>

                ${pkt.is_anomalous ? `
                    <div class="bg-red-950/60 p-3 rounded border border-red-800">
                        <h6 class="font-bold text-red-400 mb-1 flex items-center gap-1.5">
                            ⚠️ ANOMALY SIGNATURES DETECTED
                        </h6>
                        <ul class="list-disc list-inside text-red-300 space-y-1">
                            ${pkt.anomaly_reasons.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="bg-slate-950 p-3 rounded border border-slate-800">
                    <h6 class="font-bold text-slate-400 mb-1">RAW FRAME HEX DUMP</h6>
                    <div class="p-2 bg-black/80 rounded text-emerald-400 font-mono text-[11px] break-all leading-relaxed">
                        ${pkt.raw_hex || 'FF FF FF FF FF FF 00 1A 2B 3C 4D 01 08 06 00 01 08 00 06 04 00 01'}
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    onNodeSelected(node) {
        this.selectedNode = node;
        this.renderNodeDetailDrawer(node);
    }

    renderNodeDetailDrawer(node) {
        const drawer = document.getElementById('nodeDetailDrawer');
        if (!drawer) return;

        drawer.innerHTML = `
            <div class="cyber-card p-4 border border-sky-500/40">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <div>
                        <h4 class="font-bold text-sm text-slate-100 flex items-center gap-2">
                            ${node.role === 'gateway' ? '🌐' : (node.role === 'server' ? '🖧' : (node.role === 'attacker' ? '💀' : '💻'))}
                            ${node.name}
                        </h4>
                        <div class="text-xs font-mono text-slate-400">${node.ip} • <span class="text-cyan-400">${node.mac}</span></div>
                    </div>
                    <span class="tag-badge ${node.status === 'COMPROMISED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}">
                        ${node.status}
                    </span>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 mb-3 bg-slate-950 p-2.5 rounded">
                    <div>Operating System: <strong class="text-slate-100">${node.os}</strong></div>
                    <div>Packets Sent: <strong class="text-cyan-400">${node.packets_sent}</strong></div>
                    <div>Packets Received: <strong class="text-emerald-400">${node.packets_received}</strong></div>
                    <div>Quarantine State: <strong class="${node.is_isolated ? 'text-red-400' : 'text-slate-400'}">${node.is_isolated ? 'ISOLATED' : 'ACTIVE'}</strong></div>
                </div>

                <div class="flex gap-2 mb-3">
                    ${node.role === 'attacker' ? `
                        <button onclick="window.app.toggleNodeIsolation('${node.mac}', ${!node.is_isolated})" 
                            class="px-3 py-1.5 rounded text-xs font-bold ${node.is_isolated ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'} flex items-center gap-1.5">
                            <i class="lucide ${node.is_isolated ? 'lucide-unlock' : 'lucide-lock'} w-3.5 h-3.5"></i>
                            ${node.is_isolated ? 'Restore Port Link' : 'Quarantine Attacker Port'}
                        </button>
                    ` : ''}
                </div>

                <h5 class="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Internal ARP Table Cache</h5>
                <div class="max-h-48 overflow-y-auto">
                    <table class="w-full text-xs font-mono">
                        <thead class="text-slate-400 border-b border-slate-800 text-left">
                            <tr>
                                <th class="pb-1">IP</th>
                                <th class="pb-1">MAC</th>
                                <th class="pb-1">State</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/40">
                            ${node.arp_cache && node.arp_cache.length > 0 ? node.arp_cache.map(e => `
                                <tr class="${e.is_poisoned ? 'cache-row-poisoned' : ''}">
                                    <td class="py-1.5">${e.ip}</td>
                                    <td class="py-1.5 ${e.is_poisoned ? 'text-red-400 font-bold' : 'text-slate-300'}">${e.mac}</td>
                                    <td class="py-1.5"><span class="px-1.5 py-0.5 rounded text-[10px] ${e.is_poisoned ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-300'}">${e.state}</span></td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" class="py-2 text-center text-slate-500">Cache empty</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderIsolationTable(nodes, isolatedMacs) {
        const tbody = document.getElementById('isolationTableBody');
        if (!tbody) return;

        tbody.innerHTML = nodes.map(n => {
            const isIso = isolatedMacs.includes(n.mac.toUpperCase()) || n.is_isolated;
            return `
                <tr class="border-b border-slate-800 hover:bg-slate-800/30 text-xs font-mono">
                    <td class="py-2 px-3 font-semibold text-slate-200">${n.name}</td>
                    <td class="py-2 px-3">${n.ip}</td>
                    <td class="py-2 px-3 text-cyan-400">${n.mac}</td>
                    <td class="py-2 px-3">
                        <span class="tag-badge ${isIso ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}">
                            ${isIso ? 'QUARANTINED' : 'FORWARDING'}
                        </span>
                    </td>
                    <td class="py-2 px-3">
                        <button onclick="window.app.toggleNodeIsolation('${n.mac}', ${!isIso})" 
                            class="px-2.5 py-1 rounded text-[11px] font-bold ${isIso ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-red-700 hover:bg-red-600 text-white'}">
                            ${isIso ? 'Unquarantine' : 'Isolate Port'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderDefenseScripts(scripts) {
        const winEl = document.getElementById('scriptWindowsCode');
        const linuxEl = document.getElementById('scriptLinuxCode');
        const ciscoEl = document.getElementById('scriptCiscoCode');

        if (winEl && scripts.windows) winEl.innerText = scripts.windows;
        if (linuxEl && scripts.linux) linuxEl.innerText = scripts.linux;
        if (ciscoEl && scripts.cisco) ciscoEl.innerText = scripts.cisco;
    }

    async toggleNodeIsolation(mac, isolate) {
        const endpoint = isolate ? '/api/mitigation/isolate' : '/api/mitigation/unisolate';
        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mac: mac })
            });
        } catch (e) {
            alert('Isolation action failed: ' + e);
        }
    }

    initControls() {
        // Attack buttons
        document.querySelectorAll('.btn-launch-attack').forEach(btn => {
            btn.addEventListener('click', async () => {
                const attackType = btn.getAttribute('data-attack');
                await this.launchAttack(attackType);
            });
        });

        // Auto Defense Checkbox
        const autoDefCheck = document.getElementById('autoDefenseCheckbox');
        if (autoDefCheck) {
            autoDefCheck.addEventListener('change', async (e) => {
                const enabled = e.target.checked;
                await fetch('/api/mitigation/auto-defense', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: enabled })
                });
            });
        }

        // Manual Healing Button
        const healBtn = document.getElementById('btnManualHeal');
        if (healBtn) {
            healBtn.addEventListener('click', async () => {
                healBtn.disabled = true;
                healBtn.innerHTML = '<span class="live-pulse"></span> Healing Caches...';
                try {
                    const res = await fetch('/api/mitigation/heal', { method: 'POST' });
                    const d = await res.json();
                    setTimeout(() => {
                        healBtn.disabled = false;
                        healBtn.innerHTML = '<i class="lucide lucide-shield-check inline-block w-4 h-4"></i> Broadcast Authoritative GARP Healing';
                    }, 1000);
                } catch (e) {
                    healBtn.disabled = false;
                    healBtn.innerText = 'Healing Failed';
                }
            });
        }

        // Reset Button
        const resetBtn = document.getElementById('btnResetSimulation');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm('Reset entire network simulation and wipe all alerts/anomalies?')) {
                    await fetch('/api/simulation/reset', { method: 'POST' });
                }
            });
        }

        // Sound Toggle
        const soundBtn = document.getElementById('btnSoundToggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                soundBtn.innerHTML = this.soundEnabled ? 
                    '<i class="lucide lucide-volume-2 w-4 h-4 text-emerald-400"></i>' : 
                    '<i class="lucide lucide-volume-x w-4 h-4 text-slate-500"></i>';
            });
        }

        // Stream Pause Toggle
        const pauseBtn = document.getElementById('btnPauseStream');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.isStreamPaused = !this.isStreamPaused;
                pauseBtn.innerHTML = this.isStreamPaused ? 
                    '<i class="lucide lucide-play w-4 h-4 text-emerald-400"></i> Resume' : 
                    '<i class="lucide lucide-pause w-4 h-4 text-amber-400"></i> Pause Stream';
            });
        }

        // Custom Packet Injector Form
        const customForm = document.getElementById('customPacketForm');
        if (customForm) {
            customForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const opcode = parseInt(document.getElementById('customOpcode').value);
                const senderIp = document.getElementById('customSenderIp').value;
                const senderMac = document.getElementById('customSenderMac').value;
                const targetIp = document.getElementById('customTargetIp').value;
                const targetMac = document.getElementById('customTargetMac').value;

                try {
                    const res = await fetch('/api/attack/custom', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            opcode: opcode,
                            sender_ip: senderIp,
                            sender_mac: senderMac,
                            target_ip: targetIp,
                            target_mac: targetMac
                        })
                    });
                    const data = await res.json();
                    alert('Custom ARP frame injected into network!');
                } catch (err) {
                    alert('Injection failed: ' + err);
                }
            });
        }
    }

    async launchAttack(attackType) {
        try {
            const res = await fetch('/api/attack/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attack_type: attackType,
                    target_ip: "192.168.1.1",
                    victim_ip: "192.168.1.101",
                    spoofed_mac: "AA:BB:CC:DD:EE:66",
                    count: 12
                })
            });
            const data = await res.json();
        } catch (e) {
            alert('Attack launch failed: ' + e);
        }
    }

    copyScript(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            navigator.clipboard.writeText(el.innerText);
            alert('Configuration commands copied to clipboard!');
        }
    }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});

