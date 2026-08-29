import React, { useRef, useEffect } from 'react';
import { Network, MousePointerClick, Unlock, Lock } from 'lucide-react';

export default function TopologyCanvas({
  nodes = [],
  metrics,
  selectedNode,
  onSelectNode,
  onToggleIsolation,
  flyingPackets = [],
  isDark = false,
}) {
  const canvasRef = useRef(null);
  const switchPos = { x: 0.5, y: 0.48 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height || 520;

      if (canvas.width !== width * window.devicePixelRatio || canvas.height !== height * window.devicePixelRatio) {
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      ctx.clearRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(226, 232, 240, 0.8)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Links
      const swX = switchPos.x * width;
      const swY = switchPos.y * height;

      nodes.forEach((node) => {
        const nx = (node.x || 0.5) * width;
        const ny = (node.y || 0.5) * height;

        ctx.beginPath();
        ctx.moveTo(swX, swY);
        ctx.lineTo(nx, ny);

        if (node.is_isolated) {
          ctx.strokeStyle = '#EF4444';
          ctx.setLineDash([5, 5]);
        } else if (node.status === 'COMPROMISED') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(14, 165, 233, 0.4)';
          ctx.setLineDash([]);
        }

        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw Switch Box
      ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
      ctx.strokeStyle = isDark ? '#38BDF8' : '#0284C7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(swX - 45, swY - 26, 90, 52, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#38BDF8' : '#0284C7';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('L2 SWITCH', swX, swY - 4);

      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.font = '9px monospace';
      ctx.fillText('DAI / CAM', swX, swY + 12);

      // Draw Flying Packets
      flyingPackets.forEach((p) => {
        const curX = p.from.x + (p.to.x - p.from.x) * p.progress;
        const curY = p.from.y + (p.to.y - p.from.y) * p.progress;

        ctx.beginPath();
        ctx.arc(curX, curY, p.isAnomalous ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Nodes
      const now = Date.now();
      nodes.forEach((node) => {
        const nx = (node.x || 0.5) * width;
        const ny = (node.y || 0.5) * height;
        const isSelected = selectedNode && selectedNode.id === node.id;

        // Halos
        if (node.is_isolated) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
          ctx.beginPath();
          ctx.arc(nx, ny, 34, 0, Math.PI * 2);
          ctx.fill();
        } else if (node.status === 'COMPROMISED') {
          const pulseRadius = 32 + Math.sin(now / 200) * 5;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.beginPath();
          ctx.arc(nx, ny, pulseRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (node.role === 'attacker') {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
          ctx.beginPath();
          ctx.arc(nx, ny, 32, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.beginPath();
          ctx.arc(nx, ny, 30, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(nx, ny, 25, 0, Math.PI * 2);

        let strokeColor = '#10B981';
        let fillColor = isDark ? '#0F291E' : '#ECFDF5';

        if (node.is_isolated) {
          strokeColor = '#64748B';
          fillColor = isDark ? '#1E293B' : '#F1F5F9';
        } else if (node.status === 'COMPROMISED') {
          strokeColor = '#EF4444';
          fillColor = isDark ? '#3B1219' : '#FEF2F2';
        } else if (node.role === 'attacker') {
          strokeColor = '#A855F7';
          fillColor = isDark ? '#2E1065' : '#FAF5FF';
        } else if (node.role === 'gateway') {
          strokeColor = '#0284C7';
          fillColor = isDark ? '#172554' : '#F0F9FF';
        }

        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = isSelected ? (isDark ? '#FFFFFF' : '#0F172A') : strokeColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        // Node Label / Emoji
        ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let labelIcon = '💻';
        if (node.role === 'gateway') labelIcon = '🌐';
        if (node.role === 'server') labelIcon = '🖧';
        if (node.role === 'attacker') labelIcon = '💀';
        if (node.is_isolated) labelIcon = '🚫';

        ctx.fillText(labelIcon, nx, ny);

        // Subtitles below node
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = node.status === 'COMPROMISED' ? '#DC2626' : (isDark ? '#F1F5F9' : '#0F172A');
        ctx.fillText(
          node.name.split(' ')[0] + ' (' + node.ip.split('.').slice(2).join('.') + ')',
          nx,
          ny + 38
        );

        ctx.font = '9px monospace';
        ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
        ctx.fillText(node.mac, nx, ny + 50);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, selectedNode, flyingPackets, isDark]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const node of nodes) {
      const nx = (node.x || 0.5) * rect.width;
      const ny = (node.y || 0.5) * (rect.height || 520);
      const dist = Math.hypot(mouseX - nx, mouseY - ny);
      if (dist <= 30) {
        onSelectNode(node);
        return;
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Left 2 Cols: Canvas */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="cyber-card p-3 flex-1 relative flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">
                Interactive Virtual Subnet Topology
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">192.168.1.0/24</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Healthy
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 live-pulse"></span> Poisoned
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Attacker
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Isolated
              </span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full flex-1 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 cursor-pointer"
            style={{ minHeight: '440px' }}
          />

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tip: Click on any node circle to inspect its live ARP cache and hardware bindings.</span>
            <span className="font-mono text-sky-600 font-bold">Packet Speed: 1.0x Realtime</span>
          </div>
        </div>
      </div>

      {/* Right 1 Col: Stats & Node Detail */}
      <div className="flex flex-col gap-3">
        {/* Mini Stats */}
        <div className="cyber-card p-3.5 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block font-semibold">TOTAL ARP FRAMES</span>
            <span className="text-base font-bold font-mono text-sky-600 dark:text-cyan-400">
              {metrics?.total_packets || 0}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block font-semibold">ANOMALIES CAUGHT</span>
            <span className="text-base font-bold font-mono text-red-600 dark:text-red-400">
              {metrics?.anomalies_detected || 0}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block font-semibold">ARP REQUESTS</span>
            <span className="text-base font-bold font-mono text-blue-600 dark:text-sky-300">
              {metrics?.arp_requests || 0}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] block font-semibold">ARP REPLIES</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics?.arp_replies || 0}
            </span>
          </div>
        </div>

        {/* Selected Node Drawer */}
        <div className="flex-1 flex flex-col">
          {selectedNode ? (
            <div className="cyber-card p-4 border border-sky-300 dark:border-sky-500/40">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {selectedNode.role === 'gateway' ? '🌐' : selectedNode.role === 'server' ? '🖧' : selectedNode.role === 'attacker' ? '💀' : '💻'}
                    {selectedNode.name}
                  </h4>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {selectedNode.ip} • <span className="text-sky-600 dark:text-cyan-400 font-semibold">{selectedNode.mac}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedNode.status === 'COMPROMISED'
                      ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                  }`}
                >
                  {selectedNode.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3 p-2.5 rounded border bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
                <div>OS: <strong className="text-slate-900 dark:text-slate-100">{selectedNode.os}</strong></div>
                <div>Sent: <strong className="text-sky-600 dark:text-cyan-400">{selectedNode.packets_sent || 0}</strong></div>
                <div>Recv: <strong className="text-emerald-600 dark:text-emerald-400">{selectedNode.packets_received || 0}</strong></div>
                <div>State: <strong className={selectedNode.is_isolated ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}>{selectedNode.is_isolated ? 'ISOLATED' : 'ACTIVE'}</strong></div>
              </div>

              {selectedNode.role === 'attacker' && (
                <button
                  onClick={() => onToggleIsolation(selectedNode.mac, !selectedNode.is_isolated)}
                  className={`w-full mb-3 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 ${
                    selectedNode.is_isolated
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {selectedNode.is_isolated ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {selectedNode.is_isolated ? 'Restore Port Link' : 'Quarantine Attacker Port'}
                </button>
              )}

              <h5 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wider">Internal ARP Table Cache</h5>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800 text-left">
                    <tr>
                      <th className="pb-1">IP</th>
                      <th className="pb-1">MAC</th>
                      <th className="pb-1">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                    {selectedNode.arp_cache && selectedNode.arp_cache.length > 0 ? (
                      selectedNode.arp_cache.map((e, idx) => (
                        <tr key={idx} className={e.is_poisoned ? 'bg-red-50 text-red-800 font-semibold dark:bg-red-950/60 dark:text-red-200' : ''}>
                          <td className="py-1.5">{e.ip}</td>
                          <td className={`py-1.5 ${e.is_poisoned ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{e.mac}</td>
                          <td className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${e.is_poisoned ? 'bg-red-200 text-red-800 font-bold dark:bg-red-900 dark:text-red-200' : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {e.state}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-2 text-center text-slate-400">Cache empty</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="cyber-card p-4 text-center text-slate-400 text-xs flex-1 flex flex-col items-center justify-center min-h-[220px]">
              <MousePointerClick className="w-8 h-8 text-slate-400 mb-2" />
              <p>Click on any network node in the topology map to inspect its real-time ARP cache and hardware bindings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
