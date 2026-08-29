import unittest
import time
from backend.models import ARPPacket, NodeRole, NodeStatus, AlertSeverity
from backend.simulation.engine import SimulationEngine
from backend.simulation.attacks import AttackSimulator
from backend.detector.arp_detector import ARPDetector
from backend.mitigation.mitigation import MitigationEngine

class TestARPNetworkMonitoringSystem(unittest.TestCase):

    def setUp(self):
        self.engine = SimulationEngine()
        self.attacks = AttackSimulator(self.engine)
        self.detector = self.engine.detector
        self.mitigation = self.engine.mitigation

    def test_topology_initialization(self):
        """Verify virtual network topology nodes and baseline ARP caches."""
        self.assertEqual(len(self.engine.nodes), 6)
        self.assertIn("192.168.1.1", self.engine.nodes)
        self.assertIn("192.168.1.200", self.engine.nodes)
        
        gw_node = self.engine.nodes["192.168.1.1"]
        self.assertEqual(gw_node.role, NodeRole.GATEWAY)
        self.assertEqual(gw_node.mac, "00:1A:2B:3C:4D:01")
        self.assertEqual(gw_node.status, NodeStatus.HEALTHY)

        host_a = self.engine.nodes["192.168.1.101"]
        self.assertIn("192.168.1.1", host_a.arp_cache)
        self.assertEqual(host_a.arp_cache["192.168.1.1"].mac, "00:1A:2B:3C:4D:01")
        self.assertFalse(host_a.arp_cache["192.168.1.1"].is_poisoned)

    def test_dai_baseline_violation_detection(self):
        """Test DAI detection when a host claims an IP with a rogue MAC."""
        # Host claiming IP 192.168.1.102 with rogue MAC
        pkt = ARPPacket(
            id="TEST-DAI-01",
            sender_mac="AA:BB:CC:DD:EE:66",
            sender_ip="192.168.1.102",  # Expected: 00:1A:2B:3C:4D:A2
            target_mac="00:1A:2B:3C:4D:01",
            target_ip="192.168.1.1",
            opcode=2
        )
        is_anom, alerts = self.detector.inspect_packet(pkt)
        self.assertTrue(is_anom)
        self.assertTrue(any("DAI" in a.attack_type or "Inspection" in a.attack_type for a in alerts))

    def test_gateway_hijack_detection(self):
        """Test critical watchdog alert when Gateway IP is claimed by rogue MAC."""
        pkt = ARPPacket(
            id="TEST-GW-01",
            sender_mac="AA:BB:CC:DD:EE:66",
            sender_ip="192.168.1.1",  # Critical Gateway
            target_mac="FF:FF:FF:FF:FF:FF",
            target_ip="192.168.1.1",
            opcode=2,
            is_gratuitous=True
        )
        is_anom, alerts = self.detector.inspect_packet(pkt)
        self.assertTrue(is_anom)
        self.assertTrue(any(a.severity == AlertSeverity.CRITICAL for a in alerts))

    def test_bogon_header_detection(self):
        """Test malformed / bogon zero-MAC and broadcast MAC detection."""
        pkt = ARPPacket(
            id="TEST-BOGON-01",
            sender_mac="00:00:00:00:00:00",
            sender_ip="192.168.1.101",
            target_mac="FF:FF:FF:FF:FF:FF",
            target_ip="192.168.1.101",
            opcode=2
        )
        is_anom, alerts = self.detector.inspect_packet(pkt)
        self.assertTrue(is_anom)
        self.assertTrue(any("Bogon" in a.attack_type or "Malformed" in a.attack_type for a in alerts))

    def test_mitm_attack_and_poisoning(self):
        """Test launching MITM attack, verifying cache poisoning on victims."""
        mitm_pkts = self.attacks.launch_mitm_attack(
            victim_ip="192.168.1.101",
            gateway_ip="192.168.1.1",
            attacker_mac="AA:BB:CC:DD:EE:66"
        )
        self.assertEqual(len(mitm_pkts), 2)

        for p in mitm_pkts:
            self.engine.process_packet(p)

        host_a = self.engine.nodes["192.168.1.101"]
        gw_node = self.engine.nodes["192.168.1.1"]

        # Host A's entry for Gateway should now be poisoned with attacker's MAC
        self.assertEqual(host_a.arp_cache["192.168.1.1"].mac, "AA:BB:CC:DD:EE:66")
        self.assertTrue(host_a.arp_cache["192.168.1.1"].is_poisoned)
        self.assertEqual(host_a.status, NodeStatus.COMPROMISED)

    def test_authoritative_healing_mitigation(self):
        """Test that broadcasting healing packets purges poisoned cache entries."""
        # 1. Poison cache
        mitm_pkts = self.attacks.launch_mitm_attack()
        for p in mitm_pkts:
            self.engine.process_packet(p)

        host_a = self.engine.nodes["192.168.1.101"]
        self.assertTrue(host_a.arp_cache["192.168.1.1"].is_poisoned)

        # 2. Heal cache
        healing_pkts = self.mitigation.generate_healing_packets()
        for hpkt in healing_pkts:
            self.engine.process_packet(hpkt)

        # 3. Verify restored to legitimate MAC
        self.assertEqual(host_a.arp_cache["192.168.1.1"].mac, "00:1A:2B:3C:4D:01")
        self.assertFalse(host_a.arp_cache["192.168.1.1"].is_poisoned)
        self.assertEqual(host_a.status, NodeStatus.HEALTHY)

    def test_port_isolation(self):
        """Test isolating rogue MAC and ensuring its frames are dropped."""
        attacker_mac = "AA:BB:CC:DD:EE:66"
        self.mitigation.isolate_mac(attacker_mac)
        self.assertIn(attacker_mac, self.mitigation.isolated_macs)

        pkt = ARPPacket(
            id="TEST-ISO-01",
            sender_mac=attacker_mac,
            sender_ip="192.168.1.200",
            target_mac="FF:FF:FF:FF:FF:FF",
            target_ip="192.168.1.1",
            opcode=1
        )
        processed, alerts = self.engine.process_packet(pkt)
        self.assertTrue(any("BLOCKED" in r for r in processed.anomaly_reasons))

    def test_defense_scripts_generation(self):
        """Test multi-OS static binding script generator."""
        scripts = self.mitigation.generate_defense_scripts()
        self.assertIn("windows", scripts)
        self.assertIn("linux", scripts)
        self.assertIn("cisco", scripts)
        self.assertIn("netsh", scripts["windows"])
        self.assertIn("ip neigh", scripts["linux"])
        self.assertIn("ip arp inspection", scripts["cisco"])

if __name__ == "__main__":
    unittest.main()

