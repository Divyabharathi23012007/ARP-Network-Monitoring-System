from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum
import time

class ARPOpcode(int, Enum):
    REQUEST = 1
    REPLY = 2
    RARP_REQUEST = 3
    RARP_REPLY = 4
    GARP = 24  # Gratuitous ARP indicator

class AlertSeverity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class NodeRole(str, Enum):
    GATEWAY = "gateway"
    SERVER = "server"
    WORKSTATION = "workstation"
    ATTACKER = "attacker"
    SWITCH = "switch"

class NodeStatus(str, Enum):
    HEALTHY = "HEALTHY"
    SUSPICIOUS = "SUSPICIOUS"
    COMPROMISED = "COMPROMISED"
    ISOLATED = "ISOLATED"

class ARPPacket(BaseModel):
    id: str
    timestamp: float = Field(default_factory=time.time)
    time_str: str = ""
    hw_type: int = 1  # Ethernet (10Mb)
    proto_type: str = "0x0800"  # IPv4
    hw_size: int = 6  # MAC address size
    proto_size: int = 4  # IPv4 size
    opcode: int = 1  # 1=Request, 2=Reply
    opcode_name: str = "REQUEST"
    sender_mac: str
    sender_ip: str
    target_mac: str
    target_ip: str
    is_gratuitous: bool = False
    is_anomalous: bool = False
    anomaly_reasons: List[str] = Field(default_factory=list)
    raw_hex: str = ""

class ARPCacheEntry(BaseModel):
    ip: str
    mac: str
    entry_type: str = "dynamic"  # dynamic / static
    state: str = "REACHABLE"     # REACHABLE / STALE / POISONED / CONFLICT
    ttl: int = 300               # seconds remaining
    last_updated: float = Field(default_factory=time.time)
    history: List[Dict[str, Any]] = Field(default_factory=list)
    is_poisoned: bool = False
    legitimate_mac: Optional[str] = None

class NetworkNode(BaseModel):
    id: str
    name: str
    role: NodeRole
    ip: str
    mac: str
    os: str = "Linux"
    status: NodeStatus = NodeStatus.HEALTHY
    arp_cache: Dict[str, ARPCacheEntry] = Field(default_factory=dict)
    packets_sent: int = 0
    packets_received: int = 0
    alerts_count: int = 0
    is_isolated: bool = False
    x: Optional[float] = None
    y: Optional[float] = None

class Alert(BaseModel):
    id: str
    timestamp: float = Field(default_factory=time.time)
    time_str: str = ""
    severity: AlertSeverity
    attack_type: str
    source_node: str
    target_node: str
    victim_ip: str
    claimed_mac: str
    legitimate_mac: Optional[str] = None
    description: str
    packet_id: Optional[str] = None
    threat_score_impact: int = 10
    mitigation_suggested: str = ""
    mitigated: bool = False

class AttackConfig(BaseModel):
    attack_type: str  # "mitm", "gateway_hijack", "garp_flood", "flip_flop", "bogon", "custom"
    target_ip: str = "192.168.1.1"
    victim_ip: Optional[str] = "192.168.1.101"
    spoofed_mac: Optional[str] = "AA:BB:CC:DD:EE:66"
    interval_ms: int = 500
    count: int = 10
    active: bool = False

class ThreatMetrics(BaseModel):
    current_threat_score: int = 0  # 0 to 100
    threat_level: str = "NORMAL"   # NORMAL, ELEVATED, HIGH, CRITICAL
    total_packets: int = 0
    arp_requests: int = 0
    arp_replies: int = 0
    gratuitous_arp: int = 0
    anomalies_detected: int = 0
    mitigations_applied: int = 0
    active_attacks: List[str] = Field(default_factory=list)
    auto_defense_enabled: bool = False
    mode: str = "simulation"       # simulation / live

class CustomPacketRequest(BaseModel):
    opcode: int = 2
    sender_mac: str
    sender_ip: str
    target_mac: str
    target_ip: str
    count: int = 1

