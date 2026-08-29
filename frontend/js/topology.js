/**
 * Topology Visualizer - Interactive HTML5 Canvas Network Graph
 * Supports real-time animated packet pulses, node health indicators, and selection.
 */

class TopologyVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.selectedNode = null;
        this.packetAnimations = []; // array of active flying packets: { fromNode, toNode, progress, color, isAnomalous }
        this.switchPos = { x: 0.5, y: 0.48 };
        this.hoveredNode = null;

        this.initCanvasSize();
        window.addEventListener('resize', () => this.initCanvasSize());
        this.initEvents();
        this.animate();
    }

    initCanvasSize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = (rect.height || 520) * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height || 520;
    }

    updateData(nodesData) {
        this.nodes = nodesData;
        // Keep selected node up to date
        if (this.selectedNode) {
            const match = this.nodes.find(n => n.id === this.selectedNode.id);
            if (match) this.selectedNode = match;
        }
    }

    addPacketAnimation(senderIp, targetIp, isAnomalous, isHeal) {
        const senderNode = this.nodes.find(n => n.ip === senderIp);
        const isBroadcast = (targetIp === "0.0.0.0" || targetIp === "255.255.255.255" || targetIp === "FF:FF:FF:FF:FF:FF" || !targetIp);

        let color = "#38BDF8"; // Sky cyan for normal
        if (isAnomalous) color = "#EF4444"; // Red for attack
        if (isHeal) color = "#10B981"; // Emerald for heal

        if (senderNode) {
            if (isBroadcast) {
                // Broadcast: pulse to switch, then switch pulses to all other nodes
                this.packetAnimations.push({
                    from: { x: senderNode.x * this.width, y: senderNode.y * this.height },
                    to: { x: this.switchPos.x * this.width, y: this.switchPos.y * this.height },
                    progress: 0,
                    speed: 0.04,
                    color: color,
                    isBroadcast: true,
                    isAnomalous: isAnomalous
                });
            } else {
                const targetNode = this.nodes.find(n => n.ip === targetIp);
                if (targetNode) {
                    this.packetAnimations.push({
                        from: { x: senderNode.x * this.width, y: senderNode.y * this.height },
                        to: { x: targetNode.x * this.width, y: targetNode.y * this.height },
                        progress: 0,
                        speed: 0.03,
                        color: color,
                        isBroadcast: false,
                        isAnomalous: isAnomalous
                    });
                }
            }
        }
    }

    initEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.hoveredNode = null;
            for (const node of this.nodes) {
                const nx = node.x * this.width;
                const ny = node.y * this.height;
                const dist = Math.hypot(mouseX - nx, mouseY - ny);
                if (dist <= 30) {
                    this.hoveredNode = node;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
            this.canvas.style.cursor = 'default';
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.hoveredNode) {
                this.selectedNode = this.hoveredNode;
                if (window.app && typeof window.app.onNodeSelected === 'function') {
                    window.app.onNodeSelected(this.selectedNode);
                }
            }
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackgroundGrid();
        this.drawLinks();
        this.drawSwitch();
        this.drawPackets();
        this.drawNodes();

        requestAnimationFrame(() => this.animate());
    }

    drawBackgroundGrid() {
        this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
        this.ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < this.width; x += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    drawLinks() {
        const swX = this.switchPos.x * this.width;
        const swY = this.switchPos.y * this.height;

        for (const node of this.nodes) {
            const nx = node.x * this.width;
            const ny = node.y * this.height;

            this.ctx.beginPath();
            this.ctx.moveTo(swX, swY);
            this.ctx.lineTo(nx, ny);

            if (node.is_isolated) {
                this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                this.ctx.setLineDash([5, 5]);
            } else if (node.status === 'COMPROMISED') {
                this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
                this.ctx.setLineDash([]);
            } else {
                this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
                this.ctx.setLineDash([]);
            }

            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawSwitch() {
        const swX = this.switchPos.x * this.width;
        const swY = this.switchPos.y * this.height;

        // Switch Box
        this.ctx.fillStyle = '#1E293B';
        this.ctx.strokeStyle = '#38BDF8';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(swX - 45, swY - 26, 90, 52, 8);
        this.ctx.fill();
        this.ctx.stroke();

        // Switch Label
        this.ctx.fillStyle = '#38BDF8';
        this.ctx.font = 'bold 11px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('L2 SWITCH', swX, swY - 4);

        this.ctx.fillStyle = '#94A3B8';
        this.ctx.font = '9px monospace';
        this.ctx.fillText('DAI / CAM', swX, swY + 12);
    }

    drawNodes() {
        const now = Date.now();

        for (const node of this.nodes) {
            const nx = node.x * this.width;
            const ny = node.y * this.height;
            const isHovered = (this.hoveredNode && this.hoveredNode.id === node.id);
            const isSelected = (this.selectedNode && this.selectedNode.id === node.id);

            // Glow Halos based on Status
            if (node.is_isolated) {
                this.ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, 34, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (node.status === 'COMPROMISED') {
                const pulseRadius = 32 + Math.sin(now / 200) * 5;
                this.ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, pulseRadius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (node.role === 'attacker') {
                this.ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, 32, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, 30, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Outer Node Circle
            this.ctx.beginPath();
            this.ctx.arc(nx, ny, 25, 0, Math.PI * 2);

            let strokeColor = '#10B981';
            let fillColor = '#0F291E';

            if (node.is_isolated) {
                strokeColor = '#64748B';
                fillColor = '#1E293B';
            } else if (node.status === 'COMPROMISED') {
                strokeColor = '#EF4444';
                fillColor = '#3B1219';
            } else if (node.role === 'attacker') {
                strokeColor = '#A855F7';
                fillColor = '#2E1065';
            } else if (node.role === 'gateway') {
                strokeColor = '#3B82F6';
                fillColor = '#172554';
            }

            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            this.ctx.strokeStyle = isSelected ? '#FFFFFF' : strokeColor;
            this.ctx.lineWidth = isSelected ? 3 : (isHovered ? 2.5 : 1.8);
            this.ctx.stroke();

            // Node Icon / Text inside
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 12px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            let labelIcon = '💻';
            if (node.role === 'gateway') labelIcon = '🌐';
            if (node.role === 'server') labelIcon = '🖧';
            if (node.role === 'attacker') labelIcon = '💀';
            if (node.is_isolated) labelIcon = '🚫';

            this.ctx.fillText(labelIcon, nx, ny);

            // Node Labels below
            this.ctx.font = 'bold 11px Inter, sans-serif';
            this.ctx.fillStyle = node.status === 'COMPROMISED' ? '#F87171' : '#F1F5F9';
            this.ctx.fillText(node.name.split(' ')[0] + ' (' + node.ip.split('.').slice(2).join('.') + ')', nx, ny + 38);

            this.ctx.font = '9px monospace';
            this.ctx.fillStyle = '#94A3B8';
            this.ctx.fillText(node.mac, nx, ny + 50);

            // Status Badge
            if (node.is_isolated) {
                this.drawBadge(nx, ny - 32, 'ISOLATED', '#EF4444', '#7F1D1D');
            } else if (node.status === 'COMPROMISED') {
                this.drawBadge(nx, ny - 32, 'POISONED', '#EF4444', '#7F1D1D');
            }
        }
    }

    drawBadge(x, y, text, textColor, bgColor) {
        this.ctx.fillStyle = bgColor;
        this.ctx.strokeStyle = textColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(x - 30, y - 8, 60, 16, 4);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 8px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);
    }

    drawPackets() {
        for (let i = this.packetAnimations.length - 1; i >= 0; i--) {
            const p = this.packetAnimations[i];
            p.progress += p.speed;

            if (p.progress >= 1.0) {
                this.packetAnimations.splice(i, 1);
                continue;
            }

            const curX = p.from.x + (p.to.x - p.from.x) * p.progress;
            const curY = p.from.y + (p.to.y - p.from.y) * p.progress;

            // Draw glowing packet ball
            this.ctx.beginPath();
            this.ctx.arc(curX, curY, p.isAnomalous ? 7 : 5, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 12;
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset
        }
    }
}

