import os
import asyncio
import json
import time
from typing import List, Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    ARPPacket, AttackConfig, CustomPacketRequest, ThreatMetrics
)
from backend.simulation.engine import SimulationEngine
from backend.simulation.attacks import AttackSimulator
from backend.sniffer.live_sniffer import LiveARPSniffer
from backend.database import db

# Global instances
simulation_engine = SimulationEngine()
attack_simulator = AttackSimulator(simulation_engine)
live_sniffer: LiveARPSniffer = None

# Connected WebSocket clients
active_websockets: Set[WebSocket] = set()

# Background event loop task for traffic generation and broadcast
background_task: asyncio.Task = None

async def broadcast_ws(message: dict):
    """Sends JSON message to all active WebSocket clients."""
    if not active_websockets:
        return
    dead_sockets = set()
    message_str = json.dumps(message)
    for ws in list(active_websockets):
        try:
            await ws.send_text(message_str)
        except Exception:
            dead_sockets.add(ws)
    active_websockets.difference_update(dead_sockets)

async def simulation_loop():
    """Continuous background loop for background traffic and real-time state sync."""
    while True:
        try:
            # 1. Step background traffic if enabled
            pkt = simulation_engine.step_background_traffic()
            if pkt:
                # Notify clients of new packet
                await broadcast_ws({
                    "type": "PACKET_STREAM",
                    "packet": pkt.model_dump(),
                    "threat_metrics": simulation_engine.detector.get_threat_metrics(
                        total_pkts=simulation_engine.total_packets_count,
                        req_cnt=simulation_engine.requests_count,
                        rep_cnt=simulation_engine.replies_count,
                        garp_cnt=simulation_engine.garp_count,
                        mitigations=simulation_engine.mitigation.mitigations_count,
                        active_atks=simulation_engine.active_attacks,
                        auto_defense=simulation_engine.mitigation.auto_defense,
                        mode="simulation"
                    ).model_dump()
                })

            # 2. Periodic state broadcast (every 1 second)
            topo_data = simulation_engine.get_topology_data()
            await broadcast_ws({
                "type": "TOPOLOGY_UPDATE",
                "data": topo_data
            })

            await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Loop] Error: {e}")
            await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global background_task
    background_task = asyncio.create_task(simulation_loop())
    yield
    # Shutdown
    if background_task:
        background_task.cancel()
    if live_sniffer and live_sniffer.is_running:
        live_sniffer.stop()

app = FastAPI(
    title="ARP Network Monitoring & Anomaly Detection System",
    description="Cybersecurity SOC for detecting abnormal changes in ARP mappings",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.get("/api/topology")
async def get_topology():
    return simulation_engine.get_topology_data()

@app.get("/api/packets")
async def get_packets(limit: int = 100):
    return db.get_recent_packets(limit=limit)

@app.get("/api/alerts")
async def get_alerts(limit: int = 50):
    return db.get_recent_alerts(limit=limit)

@app.post("/api/attack/launch")
async def launch_attack(config: AttackConfig):
    generated_packets: List[ARPPacket] = []
    
    if config.attack_type == "mitm":
        generated_packets = attack_simulator.launch_mitm_attack(
            victim_ip=config.victim_ip or "192.168.1.101",
            gateway_ip=config.target_ip or "192.168.1.1",
            attacker_mac=config.spoofed_mac or "AA:BB:CC:DD:EE:66"
        )
    elif config.attack_type == "gateway_hijack":
        generated_packets = attack_simulator.launch_gateway_hijack(
            gateway_ip=config.target_ip or "192.168.1.1",
            attacker_mac=config.spoofed_mac or "AA:BB:CC:DD:EE:66"
        )
    elif config.attack_type == "garp_storm":
        generated_packets = attack_simulator.launch_garp_storm(
            count=config.count or 12,
            attacker_mac=config.spoofed_mac or "AA:BB:CC:DD:EE:66"
        )
    elif config.attack_type == "flip_flop":
        generated_packets = attack_simulator.launch_flip_flop(
            target_ip=config.target_ip or "192.168.1.1",
            attacker_mac=config.spoofed_mac or "AA:BB:CC:DD:EE:66"
        )
    elif config.attack_type == "bogon":
        generated_packets = attack_simulator.launch_bogon_attack()
    else:
        raise HTTPException(status_code=400, detail="Invalid attack type")

    # Ingest and broadcast all generated attack frames
    all_alerts = []
    for pkt in generated_packets:
        processed_pkt, alerts = simulation_engine.process_packet(pkt)
        all_alerts.extend(alerts)
        await broadcast_ws({
            "type": "PACKET_STREAM",
            "packet": processed_pkt.model_dump(),
            "alerts": [a.model_dump() for a in alerts]
        })

    # Broadcast updated topology and state
    topo_data = simulation_engine.get_topology_data()
    await broadcast_ws({
        "type": "TOPOLOGY_UPDATE",
        "data": topo_data,
        "new_alerts": [a.model_dump() for a in all_alerts]
    })

    return {
        "status": "success",
        "attack_type": config.attack_type,
        "packets_sent": len(generated_packets),
        "alerts_generated": len(all_alerts)
    }

@app.post("/api/attack/custom")
async def send_custom_packet(req: CustomPacketRequest):
    pkt = attack_simulator.craft_custom_packet(
        opcode=req.opcode,
        sender_mac=req.sender_mac,
        sender_ip=req.sender_ip,
        target_mac=req.target_mac,
        target_ip=req.target_ip
    )
    processed_pkt, alerts = simulation_engine.process_packet(pkt)
    
    await broadcast_ws({
        "type": "PACKET_STREAM",
        "packet": processed_pkt.model_dump(),
        "alerts": [a.model_dump() for a in alerts]
    })

    topo_data = simulation_engine.get_topology_data()
    await broadcast_ws({"type": "TOPOLOGY_UPDATE", "data": topo_data})

    return {
        "status": "success",
        "packet": processed_pkt.model_dump(),
        "alerts": [a.model_dump() for a in alerts]
    }

@app.post("/api/mitigation/auto-defense")
async def toggle_auto_defense(payload: dict):
    enabled = payload.get("enabled", False)
    simulation_engine.mitigation.toggle_auto_defense(enabled)
    return {"auto_defense": simulation_engine.mitigation.auto_defense}

@app.post("/api/mitigation/heal")
async def manual_heal():
    """Triggers immediate authoritative Gratuitous ARP healing across the network."""
    healing_pkts = simulation_engine.mitigation.generate_healing_packets()
    for hpkt in healing_pkts:
        simulation_engine.process_packet(hpkt)
        await broadcast_ws({
            "type": "PACKET_STREAM",
            "packet": hpkt.model_dump()
        })

    topo_data = simulation_engine.get_topology_data()
    await broadcast_ws({"type": "TOPOLOGY_UPDATE", "data": topo_data})

    return {
        "status": "success",
        "healing_packets_sent": len(healing_pkts),
        "message": "Authoritative Gratuitous ARP healing broadcast complete. All poisoned caches restored."
    }

@app.post("/api/mitigation/isolate")
async def isolate_node(payload: dict):
    mac = payload.get("mac", "AA:BB:CC:DD:EE:66")
    result = simulation_engine.mitigation.isolate_mac(mac)
    
    # Update topology
    topo_data = simulation_engine.get_topology_data()
    await broadcast_ws({"type": "TOPOLOGY_UPDATE", "data": topo_data})
    
    return {"status": "success", "isolation": result}

@app.post("/api/mitigation/unisolate")
async def unisolate_node(payload: dict):
    mac = payload.get("mac", "AA:BB:CC:DD:EE:66")
    result = simulation_engine.mitigation.un机isolate_mac(mac)
    
    topo_data = simulation_engine.get_topology_data()
    await broadcast_ws({"type": "TOPOLOGY_UPDATE", "data": topo_data})
    
    return {"status": "success", "restoration": result}

@app.get("/api/mitigation/scripts")
async def get_defense_scripts():
    return simulation_engine.mitigation.generate_defense_scripts()

@app.post("/api/simulation/reset")
async def reset_sim():
    simulation_engine.reset_simulation()
    topo_data = simulation_engine.get_topology_data()
    await broadcast_ws({"type": "RESET", "data": topo_data})
    return {"status": "success", "message": "Simulation environment reset to clean baseline state"}

@app.post("/api/simulation/settings")
async def update_settings(payload: dict):
    if "background_traffic" in payload:
        simulation_engine.background_traffic_enabled = bool(payload["background_traffic"])
    if "speed" in payload:
        simulation_engine.simulation_speed = float(payload["speed"])
    return {
        "background_traffic": simulation_engine.background_traffic_enabled,
        "speed": simulation_engine.simulation_speed
    }

@app.get("/api/export/summary")
async def export_forensic_summary():
    """Generates complete forensic session data for reporting and PDF export."""
    now = time.time()
    packets = db.get_recent_packets(limit=500)
    alerts = db.get_recent_alerts(limit=200)
    topo = simulation_engine.get_topology_data()

    anomalous_pkts = [p for p in packets if p.get("is_anomalous")]
    
    # Attack breakdown
    attack_counts = {}
    for a in alerts:
        atk = a.get("attack_type", "Unknown")
        attack_counts[atk] = attack_counts.get(atk, 0) + 1

    return {
        "project_title": "ARP Network Monitoring System – Detect abnormal changes in simulated ARP mappings",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "metrics": topo["metrics"],
        "total_packets_recorded": len(packets),
        "total_anomalies_recorded": len(anomalous_pkts),
        "total_alerts_recorded": len(alerts),
        "attack_breakdown": attack_counts,
        "nodes": topo["nodes"],
        "recent_alerts": alerts[:25],
        "isolated_macs": topo["isolated_macs"]
    }

# WebSocket Endpoint
@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    try:
        # Send initial topology and state on connect
        topo_data = simulation_engine.get_topology_data()
        await websocket.send_text(json.dumps({
            "type": "INITIAL_STATE",
            "data": topo_data,
            "recent_packets": db.get_recent_packets(30),
            "recent_alerts": db.get_recent_alerts(20)
        }))
        while True:
            # Keep socket alive and handle any incoming client messages
            data = await websocket.receive_text()
            # Optional ping-pong handling
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)

# Serve Frontend Static Files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
async def serve_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not yet initialized. Please check frontend/index.html"}

