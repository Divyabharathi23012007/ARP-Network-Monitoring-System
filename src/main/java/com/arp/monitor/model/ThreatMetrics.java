package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class ThreatMetrics {
    @JsonProperty("current_threat_score")
    private int currentThreatScore = 0;
    
    @JsonProperty("threat_level")
    private String threatLevel = "NORMAL";
    
    @JsonProperty("total_packets")
    private int totalPackets = 0;
    
    @JsonProperty("arp_requests")
    private int arpRequests = 0;
    
    @JsonProperty("arp_replies")
    private int arpReplies = 0;
    
    @JsonProperty("gratuitous_arp")
    private int gratuitousArp = 0;
    
    @JsonProperty("anomalies_detected")
    private int anomaliesDetected = 0;
    
    @JsonProperty("mitigations_applied")
    private int mitigationsApplied = 0;
    
    @JsonProperty("active_attacks")
    private List<String> activeAttacks = new ArrayList<>();
    
    @JsonProperty("auto_defense_enabled")
    private boolean autoDefenseEnabled = false;
    
    private String mode = "simulation";

    public ThreatMetrics() {}

    // Getters and Setters
    public int getCurrentThreatScore() { return currentThreatScore; }
    public void setCurrentThreatScore(int currentThreatScore) { this.currentThreatScore = currentThreatScore; }

    public String getThreatLevel() { return threatLevel; }
    public void setThreatLevel(String threatLevel) { this.threatLevel = threatLevel; }

    public int getTotalPackets() { return totalPackets; }
    public void setTotalPackets(int totalPackets) { this.totalPackets = totalPackets; }

    public int getArpRequests() { return arpRequests; }
    public void setArpRequests(int arpRequests) { this.arpRequests = arpRequests; }

    public int getArpReplies() { return arpReplies; }
    public void setArpReplies(int arpReplies) { this.arpReplies = arpReplies; }

    public int getGratuitousArp() { return gratuitousArp; }
    public void setGratuitousArp(int gratuitousArp) { this.gratuitousArp = gratuitousArp; }

    public int getAnomaliesDetected() { return anomaliesDetected; }
    public void setAnomaliesDetected(int anomaliesDetected) { this.anomaliesDetected = anomaliesDetected; }

    public int getMitigationsApplied() { return mitigationsApplied; }
    public void setMitigationsApplied(int mitigationsApplied) { this.mitigationsApplied = mitigationsApplied; }

    public List<String> getActiveAttacks() { return activeAttacks; }
    public void setActiveAttacks(List<String> activeAttacks) { this.activeAttacks = activeAttacks; }

    public boolean isAutoDefenseEnabled() { return autoDefenseEnabled; }
    public void setAutoDefenseEnabled(boolean autoDefenseEnabled) { this.autoDefenseEnabled = autoDefenseEnabled; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
}

