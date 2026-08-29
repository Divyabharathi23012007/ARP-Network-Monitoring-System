package com.arp.monitor.controller;

import com.arp.monitor.model.ARPPacket;
import com.arp.monitor.model.Alert;
import com.arp.monitor.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PacketController {
    private final DatabaseService db;

    @Autowired
    public PacketController(DatabaseService db) {
        this.db = db;
    }

    @GetMapping("/packets")
    public List<ARPPacket> getPackets(@RequestParam(defaultValue = "100") int limit) {
        return db.getRecentPackets(limit);
    }

    @GetMapping("/alerts")
    public List<Alert> getAlerts(@RequestParam(defaultValue = "50") int limit) {
        return db.getRecentAlerts(limit);
    }
}

