package com.arp.monitor.detector;

import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.model.Alert;
import com.arp.monitor.model.AlertSeverity;
import com.arp.monitor.model.ThreatMetrics;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class ARPDetector {
    private final Map<String, String> baselineBindings = new ConcurrentHashMap<>();
    private final Map<String, String> criticalNodes = new ConcurrentHashMap<>();
    private final Deque<Double> packetTimestamps = new ConcurrentLinkedDeque<>();
    private final Deque<Double> garpTimestamps = new ConcurrentLinkedDeque<>();
    private final Map<String, Deque<AbstractMap.SimpleEntry<String, Double>>> ipMacHistory = new ConcurrentHashMap<>();

    private int threatScore = 0;
    private double lastThreatDecay = System.currentTimeMillis() / 1000.0;
    private int anomaliesCount = 0;

    public ARPDetector() {
        initBaselines();
    }

    private void initBaselines() {
        baselineBindings.put("192.168.1.1", "00:1A:2B:3C:4D:01");    // Gateway Router
        baselineBindings.put("192.168.1.10", "00:1A:2B:3C:4D:10");   // Web / DNS Server
        baselineBindings.put("192.168.1.101", "00:1A:2B:3C:4D:A1");  // Host A
        baselineBindings.put("192.168.1.102", "00:1A:2B:3C:4D:A2");  // Host B
        baselineBindings.put("192.168.1.103", "00:1A:2B:3C:4D:A3");  // Host C
        baselineBindings.put("192.168.1.200", "AA:BB:CC:DD:EE:66");  // Attacker Node

        criticalNodes.put("192.168.1.1", "Default Gateway (Router)");
        criticalNodes.put("192.168.1.10", "DNS / Corporate Web Server");
    }

    public synchronized List<Alert> inspectPacket(ARPPacket packet) {
        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");
        String timeStr = sdf.format(new Date((long) (now * 1000)));
        packet.setTimeStr(timeStr);

        List<Alert> alerts = new ArrayList<>();
        List<String> anomalyReasons = new ArrayList<>();

        packetTimestamps.addLast(now);
        while (packetTimestamps.size() > 200) packetTimestamps.removeFirst();

        if (packet.isGratuitous()) {
            garpTimestamps.addLast(now);
            while (garpTimestamps.size() > 100) garpTimestamps.removeFirst();
        }

        // 1. Header Validation / Bogon Check
        checkHeaderAnomalies(packet, now, timeStr, alerts, anomalyReasons);

        // 2. Dynamic ARP Inspection (DAI) Baseline Verification
        checkBaselineBinding(packet, now, timeStr, alerts, anomalyReasons);

        // 3. Critical Infrastructure / Gateway Hijack Watchdog
        checkCriticalGatewaySpoof(packet, now, timeStr, alerts, anomalyReasons);

        // 4. Flip-Flop / High-Frequency MAC Churn
        checkFlipFlopChurn(packet, now, timeStr, alerts, anomalyReasons);

        // 5. Rate / Gratuitous ARP Storm Anomaly
        checkRateAnomalies(packet, now, timeStr, alerts, anomalyReasons);

        if (!alerts.isEmpty()) {
            packet.setAnomalous(true);
            packet.setAnomalyReasons(anomalyReasons);
            anomaliesCount += alerts.size();
            for (Alert a : alerts) {
                threatScore = Math.min(100, threatScore + a.getThreatScoreImpact());
            }
        } else {
            packet.setAnomalous(false);
        }

        decayThreatScore(now);
        return alerts;
    }

    private void checkHeaderAnomalies(ARPPacket packet, double now, String timeStr, List<Alert> alerts, List<String> anomalyReasons) {
        String senderMac = packet.getSenderMac().toUpperCase();
        if (senderMac.equals("00:00:00:00:00:00") || senderMac.equals("FF:FF:FF:FF:FF:FF")) {
            Alert alert = new Alert(
                "ALT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                AlertSeverity.HIGH,
                "Malformed ARP Header (Bogon MAC)",
                "MAC " + packet.getSenderMac(),
                packet.getTargetIp(),
                packet.getSenderIp(),
                packet.getSenderMac(),
                baselineBindings.get(packet.getSenderIp()),
                "Illegal sender hardware address '" + packet.getSenderMac() + "' detected for IP " + packet.getSenderIp(),
                20,
                "Drop malformed frame and flag switch interface."
            );
            alerts.add(alert);
            anomalyReasons.add(alert.getDescription());
        }
    }

    private void checkBaselineBinding(ARPPacket packet, double now, String timeStr, List<Alert> alerts, List<String> anomalyReasons) {
        String senderIp = packet.getSenderIp();
        String senderMac = packet.getSenderMac().toUpperCase();

        if (baselineBindings.containsKey(senderIp)) {
            String legitMac = baselineBindings.get(senderIp).toUpperCase();
            if (!legitMac.equals(senderMac) && !criticalNodes.containsKey(senderIp)) {
                Alert alert = new Alert(
                    "ALT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    AlertSeverity.HIGH,
                    "Dynamic ARP Inspection (DAI) Violation",
                    "Rogue MAC " + senderMac,
                    packet.getTargetIp() != null ? packet.getTargetIp() : "BROADCAST",
                    senderIp,
                    senderMac,
                    legitMac,
                    "Host claiming IP " + senderIp + " with MAC " + senderMac + " violates trusted baseline binding (Expected: " + legitMac + ").",
                    25,
                    "Enforce DAI filtering on port; broadcast authoritative Gratuitous ARP to restore cache."
                );
                alerts.add(alert);
                anomalyReasons.add(alert.getDescription());
            }
        }
    }

    private void checkCriticalGatewaySpoof(ARPPacket packet, double now, String timeStr, List<Alert> alerts, List<String> anomalyReasons) {
        String senderIp = packet.getSenderIp();
        String senderMac = packet.getSenderMac().toUpperCase();

        if (criticalNodes.containsKey(senderIp)) {
            String legitMac = baselineBindings.get(senderIp).toUpperCase();
            if (!legitMac.equals(senderMac)) {
                String nodeName = criticalNodes.get(senderIp);
                Alert alert = new Alert(
                    "ALT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    AlertSeverity.CRITICAL,
                    "Critical Infrastructure Hijack (" + nodeName + ")",
                    "Rogue MAC " + senderMac,
                    packet.getTargetIp(),
                    senderIp,
                    senderMac,
                    legitMac,
                    "CRITICAL: Attacker " + senderMac + " is actively impersonating " + nodeName + " (" + senderIp + ") to intercept network traffic!",
                    40,
                    "Isolate rogue MAC port immediately and inject authoritative Gratuitous ARP healing broadcast."
                );
                alerts.add(alert);
                anomalyReasons.add(alert.getDescription());
            }
        }
    }

    private void checkFlipFlopChurn(ARPPacket packet, double now, String timeStr, List<Alert> alerts, List<String> anomalyReasons) {
        String senderIp = packet.getSenderIp();
        String senderMac = packet.getSenderMac().toUpperCase();

        Deque<AbstractMap.SimpleEntry<String, Double>> history = ipMacHistory.computeIfAbsent(senderIp, k -> new ConcurrentLinkedDeque<>());
        history.addLast(new AbstractMap.SimpleEntry<>(senderMac, now));
        while (history.size() > 20) history.removeFirst();

        List<String> recentMacs = new ArrayList<>();
        for (AbstractMap.SimpleEntry<String, Double> entry : history) {
            if (now - entry.getValue() <= 5.0) {
                recentMacs.add(entry.getKey());
            }
        }

        if (recentMacs.size() >= 3) {
            int transitions = 0;
            for (int i = 1; i < recentMacs.size(); i++) {
                if (!recentMacs.get(i).equals(recentMacs.get(i - 1))) {
                    transitions++;
                }
            }
            if (transitions >= 2) {
                Alert alert = new Alert(
                    "ALT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    AlertSeverity.HIGH,
                    "High-Frequency ARP Flip-Flop Churn",
                    "Multiple MACs (" + String.join(", ", new HashSet<>(recentMacs)) + ")",
                    packet.getTargetIp(),
                    senderIp,
                    senderMac,
                    baselineBindings.get(senderIp),
                    "IP " + senderIp + " is rapidly oscillating between MAC addresses (" + transitions + " transitions in 5s). Characteristic of active race-condition ARP poisoning.",
                    30,
                    "Freeze ARP table entry for IP and isolate non-baseline MAC interface."
                );
                alerts.add(alert);
                anomalyReasons.add(alert.getDescription());
            }
        }
    }

    private void checkRateAnomalies(ARPPacket packet, double now, String timeStr, List<Alert> alerts, List<String> anomalyReasons) {
        int recentTotal = 0;
        for (double t : packetTimestamps) {
            if (now - t <= 2.0) recentTotal++;
        }

        int recentGarp = 0;
        for (double t : garpTimestamps) {
            if (now - t <= 2.0) recentGarp++;
        }

        if (packet.isGratuitous() && recentGarp > 6) {
            Alert alert = new Alert(
                "ALT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                AlertSeverity.HIGH,
                "Gratuitous ARP (GARP) Storm / Denial of Service",
                "MAC " + packet.getSenderMac(),
                "ALL NODES (Broadcast)",
                packet.getSenderIp(),
                packet.getSenderMac(),
                baselineBindings.get(packet.getSenderIp()),
                "Detected abnormal burst of Gratuitous ARP frames (" + recentGarp + " pkts / 2 sec). Flooding aims to exhaust CAM tables and corrupt caches.",
                25,
                "Apply switch ARP rate-limiting (DAI rate threshold: 15 pps) and quarantine offending port."
            );
            alerts.add(alert);
            anomalyReasons.add(alert.getDescription());
        }
    }

    private void decayThreatScore(double now) {
        double elapsed = now - lastThreatDecay;
        if (elapsed >= 3.0) {
            int decay = (int) (elapsed * 2);
            threatScore = Math.max(0, threatScore - decay);
            lastThreatDecay = now;
        }
    }

    public ThreatMetrics getThreatMetrics(int totalPackets, int reqCnt, int repCnt, int garpCnt, int mitigations, List<String> activeAtks, boolean autoDef, String mode) {
        String level = "NORMAL";
        if (threatScore >= 70) level = "CRITICAL";
        else if (threatScore >= 40) level = "HIGH";
        else if (threatScore >= 15) level = "ELEVATED";

        ThreatMetrics metrics = new ThreatMetrics();
        metrics.setCurrentThreatScore(threatScore);
        metrics.setThreatLevel(level);
        metrics.setTotalPackets(totalPackets);
        metrics.setArpRequests(reqCnt);
        metrics.setArpReplies(repCnt);
        metrics.setGratuitousArp(garpCnt);
        metrics.setAnomaliesDetected(anomaliesCount);
        metrics.setMitigationsApplied(mitigations);
        metrics.setActiveAttacks(activeAtks);
        metrics.setAutoDefenseEnabled(autoDef);
        metrics.setMode(mode);
        return metrics;
    }

    public Map<String, String> getBaselineBindings() { return baselineBindings; }

    public void reset() {
        packetTimestamps.clear();
        garpTimestamps.clear();
        ipMacHistory.clear();
        threatScore = 0;
        anomaliesCount = 0;
    }
}

