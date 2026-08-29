package com.arp.monitor.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final TrafficWebSocketHandler trafficWebSocketHandler;

    @Autowired
    public WebSocketConfig(TrafficWebSocketHandler trafficWebSocketHandler) {
        this.trafficWebSocketHandler = trafficWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(trafficWebSocketHandler, "/ws/traffic")
                .setAllowedOrigins("*");
    }
}

