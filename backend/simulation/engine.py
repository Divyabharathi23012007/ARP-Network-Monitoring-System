import time
import uuid
import random
from typing import Dict, List, Optional, Tuple, Any
from backend.models import (
    ARPPacket, NetworkNode, ARPCacheEntry, NodeRole, NodeStatus,
    Alert, AlertSeverity, ThreatMetrics
)
from backend.detector.arp_detector import ARPDetector
from backend.mitigation.mitigation import MitigationEngine
from backend.database import db

class SimulationEngine:
    def __init__(self):
        self.detector = ARPDetector()
        self.mitigation = MitigationEngine(self.detector)
        self.nodes: Dict[str, NetworkNode] = {}
        self.total_packets_count = 0
        self.requests_count = 0
        self.replies_count = 0
        self.garp_count = 0
        self.active_attacks: List[str] = []
        self.background_traffic_enabled = True
        self.last_bg_traffic_time = time.time()
        self.simulation_speed = 1.0  # multiplier

        self._init_topology()

    def _init_topology(self):
        """Initializes the virtual network topology nodes and baseline ARP caches."""
        topology_nodes = [
            NetworkNode(
                id="node_gw",
                name="Default Gateway (Router)",
                role=NodeRole.GATEWAY,
                ip="192.168.1.1",
                mac="00:1A:2B:3C:4D:01",
                os="Cisco IOS 15.2",
                status=NodeStatus.HEALTHY,
                x=0.5,
                y=0.15
            ),
            NetworkNode(
                id="node_srv",
                name="DNS / Corporate Web Server",
                role=NodeRole.SERVER,
                ip="192.168.1.10",
                mac="00:1A:2B:3C:4D:10",
                os="Ubuntu Linux 22.04 LTS",
                status=NodeStatus.HEALTHY,
                x=0.85,
                y=0.35
            ),
            NetworkNode(
                id="node_host_a",
                name="Host A (Finance Workstation)",
                role=NodeRole.WORKSTATION,
                ip="192.168.1.101",
                mac="00:1A:2B:3C:4D:A1",
                os="Windows 11 Pro",
                status=NodeStatus.HEALTHY,
                x=0.15,
                y=0.55
            ),
            NetworkNode(
                id="node_host_b",
                name="Host B (Engineering PC)",
                role=NodeRole.WORKSTATION,
                ip="192.168.1.102",
                mac="00:1A:2B:3C:4D:A2",
                os="macOS Sequoia",
                status=NodeStatus.HEALTHY,
                x=0.45,
                y=0.8
            ),
            NetworkNode(
                id="node_host_c",
                name="Host C (HR Workstation)",
                role=NodeRole.WORKSTATION,
                ip="192.168.1.103",
                mac="00:1A:2B:3C:4D:A3",
                os="Windows 10 Enterprise",
                status=NodeStatus.HEALTHY,
                x=0.75,
                y=0.8
            ),
            NetworkNode(
                id="node_attacker",
                name="Attacker (Rogue Laptop)",
                role=NodeRole.ATTACKER,
                ip="192.168.1.200",
                mac="AA:BB:CC:DD:EE:66",
                os="Kali Linux 2024.2",
                status=NodeStatus.HEALTHY,
                x=0.15,
                y=0.2
            )
        ]

        self.nodes = {node.ip: node for node in topology_nodes}
        self._populate_initial_arp_caches()

    def _populate_initial_arp_caches(self):
        """Populates authentic, initial healthy ARP cache entries for all hosts."""
        now = time.time()
        for ip, node in self.nodes.items():
            node.arp_cache.clear()
            for other_ip, other_mac in self.detector.baseline_bindings.items():
                if other_ip != ip and other_ip != "192.168.1.200":
                    node.arp_cache[other_ip] = ARPCacheEntry(
                        ip=other_ip,
                        mac=other_mac,
                        entry_type="dynamic",
                        state="REACHABLE",
                        ttl=random.randint(180, 300),
                        last_updated=now,
                        history=[{"mac": other_mac, "timestamp": now, "state": "REACHABLE"}],
                        is_poisoned=False,
                        legitimate_mac=other_mac
                    )

    def process_packet(self, packet: ARPPacket) -> Tuple[ARPPacket, List[Alert]]:
        """
        Main pipeline: Ingests an ARP packet, runs detection algorithms,
        updates virtual node ARP caches, handles auto-mitigation, and logs to DB.
        """
        # Check if sender MAC is currently isolated by switch port security
        if packet.sender_mac.upper() in self.mitigation.isolated_macs:
            packet.is_anomalous = True
            packet.anomaly_reasons.append(f"[BLOCKED] Dropped frame from quarantined MAC {packet.sender_mac}")
            return packet, []

        self.total_packets_count += 1
        if packet.is_gratuitous:
            self.garp_count += 1
        elif packet.opcode == 1:
            self.requests_count += 1
        elif packet.opcode == 2:
            self.replies_count += 1

        # Run multi-layer detection
        is_anomalous, alerts = self.detector.inspect_packet(packet)

        # Save to database
        db.save_packet(packet)
        for alert in alerts:
            db.save_alert(alert)

        # Update node statistics & internal ARP caches
        self._update_virtual_network_state(packet)

        # Check Auto-Defense Mitigation
        if self.mitigation.auto_defense and alerts:
            for alert in alerts:
                if alert.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]:
                    # Execute cache healing broadcast
                    healing_pkts = self.mitigation.generate_healing_packets([alert.victim_ip])
                    for hpkt in healing_pkts:
                        self._update_virtual_network_state(hpkt)
                        db.save_packet(hpkt)
                    alert.mitigated = True

        return packet, alerts

    def _update_virtual_network_state(self, packet: ARPPacket):
        """Simulates how physical network nodes update their internal ARP caches upon receiving a packet."""
        sender_ip = packet.sender_ip
        sender_mac = packet.sender_mac.upper()
        target_ip = packet.target_ip
        target_mac = packet.target_mac.upper()
        now = time.time()

        # Update sender node counters
        if sender_ip in self.nodes:
            self.nodes[sender_ip].packets_sent += 1

        # Determine which nodes receive this ARP frame
        is_broadcast = (target_mac == "FF:FF:FF:FF:FF:FF" or packet.opcode == 1 or packet.is_gratuitous)

        receiving_nodes = []
        if is_broadcast:
            receiving_nodes = [node for ip, node in self.nodes.items() if ip != sender_ip]
        elif target_ip in self.nodes:
            receiving_nodes = [self.nodes[target_ip]]

        for node in receiving_nodes:
            node.packets_received += 1

            # Standard ARP cache update rule (RFC 826):
            # If the receiver has an entry for sender_ip, or if it is target_ip, update mapping
            legit_mac = self.detector.baseline_bindings.get(sender_ip, "").upper()
            is_spoofed = (legit_mac and legit_mac != sender_mac)

            # Check if this is a healing packet
            if packet.id.startswith("HEAL") or (sender_mac == legit_mac and legit_mac != ""):
                is_spoofed = False

            if sender_ip in node.arp_cache:
                entry = node.arp_cache[sender_ip]
                old_mac = entry.mac
                entry.mac = sender_mac
                entry.last_updated = now
                entry.ttl = 300
                entry.is_poisoned = is_spoofed
                entry.state = "POISONED" if is_spoofed else "REACHABLE"
                entry.history.append({"mac": sender_mac, "timestamp": now, "state": entry.state})
            elif sender_ip != node.ip and (node.ip == target_ip or is_broadcast):
                # New dynamic entry
                node.arp_cache[sender_ip] = ARPCacheEntry(
                    ip=sender_ip,
                    mac=sender_mac,
                    entry_type="dynamic",
                    state="POISONED" if is_spoofed else "REACHABLE",
                    ttl=300,
                    last_updated=now,
                    history=[{"mac": sender_mac, "timestamp": now, "state": "POISONED" if is_spoofed else "REACHABLE"}],
                    is_poisoned=is_spoofed,
                    legitimate_mac=legit_mac
                )

            # Update overall node status (Healthy / Compromised)
            any_poisoned = any(e.is_poisoned for e in node.arp_cache.values())
            if node.role == NodeRole.ATTACKER:
                node.status = NodeStatus.ISOLATED if node.mac in self.mitigation.isolated_macs else NodeStatus.HEALTHY
            elif any_poisoned:
                node.status = NodeStatus.COMPROMISED
            else:
                node.status = NodeStatus.HEALTHY

    def step_background_traffic(self) -> Optional[ARPPacket]:
        """Generates realistic normal baseline network ARP traffic periodically."""
        now = time.time()
        if not self.background_traffic_enabled or (now - self.last_bg_traffic_time) < (2.5 / self.simulation_speed):
            return None

        self.last_bg_traffic_time = now

        # Pick random legitimate communication pair
        legit_ips = ["192.168.1.1", "192.168.1.10", "192.168.1.101", "192.168.1.102", "192.168.1.103"]
        sender_ip = random.choice(legit_ips)
        target_ip = random.choice([ip for ip in legit_ips if ip != sender_ip])
        sender_mac = self.detector.baseline_bindings[sender_ip]
        target_mac = self.detector.baseline_bindings[target_ip]

        # 60% chance standard unicast reply or request, 20% GARP keepalive
        traffic_type = random.random()
        pkt_id = f"PKT-{int(now*1000)%1000000:06d}"

        if traffic_type < 0.5:
            # ARP Request (Who has target_ip? Tell sender_ip)
            packet = ARPPacket(
                id=pkt_id,
                timestamp=now,
                time_str=time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}",
                hw_type=1,
                proto_type="0x0800",
                hw_size=6,
                proto_size=4,
                opcode=1,
                opcode_name="REQUEST",
                sender_mac=sender_mac,
                sender_ip=sender_ip,
                target_mac="00:00:00:00:00:00",
                target_ip=target_ip,
                is_gratuitous=False,
                raw_hex=f"FF FF FF FF FF FF {sender_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 01"
            )
        elif traffic_type < 0.85:
            # ARP Reply (target_ip is at target_mac)
            packet = ARPPacket(
                id=pkt_id,
                timestamp=now,
                time_str=time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}",
                hw_type=1,
                proto_type="0x0800",
                hw_size=6,
                proto_size=4,
                opcode=2,
                opcode_name="REPLY",
                sender_mac=target_mac,
                sender_ip=target_ip,
                target_mac=sender_mac,
                target_ip=sender_ip,
                is_gratuitous=False,
                raw_hex=f"{sender_mac.replace(':', ' ')} {target_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
            )
        else:
            # Gratuitous ARP announcement
            packet = ARPPacket(
                id=pkt_id,
                timestamp=now,
                time_str=time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}",
                hw_type=1,
                proto_type="0x0800",
                hw_size=6,
                proto_size=4,
                opcode=2,
                opcode_name="GARP",
                sender_mac=sender_mac,
                sender_ip=sender_ip,
                target_mac="FF:FF:FF:FF:FF:FF",
                target_ip=sender_ip,
                is_gratuitous=True,
                raw_hex=f"FF FF FF FF FF FF {sender_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
            )

        processed_pkt, _ = self.process_packet(packet)
        return processed_pkt

    def get_topology_data(self) -> Dict[str, Any]:
        """Returns nodes and link matrix for frontend visualization."""
        nodes_list = []
        for ip, node in self.nodes.items():
            cache_summary = []
            for cip, entry in node.arp_cache.items():
                cache_summary.append({
                    "ip": cip,
                    "mac": entry.mac,
                    "state": entry.state,
                    "is_poisoned": entry.is_poisoned,
                    "ttl": entry.ttl
                })
            nodes_list.append({
                "id": node.id,
                "name": node.name,
                "role": node.role.value,
                "ip": node.ip,
                "mac": node.mac,
                "os": node.os,
                "status": node.status.value,
                "packets_sent": node.packets_sent,
                "packets_received": node.packets_received,
                "is_isolated": node.is_isolated or (node.mac.upper() in self.mitigation.isolated_macs),
                "arp_cache": cache_summary,
                "x": node.x,
                "y": node.y
            })

        metrics = self.detector.get_threat_metrics(
            total_pkts=self.total_packets_count,
            req_cnt=self.requests_count,
            rep_cnt=self.replies_count,
            garp_cnt=self.garp_count,
            mitigations=self.mitigation.mitigations_count,
            active_atks=self.active_attacks,
            auto_defense=self.mitigation.auto_defense,
            mode="simulation"
        )

        return {
            "nodes": nodes_list,
            "metrics": metrics.model_dump(),
            "isolated_macs": list(self.mitigation.isolated_macs)
        }

    def reset_simulation(self):
        """Resets all node caches, alert logs, and counters to pristine baseline state."""
        self.detector.reset()
        self.mitigation.isolated_macs.clear()
        self.total_packets_count = 0
        self.requests_count = 0
        self.replies_count = 0
        self.garp_count = 0
        self.active_attacks.clear()
        self._init_topology()
        db.clear_all()

