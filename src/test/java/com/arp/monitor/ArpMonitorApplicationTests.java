package com.arp.monitor;

import com.arp.monitor.detector.ARPDetector;
import com.arp.monitor.mitigation.MitigationEngine;
import com.arp.monitor.model.*;
import com.arp.monitor.simulation.AttackSimulator;
import com.arp.monitor.simulation.SimulationEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ArpMonitorApplicationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SimulationEngine simulationEngine;

    @Autowired
    private AttackSimulator attackSimulator;

    @Autowired
    private ARPDetector detector;

    @Autowired
    private MitigationEngine mitigation;

    @BeforeEach
    void setUp() {
        simulationEngine.resetSimulation();
    }

    @Test
    void testTopologyInitialization() {
        Map<String, NetworkNode> nodes = simulationEngine.getNodes();
        assertEquals(6, nodes.size());
        assertTrue(nodes.containsKey("192.168.1.1"));
        assertTrue(nodes.containsKey("192.168.1.200"));

        NetworkNode hostA = nodes.get("192.168.1.101");
        assertNotNull(hostA);
        assertTrue(hostA.getArpCache().containsKey("192.168.1.1"));
        assertEquals("00:1A:2B:3C:4D:01", hostA.getArpCache().get("192.168.1.1").getMac());
        assertFalse(hostA.getArpCache().get("192.168.1.1").isPoisoned());
    }

    @Test
    void testDaiBaselineViolation() {
        ARPPacket pkt = new ARPPacket(
            "TEST-DAI-01",
            2,
            "REPLY",
            "AA:BB:CC:DD:EE:66", // Rogue MAC
            "192.168.1.102",      // Host B IP
            "00:1A:2B:3C:4D:01",
            "192.168.1.1",
            false
        );

        List<Alert> alerts = detector.inspectPacket(pkt);
        assertTrue(pkt.isAnomalous());
        assertFalse(alerts.isEmpty());
        assertTrue(alerts.stream().anyMatch(a -> a.getAttackType().contains("DAI") || a.getAttackType().contains("Inspection")));
    }

    @Test
    void testGatewayHijackWatchdog() {
        ARPPacket pkt = new ARPPacket(
            "TEST-GW-01",
            2,
            "GARP (HIJACK)",
            "AA:BB:CC:DD:EE:66",
            "192.168.1.1", // Gateway IP
            "FF:FF:FF:FF:FF:FF",
            "192.168.1.1",
            true
        );

        List<Alert> alerts = detector.inspectPacket(pkt);
        assertTrue(pkt.isAnomalous());
        assertTrue(alerts.stream().anyMatch(a -> a.getSeverity() == AlertSeverity.CRITICAL));
    }

    @Test
    void testMitmAttackAndCachePoisoning() {
        List<ARPPacket> mitmPkts = attackSimulator.launchMitmAttack("192.168.1.101", "192.168.1.1", "AA:BB:CC:DD:EE:66");
        assertEquals(2, mitmPkts.size());

        for (ARPPacket p : mitmPkts) {
            simulationEngine.processPacket(p);
        }

        NetworkNode hostA = simulationEngine.getNodes().get("192.168.1.101");
        ARPCacheEntry entry = hostA.getArpCache().get("192.168.1.1");
        assertNotNull(entry);
        assertEquals("AA:BB:CC:DD:EE:66", entry.getMac());
        assertTrue(entry.isPoisoned());
        assertEquals(NodeStatus.COMPROMISED, hostA.getStatus());
    }

    @Test
    void testAuthoritativeHealingMitigation() {
        // Poison first
        List<ARPPacket> mitmPkts = attackSimulator.launchMitmAttack("192.168.1.101", "192.168.1.1", "AA:BB:CC:DD:EE:66");
        for (ARPPacket p : mitmPkts) simulationEngine.processPacket(p);

        NetworkNode hostA = simulationEngine.getNodes().get("192.168.1.101");
        assertTrue(hostA.getArpCache().get("192.168.1.1").isPoisoned());

        // Heal
        List<ARPPacket> healPkts = mitigation.generateHealingPackets(null);
        for (ARPPacket hp : healPkts) simulationEngine.processPacket(hp);

        // Verify cured
        assertEquals("00:1A:2B:3C:4D:01", hostA.getArpCache().get("192.168.1.1").getMac());
        assertFalse(hostA.getArpCache().get("192.168.1.1").isPoisoned());
        assertEquals(NodeStatus.HEALTHY, hostA.getStatus());
    }

    @Test
    void testPortIsolation() {
        String attackerMac = "AA:BB:CC:DD:EE:66";
        mitigation.isolateMac(attackerMac);
        assertTrue(mitigation.getIsolatedMacs().contains(attackerMac));

        ARPPacket pkt = new ARPPacket(
            "TEST-ISO-01",
            1,
            "REQUEST",
            attackerMac,
            "192.168.1.200",
            "FF:FF:FF:FF:FF:FF",
            "192.168.1.1",
            false
        );

        simulationEngine.processPacket(pkt);
        assertTrue(pkt.isAnomalous());
        assertTrue(pkt.getAnomalyReasons().stream().anyMatch(r -> r.contains("BLOCKED")));
    }

    @Test
    void testRestEndpoints() {
        String baseUrl = "http://localhost:" + port + "/api";

        ResponseEntity<Map> topRes = restTemplate.getForEntity(baseUrl + "/topology", Map.class);
        assertEquals(200, topRes.getStatusCode().value());
        assertNotNull(topRes.getBody());
        assertTrue(topRes.getBody().containsKey("nodes"));

        ResponseEntity<Map> scriptsRes = restTemplate.getForEntity(baseUrl + "/mitigation/scripts", Map.class);
        assertEquals(200, scriptsRes.getStatusCode().value());
        assertTrue(scriptsRes.getBody().containsKey("windows"));
        assertTrue(scriptsRes.getBody().containsKey("linux"));
    }
}

