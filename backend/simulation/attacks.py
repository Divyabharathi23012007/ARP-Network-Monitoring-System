import time
import uuid
import random
from typing import List, Optional
from backend.models import ARPPacket, AttackConfig

class AttackSimulator:
    def __init__(self, simulation_engine):
        self.engine = simulation_engine

    def launch_mitm_attack(self, victim_ip: str = "192.168.1.101", gateway_ip: str = "192.168.1.1", attacker_mac: str = "AA:BB:CC:DD:EE:66") -> List[ARPPacket]:
        """
        Executes bidirectional MITM ARP cache poisoning:
        1. Tells Victim that Gateway IP is at Attacker MAC
        2. Tells Gateway that Victim IP is at Attacker MAC
        """
        now = time.time()
        time_str = time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}"
        packets = []

        # Packet 1: To Victim (Host A) -> "192.168.1.1 is at AA:BB:CC:DD:EE:66"
        p1 = ARPPacket(
            id=f"ATK-MITM-V-{int(now*1000)%1000000:06d}",
            timestamp=now,
            time_str=time_str,
            hw_type=1,
            proto_type="0x0800",
            hw_size=6,
            proto_size=4,
            opcode=2,
            opcode_name="REPLY (POISON)",
            sender_mac=attacker_mac,
            sender_ip=gateway_ip,       # Claiming to be Gateway!
            target_mac=self.engine.detector.baseline_bindings.get(victim_ip, "00:1A:2B:3C:4D:A1"),
            target_ip=victim_ip,
            is_gratuitous=False,
            raw_hex=f"{self.engine.detector.baseline_bindings.get(victim_ip, '00:1A:2B:3C:4D:A1').replace(':', ' ')} {attacker_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
        )
        packets.append(p1)

        # Packet 2: To Gateway (Router) -> "192.168.1.101 is at AA:BB:CC:DD:EE:66"
        p2 = ARPPacket(
            id=f"ATK-MITM-GW-{int(now*1000)%1000000:06d}",
            timestamp=now + 0.01,
            time_str=time_str,
            hw_type=1,
            proto_type="0x0800",
            hw_size=6,
            proto_size=4,
            opcode=2,
            opcode_name="REPLY (POISON)",
            sender_mac=attacker_mac,
            sender_ip=victim_ip,        # Claiming to be Victim!
            target_mac=self.engine.detector.baseline_bindings.get(gateway_ip, "00:1A:2B:3C:4D:01"),
            target_ip=gateway_ip,
            is_gratuitous=False,
            raw_hex=f"{self.engine.detector.baseline_bindings.get(gateway_ip, '00:1A:2B:3C:4D:01').replace(':', ' ')} {attacker_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
        )
        packets.append(p2)

        return packets

    def launch_gateway_hijack(self, gateway_ip: str = "192.168.1.1", attacker_mac: str = "AA:BB:CC:DD:EE:66") -> List[ARPPacket]:
        """
        Broadcasts unsolicited Gratuitous ARP claiming to be the Default Gateway to all subnet nodes.
        """
        now = time.time()
        time_str = time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}"
        
        p = ARPPacket(
            id=f"ATK-GW-HIJACK-{int(now*1000)%1000000:06d}",
            timestamp=now,
            time_str=time_str,
            hw_type=1,
            proto_type="0x0800",
            hw_size=6,
            proto_size=4,
            opcode=2,
            opcode_name="GARP (HIJACK)",
            sender_mac=attacker_mac,
            sender_ip=gateway_ip,       # Impersonating Gateway
            target_mac="FF:FF:FF:FF:FF:FF",
            target_ip=gateway_ip,
            is_gratuitous=True,
            raw_hex=f"FF FF FF FF FF FF {attacker_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
        )
        return [p]

    def launch_garp_storm(self, count: int = 10, attacker_mac: str = "AA:BB:CC:DD:EE:66") -> List[ARPPacket]:
        """
        Generates a rapid burst of Gratuitous ARP announcements to trigger rate and flooding detectors.
        """
        packets = []
        now = time.time()
        for i in range(count):
            offset = i * 0.05
            target_ip = f"192.168.1.{random.randint(1, 254)}"
            p = ARPPacket(
                id=f"ATK-STORM-{int((now+offset)*1000)%1000000:06d}-{i+1}",
                timestamp=now + offset,
                time_str=time.strftime("%H:%M:%S") + f".{int(((now+offset) % 1) * 1000):03d}",
                hw_type=1,
                proto_type="0x0800",
                hw_size=6,
                proto_size=4,
                opcode=2,
                opcode_name="GARP (STORM)",
                sender_mac=attacker_mac,
                sender_ip=target_ip,
                target_mac="FF:FF:FF:FF:FF:FF",
                target_ip=target_ip,
                is_gratuitous=True,
                raw_hex=f"FF FF FF FF FF FF {attacker_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
            )
            packets.append(p)
        return packets

    def launch_flip_flop(self, target_ip: str = "192.168.1.1", attacker_mac: str = "AA:BB:CC:DD:EE:66") -> List[ARPPacket]:
        """
        Generates alternating ARP announcements with genuine MAC and rogue MAC in quick succession.
        """
        legit_mac = self.engine.detector.baseline_bindings.get(target_ip, "00:1A:2B:3C:4D:01")
        packets = []
        now = time.time()

        for i in range(4):
            offset = i * 0.1
            mac_to_use = attacker_mac if i % 2 == 0 else legit_mac
            is_mal = (mac_to_use == attacker_mac)
            p = ARPPacket(
                id=f"ATK-FLIP-{int((now+offset)*1000)%1000000:06d}-{i+1}",
                timestamp=now + offset,
                time_str=time.strftime("%H:%M:%S") + f".{int(((now+offset) % 1) * 1000):03d}",
                hw_type=1,
                proto_type="0x0800",
                hw_size=6,
                proto_size=4,
                opcode=2,
                opcode_name="REPLY (FLAP)" if is_mal else "REPLY (LEGIT)",
                sender_mac=mac_to_use,
                sender_ip=target_ip,
                target_mac="FF:FF:FF:FF:FF:FF",
                target_ip=target_ip,
                is_gratuitous=True,
                raw_hex=f"FF FF FF FF FF FF {mac_to_use.replace(':', ' ')} 08 06 00 01 08 00 06 04 00 02"
            )
            packets.append(p)
        return packets

    def launch_bogon_attack(self) -> List[ARPPacket]:
        """
        Injects frames with invalid/illegal hardware addresses (e.g. 00:00:00:00:00:00 or multicast).
        """
        now = time.time()
        time_str = time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}"
        
        p = ARPPacket(
            id=f"ATK-BOGON-{int(now*1000)%1000000:06d}",
            timestamp=now,
            time_str=time_str,
            hw_type=1,
            proto_type="0x0800",
            hw_size=6,
            proto_size=4,
            opcode=2,
            opcode_name="REPLY (BOGON)",
            sender_mac="00:00:00:00:00:00",
            sender_ip="192.168.1.1",
            target_mac="FF:FF:FF:FF:FF:FF",
            target_ip="192.168.1.1",
            is_gratuitous=True,
            raw_hex="FF FF FF FF FF FF 00 00 00 00 00 00 08 06 00 01 08 00 06 04 00 02"
        )
        return [p]

    def craft_custom_packet(self, opcode: int, sender_mac: str, sender_ip: str, target_mac: str, target_ip: str) -> ARPPacket:
        """Crafts an arbitrary user-defined ARP packet."""
        now = time.time()
        time_str = time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}"
        is_garp = (sender_ip == target_ip and (target_mac in ["FF:FF:FF:FF:FF:FF", "00:00:00:00:00:00"] or opcode == 2))
        
        opcode_name = "REQUEST" if opcode == 1 else "REPLY"
        if is_garp:
            opcode_name = "GARP"

        p = ARPPacket(
            id=f"PKT-CUSTOM-{int(now*1000)%1000000:06d}",
            timestamp=now,
            time_str=time_str,
            hw_type=1,
            proto_type="0x0800",
            hw_size=6,
            proto_size=4,
            opcode=opcode,
            opcode_name=opcode_name,
            sender_mac=sender_mac,
            sender_ip=sender_ip,
            target_mac=target_mac,
            target_ip=target_ip,
            is_gratuitous=is_garp,
            raw_hex=f"{target_mac.replace(':', ' ')} {sender_mac.replace(':', ' ')} 08 06 00 01 08 00 06 04 {opcode:04x}"
        )
        return p

