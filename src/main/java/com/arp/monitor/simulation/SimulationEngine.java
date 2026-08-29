package com.arp.monitor.simulation;

import com.arp.monitor.detector.ARPDetector;
import com.arp.monitor.mitigation.MitigationEngine;
import com.arp.monitor.model.*;
import com.arp.monitor.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SimulationEngine {
    private final ARPDetector detector;
    private final MitigationEngine mitigation;
    private final DatabaseService db;

    private final Map<String, NetworkNode> nodes = new ConcurrentHashMap<>();
    private int totalPacketsCount = 0;
    private int requestsCount = 0;
    private int repliesCount = 0;
    private int garpCount = 0;
    private final List<String> activeAttacks = new ArrayList<>();
    private boolean backgroundTrafficEnabled = true;
    private double lastBgTrafficTime = System.currentTimeMillis() / 1000.0;
    private double simulationSpeed = 1.0;

    @Autowired
    public SimulationEngine(ARPDetector detector, MitigationEngine mitigation, DatabaseService db) {
        this.detector = detector;
        this.mitigation = mitigation;
        this.db = db;
        initTopology();
    }

    public void initTopology() {
        nodes.clear();
        nodes.put("192.168.1.1", new NetworkNode("node_gw", "Default Gateway (Router)", NodeRole.gateway, "192.168.1.1", "00:1A:2B:3C:4D:01", "Cisco IOS 15.2", NodeStatus.HEALTHY, 0.5, 0.15));
        nodes.put("192.168.1.10", new NetworkNode("node_srv", "DNS / Web Server", NodeRole.server, "192.168.1.10", "00:1A:2B:3C:4D:10", "Ubuntu Linux 22.04 LTS", NodeStatus.HEALTHY, 0.85, 0.35));
        nodes.put("192.168.1.101", new NetworkNode("node_host_a", "Host A (Finance PC)", NodeRole.workstation, "192.168.1.101", "00:1A:2B:3C:4D:A1", "Windows 11 Pro", NodeStatus.HEALTHY, 0.15, 0.55));
        nodes.put("192.168.1.102", new NetworkNode("node_host_b", "Host B (Dev Mac)", NodeRole.workstation, "192.168.1.102", "00:1A:2B:3C:4D:A2", "macOS Sequoia", NodeStatus.HEALTHY, 0.45, 0.8));
        nodes.put("192.168.1.103", new NetworkNode("node_host_c", "Host C (HR Workstation)", NodeRole.workstation, "192.168.1.103", "00:1A:2B:3C:4D:A3", "Windows 10 Enterprise", NodeStatus.HEALTHY, 0.75, 0.8));
        nodes.put("192.168.1.200", new NetworkNode("node_attacker", "Attacker (Rogue Laptop)", NodeRole.attacker, "192.168.1.200", "AA:BB:CC:DD:EE:66", "Kali Linux 2024.2", NodeStatus.HEALTHY, 0.15, 0.2));

        populateInitialArpCaches();
    }

    private void populateInitialArpCaches() {
        for (Map.Entry<String, NetworkNode> entry : nodes.entrySet()) {
            String ip = entry.getKey();
            NetworkNode node = entry.getValue();
            node.getArpCache().clear();

            for (Map.Entry<String, String> legit : detector.getBaselineBindings().entrySet()) {
                String otherIp = legit.getKey();
                String otherMac = legit.getValue();
                if (!otherIp.equals(ip) && !otherIp.equals("192.168.1.200")) {
                    node.getArpCache().put(otherIp, new ARPCacheEntry(
                        otherIp,
                        otherMac,
                        "dynamic",
                        "REACHABLE",
                        300,
                        false,
                        otherMac
                    ));
                }
            }
        }
    }

    public synchronized List<Alert> processPacket(ARPPacket packet) {
        if (mitigation.getIsolatedMacs().contains(packet.getSenderMac().toUpperCase())) {
            packet.setAnomalous(true);
            packet.getAnomalyReasons().add("[BLOCKED] Dropped frame from quarantined MAC " + packet.getSenderMac());
            return Collections.emptyList();
        }

        totalPacketsCount++;
        if (packet.isGratuitous()) garpCount++;
        else if (packet.getOpcode() == 1) requestsCount++;
        else if (packet.getOpcode() == 2) repliesCount++;

        List<Alert> alerts = detector.inspectPacket(packet);

        db.savePacket(packet);
        for (Alert a : alerts) {
            db.saveAlert(a);
        }

        updateVirtualNetworkState(packet);

        if (mitigation.isAutoDefense() && !alerts.isEmpty()) {
            for (Alert alert : alerts) {
                if (alert.getSeverity() == AlertSeverity.HIGH || alert.getSeverity() == AlertSeverity.CRITICAL) {
                    List<ARPPacket> healPackets = mitigation.generateHealingPackets(Collections.singletonList(alert.getVictimIp()));
                    for (ARPPacket hp : healPackets) {
                        updateVirtualNetworkState(hp);
                        db.savePacket(hp);
                    }
                    alert.setMitigated(true);
                }
            }
        }

        return alerts;
    }

    private void updateVirtualNetworkState(ARPPacket packet) {
        String senderIp = packet.getSenderIp();
        String senderMac = packet.getSenderMac().toUpperCase();
        String targetIp = packet.getTargetIp();
        String targetMac = packet.getTargetMac() != null ? packet.getTargetMac().toUpperCase() : "FF:FF:FF:FF:FF:FF";
        double now = System.currentTimeMillis() / 1000.0;

        if (nodes.containsKey(senderIp)) {
            nodes.get(senderIp).setPacketsSent(nodes.get(senderIp).getPacketsSent() + 1);
        }

        boolean isBroadcast = targetMac.equals("FF:FF:FF:FF:FF:FF") || packet.getOpcode() == 1 || packet.isGratuitous();

        List<NetworkNode> receivingNodes = new ArrayList<>();
        if (isBroadcast) {
            for (Map.Entry<String, NetworkNode> entry : nodes.entrySet()) {
                if (!entry.getKey().equals(senderIp)) {
                    receivingNodes.add(entry.getValue());
                }
            }
        } else if (nodes.containsKey(targetIp)) {
            receivingNodes.add(nodes.get(targetIp));
        }

        String legitMac = detector.getBaselineBindings().getOrDefault(senderIp, "").toUpperCase();
        boolean isSpoofed = (!legitMac.isEmpty() && !legitMac.equals(senderMac));

        if (packet.getId() != null && packet.getId().startsWith("HEAL")) {
            isSpoofed = false;
        }

        for (NetworkNode node : receivingNodes) {
            node.setPacketsReceived(node.getPacketsReceived() + 1);

            if (node.getArpCache().containsKey(senderIp)) {
                ARPCacheEntry entry = node.getArpCache().get(senderIp);
                entry.setMac(senderMac);
                entry.setLastUpdated(now);
                entry.setTtl(300);
                entry.setPoisoned(isSpoofed);
                entry.setState(isSpoofed ? "POISONED" : "REACHABLE");

                Map<String, Object> h = new HashMap<>();
                h.put("mac", senderMac);
                h.put("timestamp", now);
                h.put("state", entry.getState());
                entry.getHistory().add(h);
            } else if (!senderIp.equals(node.getIp()) && (node.getIp().equals(targetIp) || isBroadcast)) {
                node.getArpCache().put(senderIp, new ARPCacheEntry(
                    senderIp,
                    senderMac,
                    "dynamic",
                    isSpoofed ? "POISONED" : "REACHABLE",
                    300,
                    isSpoofed,
                    legitMac
                ));
            }

            // Update overall status
            boolean anyPoisoned = false;
            for (ARPCacheEntry e : node.getArpCache().values()) {
                if (e.isPoisoned()) {
                    anyPoisoned = true;
                    break;
                }
            }

            if (node.getRole() == NodeRole.attacker) {
                node.setStatus(mitigation.getIsolatedMacs().contains(node.getMac().toUpperCase()) ? NodeStatus.ISOLATED : NodeStatus.HEALTHY);
            } else if (anyPoisoned) {
                node.setStatus(NodeStatus.COMPROMISED);
            } else {
                node.setStatus(NodeStatus.HEALTHY);
            }
        }
    }

    public ARPPacket stepBackgroundTraffic() {
        double now = System.currentTimeMillis() / 1000.0;
        if (!backgroundTrafficEnabled || (now - lastBgTrafficTime) < (2.5 / simulationSpeed)) {
            return null;
        }
        lastBgTrafficTime = now;

        List<String> legitIps = Arrays.asList("192.168.1.1", "192.168.1.10", "192.168.1.101", "192.168.1.102", "192.168.1.103");
        Random rand = new Random();
        String senderIp = legitIps.get(rand.nextInt(legitIps.size()));
        List<String> otherIps = new ArrayList<>(legitIps);
        otherIps.remove(senderIp);
        String targetIp = otherIps.get(rand.nextInt(otherIps.size()));

        String senderMac = detector.getBaselineBindings().get(senderIp);
        String targetMac = detector.getBaselineBindings().get(targetIp);

        double trafficType = rand.nextDouble();
        String pktId = "PKT-" + (long)(now * 1000 % 1000000);
        ARPPacket packet;

        if (trafficType < 0.5) {
            packet = new ARPPacket(pktId, 1, "REQUEST", senderMac, senderIp, "00:00:00:00:00:00", targetIp, false);
            packet.setRawHex("FF FF FF FF FF FF " + senderMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 01");
        } else if (trafficType < 0.85) {
            packet = new ARPPacket(pktId, 2, "REPLY", targetMac, targetIp, senderMac, senderIp, false);
            packet.setRawHex(senderMac.replace(":", " ") + " " + targetMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
        } else {
            packet = new ARPPacket(pktId, 2, "GARP", senderMac, senderIp, "FF:FF:FF:FF:FF:FF", senderIp, true);
            packet.setRawHex("FF FF FF FF FF FF " + senderMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
        }

        processPacket(packet);
        return packet;
    }

    public Map<String, Object> getTopologyData() {
        List<Map<String, Object>> nodesList = new ArrayList<>();
        for (NetworkNode node : nodes.values()) {
            List<Map<String, Object>> cacheSummary = new ArrayList<>();
            for (ARPCacheEntry entry : node.getArpCache().values()) {
                Map<String, Object> c = new HashMap<>();
                c.put("ip", entry.getIp());
                c.put("mac", entry.getMac());
                c.put("state", entry.getState());
                c.put("is_poisoned", entry.isPoisoned());
                c.put("ttl", entry.getTtl());
                cacheSummary.add(c);
            }

            Map<String, Object> n = new HashMap<>();
            n.put("id", node.getId());
            n.put("name", node.getName());
            n.put("role", node.getRole().name());
            n.put("ip", node.getIp());
            n.put("mac", node.getMac());
            n.put("os", node.getOs());
            n.put("status", node.getStatus().name());
            n.put("packets_sent", node.getPacketsSent());
            n.put("packets_received", node.getPacketsReceived());
            n.put("is_isolated", node.isIsolated() || mitigation.getIsolatedMacs().contains(node.getMac().toUpperCase()));
            n.put("arp_cache", cacheSummary);
            n.put("x", node.getX());
            n.put("y", node.getY());
            nodesList.add(n);
        }

        ThreatMetrics metrics = detector.getThreatMetrics(
            totalPacketsCount,
            requestsCount,
            repliesCount,
            garpCount,
            mitigation.getMitigationsCount(),
            activeAttacks,
            mitigation.isAutoDefense(),
            "simulation"
        );

        Map<String, Object> response = new HashMap<>();
        response.put("nodes", nodesList);
        response.put("metrics", metrics);
        response.put("isolated_macs", new ArrayList<>(mitigation.getIsolatedMacs()));
        return response;
    }

    public void resetSimulation() {
        detector.reset();
        mitigation.getIsolatedMacs().clear();
        totalPacketsCount = 0;
        requestsCount = 0;
        repliesCount = 0;
        garpCount = 0;
        activeAttacks.clear();
        initTopology();
        db.clearAll();
    }

    // Getters
    public ARPDetector getDetector() { return detector; }
    public MitigationEngine getMitigation() { return mitigation; }
    public Map<String, NetworkNode> getNodes() { return nodes; }
}

