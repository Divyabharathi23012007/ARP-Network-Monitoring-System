package com.arp.monitor.simulation;

import com.arp.monitor.model.ARPPacket;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.util.*;

@Component
public class AttackSimulator {
    private final SimulationEngine engine;

    @Autowired
    public AttackSimulator(SimulationEngine engine) {
        this.engine = engine;
    }

    public List<ARPPacket> launchMitmAttack(String victimIp, String gatewayIp, String attackerMac) {
        if (victimIp == null) victimIp = "192.168.1.101";
        if (gatewayIp == null) gatewayIp = "192.168.1.1";
        if (attackerMac == null) attackerMac = "AA:BB:CC:DD:EE:66";

        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");
        String timeStr = sdf.format(new Date());

        List<ARPPacket> packets = new ArrayList<>();

        // Frame 1: To Victim -> "Gateway IP is at Attacker MAC"
        String victimMac = engine.getDetector().getBaselineBindings().getOrDefault(victimIp, "00:1A:2B:3C:4D:A1");
        ARPPacket p1 = new ARPPacket(
            "ATK-MITM-V-" + (long)(now * 1000 % 1000000),
            2,
            "REPLY (POISON)",
            attackerMac,
            gatewayIp,
            victimMac,
            victimIp,
            false
        );
        p1.setTimeStr(timeStr);
        p1.setRawHex(victimMac.replace(":", " ") + " " + attackerMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
        packets.add(p1);

        // Frame 2: To Gateway -> "Victim IP is at Attacker MAC"
        String gwMac = engine.getDetector().getBaselineBindings().getOrDefault(gatewayIp, "00:1A:2B:3C:4D:01");
        ARPPacket p2 = new ARPPacket(
            "ATK-MITM-GW-" + (long)(now * 1000 % 1000000),
            2,
            "REPLY (POISON)",
            attackerMac,
            victimIp,
            gwMac,
            gatewayIp,
            false
        );
        p2.setTimeStr(timeStr);
        p2.setRawHex(gwMac.replace(":", " ") + " " + attackerMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
        packets.add(p2);

        return packets;
    }

    public List<ARPPacket> launchGatewayHijack(String gatewayIp, String attackerMac) {
        if (gatewayIp == null) gatewayIp = "192.168.1.1";
        if (attackerMac == null) attackerMac = "AA:BB:CC:DD:EE:66";

        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");
        String timeStr = sdf.format(new Date());

        ARPPacket p = new ARPPacket(
            "ATK-GW-HIJACK-" + (long)(now * 1000 % 1000000),
            2,
            "GARP (HIJACK)",
            attackerMac,
            gatewayIp,
            "FF:FF:FF:FF:FF:FF",
            gatewayIp,
            true
        );
        p.setTimeStr(timeStr);
        p.setRawHex("FF FF FF FF FF FF " + attackerMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
        return Collections.singletonList(p);
    }

    public List<ARPPacket> launchGarpStorm(int count, String attackerMac) {
        if (attackerMac == null) attackerMac = "AA:BB:CC:DD:EE:66";
        List<ARPPacket> packets = new ArrayList<>();
        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");
        Random rand = new Random();

        for (int i = 0; i < count; i++) {
            String targetIp = "192.168.1." + (rand.nextInt(254) + 1);
            ARPPacket p = new ARPPacket(
                "ATK-STORM-" + (long)(now * 1000 % 1000000) + "-" + (i + 1),
                2,
                "GARP (STORM)",
                attackerMac,
                targetIp,
                "FF:FF:FF:FF:FF:FF",
                targetIp,
                true
            );
            p.setTimeStr(sdf.format(new Date()));
            p.setRawHex("FF FF FF FF FF FF " + attackerMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
            packets.add(p);
        }
        return packets;
    }

    public List<ARPPacket> launchFlipFlop(String targetIp, String attackerMac) {
        if (targetIp == null) targetIp = "192.168.1.1";
        if (attackerMac == null) attackerMac = "AA:BB:CC:DD:EE:66";

        String legitMac = engine.getDetector().getBaselineBindings().getOrDefault(targetIp, "00:1A:2B:3C:4D:01");
        List<ARPPacket> packets = new ArrayList<>();
        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");

        for (int i = 0; i < 4; i++) {
            String macToUse = (i % 2 == 0) ? attackerMac : legitMac;
            boolean isMal = macToUse.equals(attackerMac);

            ARPPacket p = new ARPPacket(
                "ATK-FLIP-" + (long)(now * 1000 % 1000000) + "-" + (i + 1),
                2,
                isMal ? "REPLY (FLAP)" : "REPLY (LEGIT)",
                macToUse,
                targetIp,
                "FF:FF:FF:FF:FF:FF",
                targetIp,
                true
            );
            p.setTimeStr(sdf.format(new Date()));
            p.setRawHex("FF FF FF FF FF FF " + macToUse.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 02");
            packets.add(p);
        }
        return packets;
    }

    public List<ARPPacket> launchBogonAttack() {
        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");

        ARPPacket p = new ARPPacket(
            "ATK-BOGON-" + (long)(now * 1000 % 1000000),
            2,
            "REPLY (BOGON)",
            "00:00:00:00:00:00",
            "192.168.1.1",
            "FF:FF:FF:FF:FF:FF",
            "192.168.1.1",
            true
        );
        p.setTimeStr(sdf.format(new Date()));
        p.setRawHex("FF FF FF FF FF FF 00 00 00 00 00 00 08 06 00 01 08 00 06 04 00 02");
        return Collections.singletonList(p);
    }

    public ARPPacket craftCustomPacket(int opcode, String senderMac, String senderIp, String targetMac, String targetIp) {
        double now = System.currentTimeMillis() / 1000.0;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss.SSS");
        boolean isGarp = senderIp.equals(targetIp) && ("FF:FF:FF:FF:FF:FF".equalsIgnoreCase(targetMac) || opcode == 2);
        String opcodeName = (opcode == 1) ? "REQUEST" : (isGarp ? "GARP" : "REPLY");

        ARPPacket p = new ARPPacket(
            "PKT-CUSTOM-" + (long)(now * 1000 % 1000000),
            opcode,
            opcodeName,
            senderMac,
            senderIp,
            targetMac,
            targetIp,
            isGarp
        );
        p.setTimeStr(sdf.format(new Date()));
        p.setRawHex(targetMac.replace(":", " ") + " " + senderMac.replace(":", " ") + " 08 06 00 01 08 00 06 04 00 0" + opcode);
        return p;
    }
}

