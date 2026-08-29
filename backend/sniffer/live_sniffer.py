import time
import threading
from typing import Optional, Callable
from backend.models import ARPPacket

class LiveARPSniffer:
    """
    Live ARP Packet Sniffer for real network interfaces.
    Provides non-blocking background sniffing with graceful degradation if raw socket permissions are absent.
    """
    def __init__(self, packet_callback: Optional[Callable[[ARPPacket], None]] = None):
        self.packet_callback = packet_callback
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.interface: Optional[str] = None
        self.error_message: Optional[str] = None

    def start(self, interface: Optional[str] = None) -> bool:
        if self.is_running:
            return True

        self.interface = interface
        self.is_running = True
        self.error_message = None

        try:
            self.thread = threading.Thread(target=self._sniff_worker, daemon=True)
            self.thread.start()
            return True
        except Exception as e:
            self.is_running = False
            self.error_message = str(e)
            return False

    def stop(self):
        self.is_running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self.thread = None

    def _sniff_worker(self):
        """Worker thread attempting Scapy sniffing or socket sniffing."""
        try:
            from scapy.all import sniff, ARP, Ether
            
            def scapy_handler(pkt):
                if not self.is_running:
                    return False
                if pkt.haslayer(ARP):
                    arp_layer = pkt[ARP]
                    now = time.time()
                    time_str = time.strftime("%H:%M:%S") + f".{int((now % 1) * 1000):03d}"
                    
                    is_garp = (arp_layer.psrc == arp_layer.pdst)
                    opcode_name = "REQUEST" if arp_layer.op == 1 else "REPLY"
                    if is_garp:
                        opcode_name = "GARP"

                    parsed_pkt = ARPPacket(
                        id=f"LIVE-{int(now*1000)%1000000:06d}",
                        timestamp=now,
                        time_str=time_str,
                        hw_type=arp_layer.hwtype,
                        proto_type=hex(arp_layer.ptype),
                        hw_size=arp_layer.hwlen,
                        proto_size=arp_layer.plen,
                        opcode=arp_layer.op,
                        opcode_name=opcode_name,
                        sender_mac=arp_layer.hwsrc.upper(),
                        sender_ip=arp_layer.psrc,
                        target_mac=arp_layer.hwdst.upper(),
                        target_ip=arp_layer.pdst,
                        is_gratuitous=is_garp,
                        raw_hex=" ".join(f"{b:02X}" for b in bytes(pkt)[:28])
                    )
                    if self.packet_callback:
                        self.packet_callback(parsed_pkt)

            sniff(filter="arp", prn=scapy_handler, store=0, stop_filter=lambda p: not self.is_running)

        except ImportError:
            self.error_message = "Scapy not installed. Live sniffing unavailable (Simulation mode active)."
            self.is_running = False
        except Exception as e:
            self.error_message = f"Live sniff permission error: {e}. Simulation mode active."
            self.is_running = False

