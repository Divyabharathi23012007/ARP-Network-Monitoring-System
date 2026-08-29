import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Navbar from './components/Navbar';
import TopologyCanvas from './components/TopologyCanvas';
import ArpCacheMatrix from './components/ArpCacheMatrix';
import AttackStudio from './components/AttackStudio';
import WiresharkAnalyzer from './components/WiresharkAnalyzer';
import AlertsFeed from './components/AlertsFeed';
import DefenseCenter from './components/DefenseCenter';
import AnalyticsHub from './components/AnalyticsHub';
import TheoryGuide from './components/TheoryGuide';
import PacketModal from './components/PacketModal';
import { api } from './services/api';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [currentTab, setCurrentTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isolatedMacs, setIsolatedMacs] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [scripts, setScripts] = useState({});
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [inspectedPacket, setInspectedPacket] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoDefense, setAutoDefense] = useState(false);
  const [trafficHistory, setTrafficHistory] = useState(
    Array.from({ length: 15 }, () => ({ requests: 0, replies: 0, garp: 0, anomalies: 0 }))
  );
  const [flyingPackets, setFlyingPackets] = useState([]);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const isStreamPausedRef = useRef(isStreamPaused);
  isStreamPausedRef.current = isStreamPaused;

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtxRef.current.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  };

  const addFlyingPacket = (senderIp, targetIp, isAnomalous, isHeal, currentNodes) => {
    const sNode = currentNodes.find((n) => n.ip === senderIp);
    if (!sNode) return;

    const width = 800;
    const height = 500;
    const from = { x: (sNode.x || 0.5) * width, y: (sNode.y || 0.5) * height };

    let color = '#0284C7';
    if (isAnomalous) color = '#DC2626';
    if (isHeal) color = '#059669';

    const isBroadcast = !targetIp || targetIp === '0.0.0.0' || targetIp === '255.255.255.255' || targetIp === 'FF:FF:FF:FF:FF:FF';
    const to = isBroadcast
      ? { x: 0.5 * width, y: 0.48 * height }
      : {
          x: (currentNodes.find((n) => n.ip === targetIp)?.x || 0.5) * width,
          y: (currentNodes.find((n) => n.ip === targetIp)?.y || 0.5) * height,
        };

    const newFlying = { from, to, progress: 0, color, isAnomalous };
    setFlyingPackets((prev) => [...prev.slice(-15), newFlying]);
  };

  // Flying packet animation progress tick
  useEffect(() => {
    const interval = setInterval(() => {
      setFlyingPackets((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + 0.05 }))
          .filter((p) => p.progress < 1.0)
      );
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/traffic`;

    let reconnectTimer;
    const connect = () => {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWebSocketMessage(msg);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleWebSocketMessage = (msg) => {
    if (msg.type === 'INITIAL_STATE') {
      if (msg.data) updateTopologyState(msg.data);
      if (msg.recent_packets) setPackets(msg.recent_packets);
      if (msg.recent_alerts) setAlerts(msg.recent_alerts);
    } else if (msg.type === 'TOPOLOGY_UPDATE') {
      if (msg.data) updateTopologyState(msg.data);
      if (msg.new_alerts && msg.new_alerts.length > 0) {
        setAlerts((prev) => [...msg.new_alerts, ...prev].slice(0, 100));
        playBeep();
      }
    } else if (msg.type === 'PACKET_STREAM') {
      const p = msg.packet;
      if (p) {
        const isHeal = p.id && p.id.startsWith('HEAL');
        setNodes((currentNodes) => {
          addFlyingPacket(p.sender_ip, p.target_ip, p.is_anomalous, isHeal, currentNodes);
          return currentNodes;
        });

        if (!isStreamPausedRef.current) {
          setPackets((prev) => [p, ...prev].slice(0, 100));
        }
      }
      if (msg.alerts && msg.alerts.length > 0) {
        setAlerts((prev) => [...msg.alerts, ...prev].slice(0, 100));
        playBeep();
      }
    } else if (msg.type === 'RESET') {
      if (msg.data) updateTopologyState(msg.data);
      setPackets([]);
      setAlerts([]);
    }
  };

  const updateTopologyState = (data) => {
    if (data.nodes) setNodes(data.nodes);
    if (data.metrics) {
      setMetrics(data.metrics);
      setAutoDefense(data.metrics.auto_defense_enabled || false);

      setTrafficHistory((prev) => [
        ...prev.slice(1),
        {
          requests: data.metrics.arp_requests,
          replies: data.metrics.arp_replies,
          garp: data.metrics.gratuitous_arp,
          anomalies: data.metrics.anomalies_detected,
        },
      ]);
    }
    if (data.isolated_macs) setIsolatedMacs(data.isolated_macs);

    if (selectedNode) {
      const match = data.nodes?.find((n) => n.id === selectedNode.id);
      if (match) setSelectedNode(match);
    }
  };

  const fetchData = async () => {
    try {
      const [topData, scriptsData] = await Promise.all([
        api.getTopology(),
        api.getDefenseScripts(),
      ]);
      updateTopologyState(topData);
      setScripts(scriptsData);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLaunchAttack = async (config) => {
    try {
      await api.launchAttack(config);
    } catch (e) {
      alert('Attack failed: ' + e);
    }
  };

  const handleSendCustomPacket = async (customPacket) => {
    try {
      await api.sendCustomPacket(customPacket);
      alert('Custom packet injected into subnet!');
    } catch (e) {
      alert('Injection failed: ' + e);
    }
  };

  const handleToggleAutoDefense = async (enabled) => {
    setAutoDefense(enabled);
    await api.toggleAutoDefense(enabled);
  };

  const handleBroadcastHeal = async () => {
    try {
      await api.broadcastHeal();
    } catch (e) {
      alert('Heal failed: ' + e);
    }
  };

  const handleToggleIsolation = async (mac, isolate) => {
    try {
      if (isolate) await api.isolateNode(mac);
      else await api.unisolateNode(mac);
    } catch (e) {
      alert('Isolation toggle failed: ' + e);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset entire network simulation and purge alert logs?')) {
      await api.resetSimulation();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Header
        metrics={metrics}
        isConnected={isConnected}
        autoDefense={autoDefense}
        onToggleAutoDefense={handleToggleAutoDefense}
        onBroadcastHeal={handleBroadcastHeal}
        onReset={handleReset}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      <main className="flex-1 px-3 pb-4 overflow-y-auto">
        {currentTab === 'overview' && (
          <TopologyCanvas
            nodes={nodes}
            metrics={metrics}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onToggleIsolation={handleToggleIsolation}
            flyingPackets={flyingPackets}
            isDark={isDark}
          />
        )}

        {currentTab === 'cache' && (
          <ArpCacheMatrix nodes={nodes} onRefresh={fetchData} />
        )}

        {currentTab === 'attack' && (
          <AttackStudio
            onLaunchAttack={handleLaunchAttack}
            onSendCustomPacket={handleSendCustomPacket}
          />
        )}

        {currentTab === 'packets' && (
          <WiresharkAnalyzer
            packets={packets}
            isPaused={isStreamPaused}
            onTogglePause={() => setIsStreamPaused(!isStreamPaused)}
            onInspectPacket={setInspectedPacket}
          />
        )}

        {currentTab === 'alerts' && <AlertsFeed alerts={alerts} />}

        {currentTab === 'defense' && (
          <DefenseCenter
            nodes={nodes}
            isolatedMacs={isolatedMacs}
            onToggleIsolation={handleToggleIsolation}
            scripts={scripts}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsHub
            trafficHistory={trafficHistory}
            metrics={metrics}
            alerts={alerts}
          />
        )}

        {currentTab === 'theory' && <TheoryGuide />}
      </main>

      <PacketModal
        packet={inspectedPacket}
        onClose={() => setInspectedPacket(null)}
      />
    </div>
  );
}
