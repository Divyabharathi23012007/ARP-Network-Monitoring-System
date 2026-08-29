package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CustomPacketRequest {
    private int opcode = 2;
    
    @JsonProperty("sender_mac")
    private String senderMac;
    
    @JsonProperty("sender_ip")
    private String senderIp;
    
    @JsonProperty("target_mac")
    private String targetMac;
    
    @JsonProperty("target_ip")
    private String targetIp;
    
    private int count = 1;

    public CustomPacketRequest() {}

    public int getOpcode() { return opcode; }
    public void setOpcode(int opcode) { this.opcode = opcode; }

    public String getSenderMac() { return senderMac; }
    public void setSenderMac(String senderMac) { this.senderMac = senderMac; }

    public String getSenderIp() { return senderIp; }
    public void setSenderIp(String senderIp) { this.senderIp = senderIp; }

    public String getTargetMac() { return targetMac; }
    public void setTargetMac(String targetMac) { this.targetMac = targetMac; }

    public String getTargetIp() { return targetIp; }
    public void setTargetIp(String targetIp) { this.targetIp = targetIp; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
}

