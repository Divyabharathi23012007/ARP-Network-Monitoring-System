package com.arp.monitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class ARPPacket {
    private String id;
    private double timestamp;
    
    @JsonProperty("time_str")
    private String timeStr = "";
    
    @JsonProperty("hw_type")
    private int hwType = 1; // Ethernet (10Mb)
    
    @JsonProperty("proto_type")
    private String protoType = "0x0800"; // IPv4
    
    @JsonProperty("hw_size")
    private int hwSize = 6;
    
    @JsonProperty("proto_size")
    private int protoSize = 4;
    
    private int opcode = 1; // 1=Request, 2=Reply
    
    @JsonProperty("opcode_name")
    private String opcodeName = "REQUEST";
    
    @JsonProperty("sender_mac")
    private String senderMac;
    
    @JsonProperty("sender_ip")
    private String senderIp;
    
    @JsonProperty("target_mac")
    private String targetMac;
    
    @JsonProperty("target_ip")
    private String targetIp;
    
    @JsonProperty("is_gratuitous")
    private boolean isGratuitous = false;
    
    @JsonProperty("is_anomalous")
    private boolean isAnomalous = false;
    
    @JsonProperty("anomaly_reasons")
    private List<String> anomalyReasons = new ArrayList<>();
    
    @JsonProperty("raw_hex")
    private String rawHex = "";

    public ARPPacket() {
        this.timestamp = System.currentTimeMillis() / 1000.0;
    }

    public ARPPacket(String id, int opcode, String opcodeName, String senderMac, String senderIp, String targetMac, String targetIp, boolean isGratuitous) {
        this.id = id;
        this.timestamp = System.currentTimeMillis() / 1000.0;
        this.opcode = opcode;
        this.opcodeName = opcodeName;
        this.senderMac = senderMac;
        this.senderIp = senderIp;
        this.targetMac = targetMac;
        this.targetIp = targetIp;
        this.isGratuitous = isGratuitous;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public double getTimestamp() { return timestamp; }
    public void setTimestamp(double timestamp) { this.timestamp = timestamp; }

    public String getTimeStr() { return timeStr; }
    public void setTimeStr(String timeStr) { this.timeStr = timeStr; }

    public int getHwType() { return hwType; }
    public void setHwType(int hwType) { this.hwType = hwType; }

    public String getProtoType() { return protoType; }
    public void setProtoType(String protoType) { this.protoType = protoType; }

    public int getHwSize() { return hwSize; }
    public void setHwSize(int hwSize) { this.hwSize = hwSize; }

    public int getProtoSize() { return protoSize; }
    public void setProtoSize(int protoSize) { this.protoSize = protoSize; }

    public int getOpcode() { return opcode; }
    public void setOpcode(int opcode) { this.opcode = opcode; }

    public String getOpcodeName() { return opcodeName; }
    public void setOpcodeName(String opcodeName) { this.opcodeName = opcodeName; }

    public String getSenderMac() { return senderMac; }
    public void setSenderMac(String senderMac) { this.senderMac = senderMac; }

    public String getSenderIp() { return senderIp; }
    public void setSenderIp(String senderIp) { this.senderIp = senderIp; }

    public String getTargetMac() { return targetMac; }
    public void setTargetMac(String targetMac) { this.targetMac = targetMac; }

    public String getTargetIp() { return targetIp; }
    public void setTargetIp(String targetIp) { this.targetIp = targetIp; }

    public boolean isGratuitous() { return isGratuitous; }
    public void setGratuitous(boolean gratuitous) { isGratuitous = gratuitous; }

    public boolean isAnomalous() { return isAnomalous; }
    public void setAnomalous(boolean anomalous) { isAnomalous = anomalous; }

    public List<String> getAnomalyReasons() { return anomalyReasons; }
    public void setAnomalyReasons(List<String> anomalyReasons) { this.anomalyReasons = anomalyReasons; }

    public String getRawHex() { return rawHex; }
    public void setRawHex(String rawHex) { this.rawHex = rawHex; }
}

