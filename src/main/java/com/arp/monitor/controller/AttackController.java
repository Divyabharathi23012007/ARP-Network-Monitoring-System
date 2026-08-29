package com.arp.monitor.controller;

import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.model.Alert;
import com.arp.monitor.model.AttackConfig;
import com.arp.monitor.model.CustomPacketRequest;
import com.arp.monitor.simulation.AttackSimulator;
import com.arp.monitor.simulation.SimulationEngine;
import com.arp.monitor.websocket.TrafficWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/attack")
@CrossOrigin(origins = "*")
public class AttackController {
    private final SimulationEngine simulationEngine;
    private final AttackSimulator attackSimulator;
    private final TrafficWebSocketHandler wsHandler;

    @Autowired
    public AttackController(SimulationEngine simulationEngine, AttackSimulator attackSimulator, TrafficWebSocketHandler wsHandler) {
        this.simulationEngine = simulationEngine;
        this.attackSimulator = attackSimulator;
        this.wsHandler = wsHandler;
    }

    @PostMapping("/launch")
    public ResponseEntity<Map<String, Object>> launchAttack(@RequestBody AttackConfig config) {
        List<ARPPacket> generatedPackets;
        String type = config.getAttackType();

        if ("mitm".equalsIgnoreCase(type)) {
            generatedPackets = attackSimulator.launchMitmAttack(config.getVictimIp(), config.getTargetIp(), config.getSpoofedMac());
        } else if ("gateway_hijack".equalsIgnoreCase(type)) {
            generatedPackets = attackSimulator.launchGatewayHijack(config.getTargetIp(), config.getSpoofedMac());
        } else if ("garp_storm".equalsIgnoreCase(type)) {
            generatedPackets = attackSimulator.launchGarpStorm(config.getCount() > 0 ? config.getCount() : 12, config.getSpoofedMac());
        } else if ("flip_flop".equalsIgnoreCase(type)) {
            generatedPackets = attackSimulator.launchFlipFlop(config.getTargetIp(), config.getSpoofedMac());
        } else if ("bogon".equalsIgnoreCase(type)) {
            generatedPackets = attackSimulator.launchBogonAttack();
        } else {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Invalid attack type: " + type));
        }

        List<Alert> allAlerts = new ArrayList<>();
        for (ARPPacket pkt : generatedPackets) {
            List<Alert> alerts = simulationEngine.processPacket(pkt);
            allAlerts.addAll(alerts);

            Map<String, Object> wsMsg = new HashMap<>();
            wsMsg.put("type", "PACKET_STREAM");
            wsMsg.put("packet", pkt);
            wsMsg.put("alerts", alerts);
            wsHandler.broadcast(wsMsg);
        }

        // Broadcast updated topology
        Map<String, Object> topoMsg = new HashMap<>();
        topoMsg.put("type", "TOPOLOGY_UPDATE");
        topoMsg.put("data", simulationEngine.getTopologyData());
        topoMsg.put("new_alerts", allAlerts);
        wsHandler.broadcast(topoMsg);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("attack_type", type);
        response.put("packets_sent", generatedPackets.size());
        response.put("alerts_generated", allAlerts.size());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/custom")
    public ResponseEntity<Map<String, Object>> sendCustomPacket(@RequestBody CustomPacketRequest req) {
        ARPPacket pkt = attackSimulator.craftCustomPacket(
            req.getOpcode(),
            req.getSenderMac(),
            req.getSenderIp(),
            req.getTargetMac(),
            req.getTargetIp()
        );

        List<Alert> alerts = simulationEngine.processPacket(pkt);

        Map<String, Object> wsMsg = new HashMap<>();
        wsMsg.put("type", "PACKET_STREAM");
        wsMsg.put("packet", pkt);
        wsMsg.put("alerts", alerts);
        wsHandler.broadcast(wsMsg);

        Map<String, Object> topoMsg = new HashMap<>();
        topoMsg.put("type", "TOPOLOGY_UPDATE");
        topoMsg.put("data", simulationEngine.getTopologyData());
        wsHandler.broadcast(topoMsg);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("packet", pkt);
        response.put("alerts", alerts);
        return ResponseEntity.ok(response);
    }
}

