import time
import uuid
from typing import List, Dict, Tuple, Optional
from collections import defaultdict, deque
from backend.models import ARPPacket, Alert, AlertSeverity, ThreatMetrics

class ARPDetector:
    def __init__(self):
        # Baseline ground truth binding table (IP -> legitimate MAC)
        self.baseline_bindings: Dict[str, str] = {
            "192.168.1.1": "00:1A:2B:3C:4D:01",    # Gateway Router
            "192.168.1.10": "00:1A:2B:3C:4D:10",   # Web / DNS Server
            "192.168.1.101": "00:1A:2B:3C:4D:A1",  # Host A (Finance Dept)
            "192.168.1.102": "00:1A:2B:3C:4D:A2",  # Host B (Engineering)
            "192.168.1.103": "00:1A:2B:3C:4D:A3",  # Host C (HR Workstation)
            "192.168.1.200": "AA:BB:CC:DD:EE:66",  # Attacker / Rogue Host
        }

        # Critical infrastructure nodes requiring strict watchdog
        self.critical_nodes: Dict[str, str] = {
            "192.168.1.1": "Default Gateway (Router)",
            "192.168.1.10": "DNS / Corporate Web Server"
        }

        # Sliding window for rate anomaly detection (timestamps)
        self.packet_timestamps = deque(maxlen=200)
        self.garp_timestamps = deque(maxlen=100)

        # Flip-flop churn tracking: ip -> deque of (mac, timestamp)
        self.ip_mac_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=20))

        # Recent pending requests for unsolicited reply detection: (target_ip, requester_ip) -> timestamp
        self.pending_requests: Dict[Tuple[str, str], float] = {}

        # Threat calculation parameters
        self.threat_score = 0
        self.last_threat_decay = time.time()
        self.anomalies_count = 0

    def inspect_packet(self, packet: ARPPacket) -> Tuple[bool, List[Alert]]:
        """
        Inspects an incoming ARP packet against all anomaly detection algorithms.
        Returns: (is_anomalous, list_of_generated_alerts)
        """
        now = time.time()
        packet_time_str = time.strftime("%H:%M:%S", time.localtime(now)) + f".{int((now % 1) * 1000):03d}"
        packet.time_str = packet_time_str
        alerts: List[Alert] = []
        anomaly_reasons = []

        self.packet_timestamps.append(now)
        if packet.is_gratuitous:
            self.garp_timestamps.append(now)

        # 1. Header Validation / Malformed Frame Checks
        is_malformed, malformed_alerts = self._check_header_anomalies(packet, now, packet_time_str)
        if is_malformed:
            alerts.extend(malformed_alerts)
            anomaly_reasons.extend([a.description for a in malformed_alerts])

        # 2. Dynamic ARP Inspection (DAI) - Baseline Verification
        dai_anomalous, dai_alerts = self._check_baseline_binding(packet, now, packet_time_str)
        if dai_anomalous:
            alerts.extend(dai_alerts)
            anomaly_reasons.extend([a.description for a in dai_alerts])

        # 3. Critical Node / Gateway Hijack Watchdog
        gw_anomalous, gw_alerts = self._check_critical_gateway_spoof(packet, now, packet_time_str)
        if gw_anomalous:
            alerts.extend(gw_alerts)
            anomaly_reasons.extend([a.description for a in gw_alerts])

        # 4. Flip-Flop / High-Frequency MAC Churn Detection
        ff_anomalous, ff_alerts = self._check_flip_flop_churn(packet, now, packet_time_str)
        if ff_anomalous:
            alerts.extend(ff_alerts)
            anomaly_reasons.extend([a.description for a in ff_alerts])

        # 5. Rate / Gratuitous ARP Storm Anomaly Detection
        rate_anomalous, rate_alerts = self._check_rate_anomalies(packet, now, packet_time_str)
        if rate_anomalous:
            alerts.extend(rate_alerts)
            anomaly_reasons.extend([a.description for a in rate_alerts])

        # Track pending request or clear it on reply
        if packet.opcode == 1:  # REQUEST
            self.pending_requests[(packet.target_ip, packet.sender_ip)] = now
        elif packet.opcode == 2:  # REPLY
            # Check if this was an unsolicited reply (optional warning)
            req_key = (packet.sender_ip, packet.target_ip)
            if req_key in self.pending_requests:
                del self.pending_requests[req_key]

        # Update threat score
        if alerts:
            packet.is_anomalous = True
            packet.anomaly_reasons = anomaly_reasons
            self.anomalies_count += len(alerts)
            for alert in alerts:
                self.threat_score = min(100, self.threat_score + alert.threat_score_impact)
        else:
            packet.is_anomalous = False

        # Apply gradual threat decay
        self._decay_threat_score()

        return packet.is_anomalous, alerts

    def _check_header_anomalies(self, packet: ARPPacket, now: float, time_str: str) -> Tuple[bool, List[Alert]]:
        alerts = []
        sender_mac_clean = packet.sender_mac.upper()

        # Check for zero or broadcast sender MAC
        if sender_mac_clean in ["00:00:00:00:00:00", "FF:FF:FF:FF:FF:FF"]:
            alert = Alert(
                id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                timestamp=now,
                time_str=time_str,
                severity=AlertSeverity.HIGH,
                attack_type="Malformed ARP Header (Bogon MAC)",
                source_node=f"MAC {packet.sender_mac}",
                target_node=packet.target_ip,
                victim_ip=packet.sender_ip,
                claimed_mac=packet.sender_mac,
                legitimate_mac=self.baseline_bindings.get(packet.sender_ip),
                description=f"Illegal sender hardware address '{packet.sender_mac}' detected in ARP frame for IP {packet.sender_ip}.",
                threat_score_impact=20,
                mitigation_suggested="Drop malformed frame and flag switch interface for illegal Layer-2 encapsulation."
            )
            alerts.append(alert)

        # Check for Multicast MAC in unicast sender position
        if sender_mac_clean.startswith("01:00:5E") or sender_mac_clean.startswith("33:33"):
            alert = Alert(
                id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                timestamp=now,
                time_str=time_str,
                severity=AlertSeverity.MEDIUM,
                attack_type="Multicast MAC in Unicast Field",
                source_node=f"MAC {packet.sender_mac}",
                target_node=packet.target_ip,
                victim_ip=packet.sender_ip,
                claimed_mac=packet.sender_mac,
                legitimate_mac=self.baseline_bindings.get(packet.sender_ip),
                description=f"Sender MAC {packet.sender_mac} is a Multicast address used in unicast context.",
                threat_score_impact=15,
                mitigation_suggested="Enforce standard unicast MAC source filtering."
            )
            alerts.append(alert)

        return len(alerts) > 0, alerts

    def _check_baseline_binding(self, packet: ARPPacket, now: float, time_str: str) -> Tuple[bool, List[Alert]]:
        alerts = []
        sender_ip = packet.sender_ip
        sender_mac = packet.sender_mac.upper()

        if sender_ip in self.baseline_bindings:
            legit_mac = self.baseline_bindings[sender_ip].upper()
            if legit_mac != sender_mac:
                # Do not duplicate if this is specifically the gateway (handled in _check_critical_gateway_spoof)
                if sender_ip not in self.critical_nodes:
                    alert = Alert(
                        id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        timestamp=now,
                        time_str=time_str,
                        severity=AlertSeverity.HIGH,
                        attack_type="Dynamic ARP Inspection (DAI) Violation",
                        source_node=f"Rogue MAC {sender_mac}",
                        target_node=packet.target_ip if packet.target_ip != "0.0.0.0" else "BROADCAST",
                        victim_ip=sender_ip,
                        claimed_mac=sender_mac,
                        legitimate_mac=legit_mac,
                        description=f"Host claiming IP {sender_ip} with MAC {sender_mac} violates trusted baseline binding (Expected: {legit_mac}).",
                        threat_score_impact=25,
                        mitigation_suggested=f"Enforce DAI filtering on port; send legitimate Gratuitous ARP to restore cache for {sender_ip}."
                    )
                    alerts.append(alert)

        return len(alerts) > 0, alerts

    def _check_critical_gateway_spoof(self, packet: ARPPacket, now: float, time_str: str) -> Tuple[bool, List[Alert]]:
        alerts = []
        sender_ip = packet.sender_ip
        sender_mac = packet.sender_mac.upper()

        if sender_ip in self.critical_nodes:
            legit_mac = self.baseline_bindings[sender_ip].upper()
            if legit_mac != sender_mac:
                node_name = self.critical_nodes[sender_ip]
                alert = Alert(
                    id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    timestamp=now,
                    time_str=time_str,
                    severity=AlertSeverity.CRITICAL,
                    attack_type=f"Critical Infrastructure Hijack ({node_name})",
                    source_node=f"Rogue MAC {sender_mac}",
                    target_node=packet.target_ip,
                    victim_ip=sender_ip,
                    claimed_mac=sender_mac,
                    legitimate_mac=legit_mac,
                    description=f"CRITICAL: Attacker {sender_mac} is actively impersonating {node_name} ({sender_ip}) to intercept network traffic!",
                    threat_score_impact=40,
                    mitigation_suggested="Isolate rogue MAC port immediately and inject authoritative Gratuitous ARP healing broadcast."
                )
                alerts.append(alert)

        return len(alerts) > 0, alerts

    def _check_flip_flop_churn(self, packet: ARPPacket, now: float, time_str: str) -> Tuple[bool, List[Alert]]:
        alerts = []
        sender_ip = packet.sender_ip
        sender_mac = packet.sender_mac.upper()
        history = self.ip_mac_history[sender_ip]

        # Record this observation
        history.append((sender_mac, now))

        # Check for rapid transitions within last 5 seconds
        recent_entries = [m for m, t in history if now - t <= 5.0]
        if len(recent_entries) >= 3:
            # Count distinct MAC changes in recent sequence
            transitions = sum(1 for i in range(1, len(recent_entries)) if recent_entries[i] != recent_entries[i-1])
            if transitions >= 2:
                distinct_macs = list(set(recent_entries))
                alert = Alert(
                    id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    timestamp=now,
                    time_str=time_str,
                    severity=AlertSeverity.HIGH,
                    attack_type="High-Frequency ARP Flip-Flop Churn",
                    source_node=f"Multiple MACs ({', '.join(distinct_macs)})",
                    target_node=packet.target_ip,
                    victim_ip=sender_ip,
                    claimed_mac=sender_mac,
                    legitimate_mac=self.baseline_bindings.get(sender_ip),
                    description=f"IP {sender_ip} is rapidly oscillating between {len(distinct_macs)} MAC addresses ({transitions} transitions in 5s). Characteristic of active race-condition ARP poisoning.",
                    threat_score_impact=30,
                    mitigation_suggested="Freeze ARP table entry for IP and isolate non-baseline MAC interface."
                )
                alerts.append(alert)

        return len(alerts) > 0, alerts

    def _check_rate_anomalies(self, packet: ARPPacket, now: float, time_str: str) -> Tuple[bool, List[Alert]]:
        alerts = []
        # Calculate recent packet rate in the last 2 seconds
        recent_total = sum(1 for t in self.packet_timestamps if now - t <= 2.0)
        recent_garp = sum(1 for t in self.garp_timestamps if now - t <= 2.0)

        # Gratuitous ARP flood threshold (> 6 GARP in 2s)
        if packet.is_gratuitous and recent_garp > 6:
            alert = Alert(
                id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                timestamp=now,
                time_str=time_str,
                severity=AlertSeverity.HIGH,
                attack_type="Gratuitous ARP (GARP) Storm / Denial of Service",
                source_node=f"MAC {packet.sender_mac}",
                target_node="ALL NODES (Broadcast)",
                victim_ip=packet.sender_ip,
                claimed_mac=packet.sender_mac,
                legitimate_mac=self.baseline_bindings.get(packet.sender_ip),
                description=f"Detected abnormal burst of Gratuitous ARP frames ({recent_garp} pkts / 2 sec). Flooding aims to exhaust CAM tables and corrupt caches.",
                threat_score_impact=25,
                mitigation_suggested="Apply switch ARP rate-limiting (DAI rate threshold: 15 pps) and quarantine offending port."
            )
            alerts.append(alert)
        # General ARP flood threshold (> 18 ARP pkts in 2s)
        elif recent_total > 18:
            alert = Alert(
                id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                timestamp=now,
                time_str=time_str,
                severity=AlertSeverity.MEDIUM,
                attack_type="ARP Packet Rate Anomaly",
                source_node=f"MAC {packet.sender_mac}",
                target_node=packet.target_ip,
                victim_ip=packet.sender_ip,
                claimed_mac=packet.sender_mac,
                legitimate_mac=self.baseline_bindings.get(packet.sender_ip),
                description=f"High ARP packet throughput detected ({recent_total} pkts / 2 sec). Possible ARP network sweep or port scan.",
                threat_score_impact=15,
                mitigation_suggested="Enable ARP request rate-limiting on access switches."
            )
            alerts.append(alert)

        return len(alerts) > 0, alerts

    def _decay_threat_score(self):
        """Gradually decays threat score over time when no recent attacks occur."""
        now = time.time()
        elapsed = now - self.last_threat_decay
        if elapsed >= 3.0:
            decay_amount = int(elapsed * 2)  # 2 points per second
            self.threat_score = max(0, self.threat_score - decay_amount)
            self.last_threat_decay = now

    def get_threat_metrics(self, total_pkts: int, req_cnt: int, rep_cnt: int, garp_cnt: int, mitigations: int, active_atks: List[str], auto_defense: bool, mode: str) -> ThreatMetrics:
        level = "NORMAL"
        if self.threat_score >= 70:
            level = "CRITICAL"
        elif self.threat_score >= 40:
            level = "HIGH"
        elif self.threat_score >= 15:
            level = "ELEVATED"

        return ThreatMetrics(
            current_threat_score=self.threat_score,
            threat_level=level,
            total_packets=total_pkts,
            arp_requests=req_cnt,
            arp_replies=rep_cnt,
            gratuitous_arp=garp_cnt,
            anomalies_detected=self.anomalies_count,
            mitigations_applied=mitigations,
            active_attacks=active_atks,
            auto_defense_enabled=auto_defense,
            mode=mode
        )

    def reset(self):
        self.packet_timestamps.clear()
        self.garp_timestamps.clear()
        self.ip_mac_history.clear()
        self.pending_requests.clear()
        self.threat_score = 0
        self.anomalies_count = 0

