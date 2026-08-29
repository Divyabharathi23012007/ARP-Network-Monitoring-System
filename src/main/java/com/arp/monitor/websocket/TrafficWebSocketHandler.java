package com.arp.monitor.websocket;

import com.arp.monitor.service.DatabaseService;
import com.arp.monitor.simulation.SimulationEngine;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class TrafficWebSocketHandler extends TextWebSocketHandler {
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ObjectMapper mapper = new ObjectMapper();
    private final SimulationEngine simulationEngine;
    private final DatabaseService db;

    @Autowired
    public TrafficWebSocketHandler(SimulationEngine simulationEngine, DatabaseService db) {
        this.simulationEngine = simulationEngine;
        this.db = db;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // Decorate session to ensure thread-safe concurrent message sending
        WebSocketSession concurrentSession = new ConcurrentWebSocketSessionDecorator(session, 10000, 65536);
        sessions.add(concurrentSession);

        try {
            // Send initial state to newly connected client
            Map<String, Object> initMessage = new HashMap<>();
            initMessage.put("type", "INITIAL_STATE");
            initMessage.put("data", simulationEngine.getTopologyData());
            initMessage.put("recent_packets", db.getRecentPackets(30));
            initMessage.put("recent_alerts", db.getRecentAlerts(20));

            String json = mapper.writeValueAsString(initMessage);
            concurrentSession.sendMessage(new TextMessage(json));
        } catch (Exception e) {
            sessions.remove(concurrentSession);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sessions.remove(session);
        try {
            if (session.isOpen()) {
                session.close();
            }
        } catch (Exception ignored) {}
    }

    public synchronized void broadcast(Object payload) {
        if (sessions.isEmpty()) return;
        try {
            String json = mapper.writeValueAsString(payload);
            TextMessage message = new TextMessage(json);

            for (WebSocketSession s : sessions) {
                if (s.isOpen()) {
                    try {
                        s.sendMessage(message);
                    } catch (IllegalStateException | IOException e) {
                        // Session closed or disconnected during broadcast
                        sessions.remove(s);
                    } catch (Exception ignored) {}
                } else {
                    sessions.remove(s);
                }
            }
        } catch (Exception ignored) {}
    }
}
