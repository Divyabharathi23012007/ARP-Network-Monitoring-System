import time
from typing import List, Dict, Any, Optional
from backend.models import ARPPacket, NetworkNode, Alert, AlertSeverity

class MitigationEngine:
    def __init__(self, detector):
        self.detector = detector
        self.auto_defense: bool = False
        self.mitigation_history: List[Dict[str, Any]] = []
        self.isolated_macs: set = set()
        self.mitigations_count: int = 0

    def toggle_auto_defense(self, enabled: bool) -> bool:
        self.auto_defense = enabled
        return self.auto_defense

    def isolate_mac(self, mac: str) -> Dict[str, Any]:
        """Simulates quarantine / port isolation for a rogue MAC address."""
        clean_mac = mac.upper()
        self.isolated_macs.add(clean_mac)
        self.mitigations_count += 1
        record = {
            "timestamp": time.time(),
            "time_str": time.strftime("%H:%M:%S"),
            "action": "PORT_ISOLATION",
            "target": clean_mac,
            "details": f"Layer-2 Switch port shutdown for rogue MAC {clean_mac}. All incoming/outgoing frames blocked."
        }
        self.mitigation_history.append(record)
        return record

    def un机isolate_mac(self, mac: str) -> Dict[str, Any]:
        clean_mac = mac.upper()
        if clean_mac in self.isolated_macs:
            self.isolated_macs.remove(clean_mac)
        return {"action": "UNISOLATE", "target": clean_mac, "status": "restored"}

    def generate_healing_packets(self, target_ips: Optional[List[str]] = None) -> List[ARPPacket]:
        """
        Creates authoritative Gratuitous ARP frames with true baseline MACs
        to cleanse poisoned caches across all nodes in the subnet.
        """
        if not target_ips:
            target_ips = list(self.detector.baseline_bindings.keys())

        healing_packets = []
        now = time.time()

        for ip in target_ips:
            if ip in self.detector.baseline_bindings:
                legit_mac = self.detector.baseline_bindings[ip]
                pkt_id = f"HEAL-{int(now*1000)%1000000:06d}-{ip.split('.')[-1]}"
                
                # Authoritative GARP announcement: Opcode 2 (Reply), Target MAC = FF:FF:FF:FF:FF:FF
                heal_pkt = ARPPacket(
                    id=pkt_id,
                    timestamp=now,
                    time_str=time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}",
                    hw_type=1,
                    proto_type="0x0800",
                    hw_size=6,
                    proto_size=4,
                    opcode=2,
                    opcode_name="GARP (HEAL)",
                    sender_mac=legit_mac,
                    sender_ip=ip,
                    target_mac="FF:FF:FF:FF:FF:FF",
                    target_ip=ip,
                    is_gratuitous=True,
                    is_anomalous=False,
                    anomaly_reasons=["[DEFENSE] Authoritative Gratuitous ARP Poison-Healer packet"],
                    raw_hex=f"FF FF FF FF FF FF {legit_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
                )
                healing_packets.append(heal_pkt)

        self.mitigations_count += len(healing_packets)
        self.mitigation_history.append({
            "timestamp": now,
            "time_str": time.strftime("%H:%M:%S"),
            "action": "CACHE_PURGE_AND_HEAL",
            "target": "BROADCAST_ALL",
            "details": f"Broadcasted {len(healing_packets)} authoritative Gratuitous ARP healing frames for active subnet bindings."
        })
        return healing_packets

    def generate_defense_scripts(self) -> Dict[str, str]:
        """Generates static ARP binding commands for Windows, Linux, and Cisco devices."""
        bindings = self.detector.baseline_bindings
        
        # Windows Script
        win_cmds = [
            "@echo off",
            ":: Static ARP Configuration for Windows to Prevent ARP Poisoning",
            ":: Run in Administrator Command Prompt",
            "echo Configuring Static ARP Entries...",
            ""
        ]
        for ip, mac in bindings.items():
            win_cmds.append(f'netsh interface ipv4 add neighbors "Ethernet" {ip} {mac}')
        win_cmds.append("echo Static ARP entries successfully configured.")
        win_cmds.append("arp -a")

        # Linux Script
        linux_cmds = [
            "#!/bin/bash",
            "# Static ARP Configuration for Linux / Unix to Prevent ARP Poisoning",
            "# Run with sudo privileges",
            "echo '[+] Applying Static ARP Table Bindings...'",
            ""
        ]
        for ip, mac in bindings.items():
            linux_cmds.append(f"ip neigh replace {ip} lladdr {mac} dev eth0 nud permanent")
        linux_cmds.append("echo '[+] Verification: current ARP cache:'")
        linux_cmds.append("ip neigh show")

        # Cisco Switch IOS Commands
        cisco_cmds = [
            "! Cisco IOS Dynamic ARP Inspection (DAI) & DHCP Snooping Config",
            "configure terminal",
            "ip dhcp snooping",
            "ip dhcp snooping vlan 1",
            "ip arp inspection vlan 1",
            "ip arp inspection validate src-mac dst-mac ip",
            "!",
            "! Define Static ARP Access-List for trusted static infrastructure",
            "arp access-list DAI-STATIC-BINDINGS"
        ]
        for ip, mac in bindings.items():
            cisco_cmds.append(f" permit ip host {ip} mac host {mac.lower()}")
        cisco_cmds.extend([
            "exit",
            "ip arp inspection filter DAI-STATIC-BINDINGS vlan 1 static",
            "!",
            "! Rate-limiting to mitigate ARP storms (15 packets/sec threshold)",
            "interface FastEthernet0/1 - 24",
            " ip arp inspection limit rate 15",
            "end",
            "write memory"
        ])

        return {
            "windows": "\n".join(win_cmds),
            "linux": "\n".join(linux_cmds),
            "cisco": "\n".join(cisco_cmds)
        }

