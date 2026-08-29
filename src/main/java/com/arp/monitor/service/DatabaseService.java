package com.arp.monitor.service;

import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.model.Alert;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class DatabaseService {
    private final Deque<ARPPacket> packetBuffer = new ConcurrentLinkedDeque<>();
    private final Deque<Alert> alertBuffer = new ConcurrentLinkedDeque<>();
    private final int MAX_PACKETS = 500;
    private final int MAX_ALERTS = 200;

    public void savePacket(ARPPacket packet) {
        packetBuffer.addFirst(packet);
        while (packetBuffer.size() > MAX_PACKETS) {
            packetBuffer.removeLast();
        }
    }

    public void saveAlert(Alert alert) {
        alertBuffer.addFirst(alert);
        while (alertBuffer.size() > MAX_ALERTS) {
            alertBuffer.removeLast();
        }
    }

    public List<ARPPacket> getRecentPackets(int limit) {
        List<ARPPacket> list = new ArrayList<>();
        int count = 0;
        for (ARPPacket p : packetBuffer) {
            if (count++ >= limit) break;
            list.add(p);
        }
        return list;
    }

    public List<Alert> getRecentAlerts(int limit) {
        List<Alert> list = new ArrayList<>();
        int count = 0;
        for (Alert a : alertBuffer) {
            if (count++ >= limit) break;
            list.add(a);
        }
        return list;
    }

    public void clearAll() {
        packetBuffer.clear();
        alertBuffer.clear();
    }
}

