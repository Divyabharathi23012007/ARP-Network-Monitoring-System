package com.arp.monitor.controller;

import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.model.Alert;
import com.arp.monitor.service.DatabaseService;
import com.arp.monitor.simulation.SimulationEngine;
import com.arp.monitor.websocket.TrafficWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TopologyController {
    private final SimulationEngine simulationEngine;
    private final DatabaseService db;
    private final TrafficWebSocketHandler wsHandler;

    @Autowired
    public TopologyController(SimulationEngine simulationEngine, DatabaseService db, TrafficWebSocketHandler wsHandler) {
        this.simulationEngine = simulationEngine;
        this.db = db;
        this.wsHandler = wsHandler;
    }

    @GetMapping("/topology")
    public Map<String, Object> getTopology() {
        return simulationEngine.getTopologyData();
    }

    @PostMapping("/simulation/reset")
    public Map<String, Object> resetSimulation() {
        simulationEngine.resetSimulation();
        Map<String, Object> topoData = simulationEngine.getTopologyData();

        Map<String, Object> wsMsg = new HashMap<>();
        wsMsg.put("type", "RESET");
        wsMsg.put("data", topoData);
        wsHandler.broadcast(wsMsg);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("message", "Simulation environment reset to baseline");
        return res;
    }

    @GetMapping("/export/summary")
    public Map<String, Object> exportSummary() {
        List<ARPPacket> packets = db.getRecentPackets(500);
        List<Alert> alerts = db.getRecentAlerts(200);
        Map<String, Object> topo = simulationEngine.getTopologyData();

        int anomalousCount = 0;
        for (ARPPacket p : packets) {
            if (p.isAnomalous()) anomalousCount++;
        }

        Map<String, Integer> attackCounts = new HashMap<>();
        for (Alert a : alerts) {
            String type = a.getAttackType() != null ? a.getAttackType() : "Unknown";
            attackCounts.put(type, attackCounts.getOrDefault(type, 0) + 1);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("project_title", "ARP Network Monitoring System – Detect abnormal changes in simulated ARP mappings");
        summary.put("generated_at", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()));
        summary.put("metrics", topo.get("metrics"));
        summary.put("total_packets_recorded", packets.size());
        summary.put("total_anomalies_recorded", anomalousCount);
        summary.put("total_alerts_recorded", alerts.size());
        summary.put("attack_breakdown", attackCounts);
        summary.put("nodes", topo.get("nodes"));
        summary.put("recent_alerts", alerts.subList(0, Math.min(25, alerts.size())));
        summary.put("isolated_macs", topo.get("isolated_macs"));
        return summary;
    }
}

