# ==============================================================================
# Multi-Stage Dockerfile for ARP Network Monitoring System
# Computer Networks Mini Project - Detect abnormal changes in simulated ARP mappings
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the Spring Boot JAR with Maven
# ------------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder

WORKDIR /build

# Copy Maven POM and download dependencies to leverage Docker layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy project source code and resources (including React frontend)
COPY src ./src

# Package the application into an executable Spring Boot JAR
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Ultra-Lightweight Production Runtime (JRE 17 Alpine)
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Create non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled JAR from the builder stage
COPY --from=builder /build/target/arp-network-monitor-*.jar app.jar

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Expose Spring Boot Tomcat & WebSocket port
EXPOSE 8080

# Configure JVM memory optimization flags for container environments
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Launch Spring Boot Application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

