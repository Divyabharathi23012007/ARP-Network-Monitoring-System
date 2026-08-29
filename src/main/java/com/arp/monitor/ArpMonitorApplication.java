package com.arp.monitor;

import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.simulation.SimulationEngine;
import com.arp.monitor.websocket.TrafficWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
@EnableScheduling
public class ArpMonitorApplication {

    private final SimulationEngine simulationEngine;
    private final TrafficWebSocketHandler wsHandler;

    @Autowired
    public ArpMonitorApplication(SimulationEngine simulationEngine, TrafficWebSocketHandler wsHandler) {
        this.simulationEngine = simulationEngine;
        this.wsHandler = wsHandler;
    }

    public static void main(String[] args) {
        System.out.println("======================================================================");
        System.out.println("  ARP Network Monitoring System (Spring Boot + React Edition)");
        System.out.println("  Detect Abnormal Changes in Simulated ARP Mappings");
        System.out.println("  Computer Networks Mini Project");
        System.out.println("======================================================================");
        SpringApplication.run(ArpMonitorApplication.class, args);
        System.out.println("\n[+] Spring Boot SOC Server running on http://localhost:8080");
        System.out.println("[+] WebSocket endpoint listening at ws://localhost:8080/ws/traffic\n");
    }

    /**
     * Periodic background traffic generator running every 1.5 seconds.
     */
    @Scheduled(fixedRate = 1500)
    public void backgroundTrafficLoop() {
        try {
            ARPPacket pkt = simulationEngine.stepBackgroundTraffic();
            if (pkt != null) {
                Map<String, Object> msg = new HashMap<>();
                msg.put("type", "PACKET_STREAM");
                msg.put("packet", pkt);
                msg.put("threat_metrics", simulationEngine.getDetector().getThreatMetrics(
                    0, 0, 0, 0, 0, null, false, "simulation"
                ));
                wsHandler.broadcast(msg);
            }
        } catch (Exception e) {
            System.err.println("[Background Traffic] Error: " + e.getMessage());
        }
    }

    /**
     * Periodic topology and threat metrics synchronization every 2 seconds.
     */
    @Scheduled(fixedRate = 2000)
    public void topologySyncLoop() {
        try {
            Map<String, Object> topoData = simulationEngine.getTopologyData();
            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "TOPOLOGY_UPDATE");
            msg.put("data", topoData);
            wsHandler.broadcast(msg);
        } catch (Exception e) {
            System.err.println("[Topology Sync] Error: " + e.getMessage());
        }
    }
}

