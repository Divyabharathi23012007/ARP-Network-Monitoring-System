import sqlite3
import json
import time
from typing import List, Dict, Any, Optional
from collections import deque
from backend.models import ARPPacket, Alert, ThreatMetrics

DB_PATH = "arp_monitor.db"

class DatabaseManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.packet_buffer = deque(maxlen=500)
        self.alert_buffer = deque(maxlen=200)
        self.init_db()

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Packets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS packets (
                    id TEXT PRIMARY KEY,
                    timestamp REAL,
                    time_str TEXT,
                    hw_type INTEGER,
                    proto_type TEXT,
                    opcode INTEGER,
                    opcode_name TEXT,
                    sender_mac TEXT,
                    sender_ip TEXT,
                    target_mac TEXT,
                    target_ip TEXT,
                    is_gratuitous INTEGER,
                    is_anomalous INTEGER,
                    anomaly_reasons TEXT,
                    raw_hex TEXT
                )
            """)

            # Alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    timestamp REAL,
                    time_str TEXT,
                    severity TEXT,
                    attack_type TEXT,
                    source_node TEXT,
                    target_node TEXT,
                    victim_ip TEXT,
                    claimed_mac TEXT,
                    legitimate_mac TEXT,
                    description TEXT,
                    packet_id TEXT,
                    threat_score_impact INTEGER,
                    mitigation_suggested TEXT,
                    mitigated INTEGER
                )
            """)

            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS session_summary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time REAL,
                    end_time REAL,
                    total_packets INTEGER,
                    anomalies_detected INTEGER,
                    attacks_launched INTEGER,
                    mitigations_applied INTEGER,
                    summary_json TEXT
                )
            """)
            conn.commit()

    def save_packet(self, packet: ARPPacket):
        self.packet_buffer.appendleft(packet)
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO packets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    packet.id,
                    packet.timestamp,
                    packet.time_str,
                    packet.hw_type,
                    packet.proto_type,
                    packet.opcode,
                    packet.opcode_name,
                    packet.sender_mac,
                    packet.sender_ip,
                    packet.target_mac,
                    packet.target_ip,
                    1 if packet.is_gratuitous else 0,
                    1 if packet.is_anomalous else 0,
                    json.dumps(packet.anomaly_reasons),
                    packet.raw_hex
                ))
                conn.commit()
        except Exception as e:
            print(f"[DB] Error saving packet: {e}")

    def save_alert(self, alert: Alert):
        self.alert_buffer.appendleft(alert)
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert.id,
                    alert.timestamp,
                    alert.time_str,
                    alert.severity.value if hasattr(alert.severity, 'value') else str(alert.severity),
                    alert.attack_type,
                    alert.source_node,
                    alert.target_node,
                    alert.victim_ip,
                    alert.claimed_mac,
                    alert.legitimate_mac,
                    alert.description,
                    alert.packet_id,
                    alert.threat_score_impact,
                    alert.mitigation_suggested,
                    1 if alert.mitigated else 0
                ))
                conn.commit()
        except Exception as e:
            print(f"[DB] Error saving alert: {e}")

    def get_recent_packets(self, limit: int = 100) -> List[Dict[str, Any]]:
        # Fast retrieval from memory buffer
        return [p.model_dump() for p in list(self.packet_buffer)[:limit]]

    def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        # Fast retrieval from memory buffer
        return [a.model_dump() for a in list(self.alert_buffer)[:limit]]

    def clear_all(self):
        self.packet_buffer.clear()
        self.alert_buffer.clear()
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM packets")
                cursor.execute("DELETE FROM alerts")
                conn.commit()
        except Exception as e:
            print(f"[DB] Error clearing data: {e}")

db = DatabaseManager()

