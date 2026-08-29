package com.arp.monitor.mitigation;

import com.arp.monitor.detector.ARPDetector;
import com.arp.monitor.model.ARPPacket;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class MitigationEngine {
    private final ARPDetector detector;
    private boolean autoDefense = false;
    private final Set<String> isolatedMacs = ConcurrentHashMap.newKeySet();
    private int mitigationsCount = 0;

    @Autowired
    public MitigationEngine(ARPDetector detector) {
        this.detector = detector;
    }

    public boolean toggleAutoDefense(boolean enabled) {
        this.autoDefense = enabled;
        return this.autoDefense;
    }

    public boolean isAutoDefense() { return autoDefense; }

    public Map<String, Object> isolateMac(String mac) {
        String cleanMac = mac.toUpperCase();
        isolatedMacs.add(cleanMac);
        mitigationsCount++;

        Map<String, Object> record = new HashMap<>();
        record.put("timestamp", System.currentTimeMillis() / 1000.0);
        record.put("time_str", new SimpleDateFormat("HH:mm:ss").format(new Date()));
        record.put("action", "PORT_ISOLATION");
        record.put("target", cleanMac);
        record.put("details", "Layer-2 Switch port shutdown for rogue MAC " + cleanMac + ". All frames blocked.");
        return record;
    }

    public Map<String, Object> unisolateMac(String mac) {
        String cleanMac = mac.toUpperCase();
        isolatedMacs.remove(cleanMac);
        Map<String, Object> record = new HashMap<>();
        record.put("action", "UNISOLATE");
        record.put("target", cleanMac);
        record.put("status", "restored");
        return record;
    }

    public List<ARPPacket> generateHealingPackets(List<String> targetIps) {
        if (targetIps == null || targetIps.isEmpty()) {
            targetIps = new ArrayList<>(detector.getBaselineBindings().keySet());
        }

        List<ARPPacket> healingPackets = new ArrayList<>();
        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");
        String timeStr = sdf.format(new Date());

        for (String ip : targetIps) {
            if (detector.getBaselineBindings().containsKey(ip)) {
                String legitMac = detector.getBaselineBindings().get(ip);
                String pktId = "HEAL-" + (long)(now * 1000 % 1000000) + "-" + ip.substring(ip.lastIndexOf('.') + 1);

                ARPPacket healPkt = new ARPPacket(
                    pktId,
                    2,
                    "GARP (HEAL)",
                    legitMac,
                    ip,
                    "FF:FF:FF:FF:FF:FF",
                    ip,
                    true
                );
                healPkt.setTimeStr(timeStr);
                healPkt.setRawHex("FF FF FF FF FF FF " + legitMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
                healPkt.getAnomalyReasons().add("[DEFENSE] Authoritative Gratuitous ARP Poison-Healer frame");
                healingPackets.add(healPkt);
            }
        }
        mitigationsCount += healingPackets.size();
        return healingPackets;
    }

    public Map<String, String> generateDefenseScripts() {
        Map<String, String> bindings = detector.getBaselineBindings();
        
        // Windows Script
        StringBuilder win = new StringBuilder();
        win.append("@echo off\n:: Static ARP Configuration for Windows\n:: Run in Administrator Command Prompt\n\n");
        for (Map.Entry<String, String> entry : bindings.entrySet()) {
            win.append("netsh interface ipv4 add neighbors \"Ethernet\" ").append(entry.getKey()).append(" ").append(entry.getValue()).append("\n");
        }
        win.append("echo Static ARP entries configured.\narp -a\n");

        // Linux Script
        StringBuilder linux = new StringBuilder();
        linux.append("#!/bin/bash\n# Static ARP Configuration for Linux\n# Run with sudo\n\n");
        for (Map.Entry<String, String> entry : bindings.entrySet()) {
            linux.append("ip neigh replace ").append(entry.getKey()).append(" lladdr ").append(entry.getValue()).append(" dev eth0 nud permanent\n");
        }
        linux.append("echo '[+] Verification: current ARP cache:'\nip neigh show\n");

        // Cisco IOS Script
        StringBuilder cisco = new StringBuilder();
        cisco.append("! Cisco IOS Dynamic ARP Inspection (DAI) & DHCP Snooping Config\n");
        cisco.append("configure terminal\nip dhcp snooping\nip dhcp snooping vlan 1\n");
        cisco.append("ip arp inspection vlan 1\nip arp inspection validate src-mac dst-mac ip\n!\n");
        cisco.append("arp access-list DAI-STATIC-BINDINGS\n");
        for (Map.Entry<String, String> entry : bindings.entrySet()) {
            cisco.append(" permit ip host ").append(entry.getKey()).append(" mac host ").append(entry.getValue().toLowerCase()).append("\n");
        }
        cisco.append("exit\nip arp inspection filter DAI-STATIC-BINDINGS vlan 1 static\n");
        cisco.append("interface FastEthernet0/1 - 24\n ip arp inspection limit rate 15\nend\nwrite memory\n");

        Map<String, String> scripts = new HashMap<>();
        scripts.put("windows", win.toString());
        scripts.put("linux", linux.toString());
        scripts.put("cisco", cisco.toString());
        return scripts;
    }

    public Set<String> getIsolatedMacs() { return isolatedMacs; }
    public int getMitigationsCount() { return mitigationsCount; }
}

