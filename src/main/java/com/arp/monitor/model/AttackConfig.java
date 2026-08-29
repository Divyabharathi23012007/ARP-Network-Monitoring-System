package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AttackConfig {
    @JsonProperty("attack_type")
    private String attackType;
    
    @JsonProperty("target_ip")
    private String targetIp = "192.168.1.1";
    
    @JsonProperty("victim_ip")
    private String victimIp = "192.168.1.101";
    
    @JsonProperty("spoofed_mac")
    private String spoofedMac = "AA:BB:CC:DD:EE:66";
    
    @JsonProperty("interval_ms")
    private int intervalMs = 500;
    
    private int count = 10;
    private boolean active = false;

    public AttackConfig() {}

    public String getAttackType() { return attackType; }
    public void setAttackType(String attackType) { this.attackType = attackType; }

    public String getTargetIp() { return targetIp; }
    public void setTargetIp(String targetIp) { this.targetIp = targetIp; }

    public String getVictimIp() { return victimIp; }
    public void setVictimIp(String victimIp) { this.victimIp = victimIp; }

    public String getSpoofedMac() { return spoofedMac; }
    public void setSpoofedMac(String spoofedMac) { this.spoofedMac = spoofedMac; }

    public int getIntervalMs() { return intervalMs; }
    public void setIntervalMs(int intervalMs) { this.intervalMs = intervalMs; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}

