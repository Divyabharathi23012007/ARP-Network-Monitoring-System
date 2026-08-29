package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Alert {
    private String id;
    private double timestamp;
    
    @JsonProperty("time_str")
    private String timeStr = "";
    
    private AlertSeverity severity;
    
    @JsonProperty("attack_type")
    private String attackType;
    
    @JsonProperty("source_node")
    private String sourceNode;
    
    @JsonProperty("target_node")
    private String targetNode;
    
    @JsonProperty("victim_ip")
    private String victimIp;
    
    @JsonProperty("claimed_mac")
    private String claimedMac;
    
    @JsonProperty("legitimate_mac")
    private String legitimateMac;
    
    private String description;
    
    @JsonProperty("packet_id")
    private String packetId;
    
    @JsonProperty("threat_score_impact")
    private int threatScoreImpact = 10;
    
    @JsonProperty("mitigation_suggested")
    private String mitigationSuggested = "";
    
    private boolean mitigated = false;

    public Alert() {
        this.timestamp = System.currentTimeMillis() / 1000.0;
    }

    public Alert(String id, AlertSeverity severity, String attackType, String sourceNode, String targetNode, String victimIp, String claimedMac, String legitimateMac, String description, int threatScoreImpact, String mitigationSuggested) {
        this.id = id;
        this.timestamp = System.currentTimeMillis() / 1000.0;
        this.severity = severity;
        this.attackType = attackType;
        this.sourceNode = sourceNode;
        this.targetNode = targetNode;
        this.victimIp = victimIp;
        this.claimedMac = claimedMac;
        this.legitimateMac = legitimateMac;
        this.description = description;
        this.threatScoreImpact = threatScoreImpact;
        this.mitigationSuggested = mitigationSuggested;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public double getTimestamp() { return timestamp; }
    public void setTimestamp(double timestamp) { this.timestamp = timestamp; }

    public String getTimeStr() { return timeStr; }
    public void setTimeStr(String timeStr) { this.timeStr = timeStr; }

    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }

    public String getAttackType() { return attackType; }
    public void setAttackType(String attackType) { this.attackType = attackType; }

    public String getSourceNode() { return sourceNode; }
    public void setSourceNode(String sourceNode) { this.sourceNode = sourceNode; }

    public String getTargetNode() { return targetNode; }
    public void setTargetNode(String targetNode) { this.targetNode = targetNode; }

    public String getVictimIp() { return victimIp; }
    public void setVictimIp(String victimIp) { this.victimIp = victimIp; }

    public String getClaimedMac() { return claimedMac; }
    public void setClaimedMac(String claimedMac) { this.claimedMac = claimedMac; }

    public String getLegitimateMac() { return legitimateMac; }
    public void setLegitimateMac(String legitimateMac) { this.legitimateMac = legitimateMac; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPacketId() { return packetId; }
    public void setPacketId(String packetId) { this.packetId = packetId; }

    public int getThreatScoreImpact() { return threatScoreImpact; }
    public void setThreatScoreImpact(int threatScoreImpact) { this.threatScoreImpact = threatScoreImpact; }

    public String getMitigationSuggested() { return mitigationSuggested; }
    public void setMitigationSuggested(String mitigationSuggested) { this.mitigationSuggested = mitigationSuggested; }

    public boolean isMitigated() { return mitigated; }
    public void setMitigated(boolean mitigated) { this.mitigated = mitigated; }
}

