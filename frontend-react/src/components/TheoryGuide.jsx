import React from 'react';
import { GraduationCap, HelpCircle } from 'lucide-react';

export default function TheoryGuide() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="cyber-card p-5 space-y-3">
        <h2 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <GraduationCap className="w-5 h-5 text-sky-600 dark:text-blue-400" />
          Computer Networks Mini Project Theory & RFC 826 Reference Guide
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-lg border space-y-2 bg-slate-50 border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
            <h3 className="font-bold text-sm text-sky-600 dark:text-cyan-400">1. Address Resolution Protocol (ARP - RFC 826)</h3>
            <p>
              ARP bridges the Network Layer (Layer 3 - IPv4) and Data Link Layer (Layer 2 - Ethernet). In an IPv4 Ethernet network, nodes communicate using MAC addresses. When Host A wants to transmit an IP packet to Host B on the same LAN, it broadcasts an <strong>ARP Request</strong>: <em>"Who has IP 192.168.1.102? Tell 192.168.1.101"</em>. Host B unicasts an <strong>ARP Reply</strong> with its MAC address.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border space-y-2 bg-slate-50 border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
            <h3 className="font-bold text-sm text-red-600 dark:text-red-400">2. The Fundamental Security Vulnerability (Stateless Trust)</h3>
            <p>
              ARP is completely stateless and lacks authentication. Operating systems accept unsolicited ARP replies without verifying if a request was ever sent, and overwrite their ARP cache unconditionally. An attacker can broadcast forged ARP replies to associate the Default Gateway's IP with the attacker's MAC address, executing a <strong>Man-In-The-Middle (MITM)</strong> attack.
            </p>
          </div>
        </div>

        {/* Detection Algorithms Summary */}
        <div className="p-4 rounded-lg border space-y-2 text-xs bg-slate-50 border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
          <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">3. Multi-Layer Anomaly Detection Algorithms Implemented</h3>
          <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
            <li>
              <strong>Dynamic ARP Inspection (DAI) Baseline Verification:</strong> Compares claimed IP-MAC pairs in every incoming frame against a trusted DHCP Snooping / Static binding table. Mismatches trigger immediate alerts.
            </li>
            <li>
              <strong>Critical Gateway Watchdog:</strong> Specialized high-priority monitoring for the Default Gateway and DNS servers. Immediate critical severity trigger if the Gateway MAC shifts.
            </li>
            <li>
              <strong>Sliding-Window Rate / Flood Detector:</strong> Tracks packet frequency in a rolling 2-second window. Bursts exceeding 18 pps or &gt;6 Gratuitous ARP pkts/sec trigger DoS storm alerts.
            </li>
            <li>
              <strong>Flip-Flop Churn Detector:</strong> Maintains a history queue of recent MAC transitions per IP. Oscillating transitions (e.g. A &rarr; B &rarr; A within 5s) flag race-condition poisoning.
            </li>
            <li>
              <strong>Malformed Frame & Bogon Checker:</strong> Identifies invalid sender MACs (00:00:00:00:00:00, FF:FF:FF:FF:FF:FF in unicast fields, or multicast addresses).
            </li>
          </ul>
        </div>

        {/* High-Yield Viva Voce Q&A */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> High-Yield Viva Voce Questions & Model Answers
          </h3>

          <details className="p-3 rounded-lg border cursor-pointer bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <summary className="font-bold text-xs text-slate-900 dark:text-slate-200">
              Q1: What is Gratuitous ARP (GARP) and how is it abused?
            </summary>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-amber-500">
              A Gratuitous ARP is an ARP Reply where the Sender IP equals the Target IP, sent as a broadcast. Legitimate uses include IP conflict detection and notifying the switch of a new NIC. Attackers abuse GARP to update the ARP caches of all hosts on the LAN in a single frame.
            </p>
          </details>

          <details className="p-3 rounded-lg border cursor-pointer bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <summary className="font-bold text-xs text-slate-900 dark:text-slate-200">
              Q2: How does Dynamic ARP Inspection (DAI) work on managed switches?
            </summary>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-amber-500">
              DAI validates ARP packets on untrusted switch ports against the DHCP Snooping database. If the sender IP and MAC in the ARP payload do not match the authorized DHCP lease, the switch drops the packet and logs the violation.
            </p>
          </details>

          <details className="p-3 rounded-lg border cursor-pointer bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <summary className="font-bold text-xs text-slate-900 dark:text-slate-200">
              Q3: Why doesn't IPv6 use ARP?
            </summary>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-amber-500">
              IPv6 replaces ARP with Neighbor Discovery Protocol (NDP) operating over ICMPv6. NDP uses multicast instead of broadcast, and supports Secure Neighbor Discovery (SEND - RFC 3971) with cryptographically generated addresses (CGA) to prevent spoofing.
            </p>
          </details>

          <details className="p-3 rounded-lg border cursor-pointer bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
            <summary className="font-bold text-xs text-slate-900 dark:text-slate-200">
              Q4: How does our application heal a poisoned ARP cache?
            </summary>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-amber-500">
              Upon detecting an anomaly, the mitigation engine broadcasts an authoritative Gratuitous ARP packet carrying the genuine baseline MAC address for the victim IP. When host operating systems receive this authoritative frame, they immediately overwrite the rogue entry in their ARP table.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
