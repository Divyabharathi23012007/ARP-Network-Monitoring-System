package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ARPCacheEntry {
    private String ip;
    private String mac;
    
    @JsonProperty("entry_type")
    private String entryType = "dynamic";
    
    private String state = "REACHABLE"; // REACHABLE / STALE / POISONED / CONFLICT
    private int ttl = 300;
    
    @JsonProperty("last_updated")
    private double lastUpdated;
    
    private List<Map<String, Object>> history = new ArrayList<>();
    
    @JsonProperty("is_poisoned")
    private boolean isPoisoned = false;
    
    @JsonProperty("legitimate_mac")
    private String legitimateMac;

    public ARPCacheEntry() {
        this.lastUpdated = System.currentTimeMillis() / 1000.0;
    }

    public ARPCacheEntry(String ip, String mac, String entryType, String state, int ttl, boolean isPoisoned, String legitimateMac) {
        this.ip = ip;
        this.mac = mac;
        this.entryType = entryType;
        this.state = state;
        this.ttl = ttl;
        this.lastUpdated = System.currentTimeMillis() / 1000.0;
        this.isPoisoned = isPoisoned;
        this.legitimateMac = legitimateMac;
        
        Map<String, Object> histEntry = new HashMap<>();
        histEntry.put("mac", mac);
        histEntry.put("timestamp", this.lastUpdated);
        histEntry.put("state", state);
        this.history.add(histEntry);
    }

    // Getters and Setters
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }

    public String getMac() { return mac; }
    public void setMac(String mac) { this.mac = mac; }

    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public int getTtl() { return ttl; }
    public void setTtl(int ttl) { this.ttl = ttl; }

    public double getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(double lastUpdated) { this.lastUpdated = lastUpdated; }

    public List<Map<String, Object>> getHistory() { return history; }
    public void setHistory(List<Map<String, Object>> history) { this.history = history; }

    public boolean isPoisoned() { return isPoisoned; }
    public void setPoisoned(boolean poisoned) { isPoisoned = poisoned; }

    public String getLegitimateMac() { return legitimateMac; }
    public void setLegitimateMac(String legitimateMac) { this.legitimateMac = legitimateMac; }
}

