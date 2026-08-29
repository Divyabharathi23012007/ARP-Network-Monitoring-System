package com.arp.monitor.controller;

import com.arp.monitor.mitigation.MitigationEngine;
import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.simulation.SimulationEngine;
import com.arp.monitor.websocket.TrafficWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/mitigation")
@CrossOrigin(origins = "*")
public class MitigationController {
    private final MitigationEngine mitigationEngine;
    private final SimulationEngine simulationEngine;
    private final TrafficWebSocketHandler wsHandler;

    @Autowired
    public MitigationController(MitigationEngine mitigationEngine, SimulationEngine simulationEngine, TrafficWebSocketHandler wsHandler) {
        this.mitigationEngine = mitigationEngine;
        this.simulationEngine = simulationEngine;
        this.wsHandler = wsHandler;
    }

    @PostMapping("/auto-defense")
    public Map<String, Object> toggleAutoDefense(@RequestBody Map<String, Boolean> payload) {
        boolean enabled = payload.getOrDefault("enabled", false);
        mitigationEngine.toggleAutoDefense(enabled);
        return Collections.singletonMap("auto_defense", mitigationEngine.isAutoDefense());
    }

    @PostMapping("/heal")
    public Map<String, Object> broadcastHeal() {
        List<ARPPacket> healingPkts = mitigationEngine.generateHealingPackets(null);
        for (ARPPacket hpkt : healingPkts) {
            simulationEngine.processPacket(hpkt);
            Map<String, Object> wsMsg = new HashMap<>();
            wsMsg.put("type", "PACKET_STREAM");
            wsMsg.put("packet", hpkt);
            wsHandler.broadcast(wsMsg);
        }

        Map<String, Object> topoMsg = new HashMap<>();
        topoMsg.put("type", "TOPOLOGY_UPDATE");
        topoMsg.put("data", simulationEngine.getTopologyData());
        wsHandler.broadcast(topoMsg);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("healing_packets_sent", healingPkts.size());
        res.put("message", "Authoritative Gratuitous ARP healing broadcast complete. All poisoned caches restored.");
        return res;
    }

    @PostMapping("/isolate")
    public Map<String, Object> isolateNode(@RequestBody Map<String, String> payload) {
        String mac = payload.getOrDefault("mac", "AA:BB:CC:DD:EE:66");
        Map<String, Object> result = mitigationEngine.isolateMac(mac);

        Map<String, Object> topoMsg = new HashMap<>();
        topoMsg.put("type", "TOPOLOGY_UPDATE");
        topoMsg.put("data", simulationEngine.getTopologyData());
        wsHandler.broadcast(topoMsg);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("isolation", result);
        return res;
    }

    @PostMapping("/unisolate")
    public Map<String, Object> unisolateNode(@RequestBody Map<String, String> payload) {
        String mac = payload.getOrDefault("mac", "AA:BB:CC:DD:EE:66");
        Map<String, Object> result = mitigationEngine.unisolateMac(mac);

        Map<String, Object> topoMsg = new HashMap<>();
        topoMsg.put("type", "TOPOLOGY_UPDATE");
        topoMsg.put("data", simulationEngine.getTopologyData());
        wsHandler.broadcast(topoMsg);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("restoration", result);
        return res;
    }

    @GetMapping("/scripts")
    public Map<String, String> getDefenseScripts() {
        return mitigationEngine.generateDefenseScripts();
    }
}

