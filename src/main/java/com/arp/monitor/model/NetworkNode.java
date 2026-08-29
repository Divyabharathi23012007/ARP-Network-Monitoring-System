package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.Map;

public class NetworkNode {
    private String id;
    private String name;
    private NodeRole role;
    private String ip;
    private String mac;
    private String os = "Linux";
    private NodeStatus status = NodeStatus.HEALTHY;
    
    @JsonProperty("arp_cache")
    private Map<String, ARPCacheEntry> arpCache = new HashMap<>();
    
    @JsonProperty("packets_sent")
    private int packetsSent = 0;
    
    @JsonProperty("packets_received")
    private int packetsReceived = 0;
    
    @JsonProperty("alerts_count")
    private int alertsCount = 0;
    
    @JsonProperty("is_isolated")
    private boolean isIsolated = false;
    
    private Double x;
    private Double y;

    public NetworkNode() {}

    public NetworkNode(String id, String name, NodeRole role, String ip, String mac, String os, NodeStatus status, Double x, Double y) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.ip = ip;
        this.mac = mac;
        this.os = os;
        this.status = status;
        this.x = x;
        this.y = y;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public NodeRole getRole() { return role; }
    public void setRole(NodeRole role) { this.role = role; }

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }

    public String getMac() { return mac; }
    public void setMac(String mac) { this.mac = mac; }

    public String getOs() { return os; }
    public void setOs(String os) { this.os = os; }

    public NodeStatus getStatus() { return status; }
    public void setStatus(NodeStatus status) { this.status = status; }

    public Map<String, ARPCacheEntry> getArpCache() { return arpCache; }
    public void setArpCache(Map<String, ARPCacheEntry> arpCache) { this.arpCache = arpCache; }

    public int getPacketsSent() { return packetsSent; }
    public void setPacketsSent(int packetsSent) { this.packetsSent = packetsSent; }

    public int getPacketsReceived() { return packetsReceived; }
    public void setPacketsReceived(int packetsReceived) { this.packetsReceived = packetsReceived; }

    public int getAlertsCount() { return alertsCount; }
    public void setAlertsCount(int alertsCount) { this.alertsCount = alertsCount; }

    public boolean isIsolated() { return isIsolated; }
    public void setIsIsolated(boolean isolated) { isIsolated = isolated; }

    public Double getX() { return x; }
    public void setX(Double x) { this.x = x; }

    public Double getY() { return y; }
    public void setY(Double y) { this.y = y; }
}

