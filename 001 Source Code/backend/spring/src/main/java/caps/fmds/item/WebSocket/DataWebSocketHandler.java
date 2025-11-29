package caps.fmds.item.WebSocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;

import java.nio.ByteBuffer;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.*;

@Slf4j
@Component
public class DataWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Set<WebSocketSession>> subscriptions = new ConcurrentHashMap<>();

    private final Map<String, ScheduledFuture<?>> keepAlives = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    private final Map<String, ScheduledFuture<?>> pendingUpdates = new ConcurrentHashMap<>();
    private final Map<String, Long> windowStartTime = new ConcurrentHashMap<>();
    private static final long WINDOW_MILLIS = 3000L;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket 연결됨: {}", session.getId());


        ScheduledFuture<?> f = scheduler.scheduleAtFixedRate(() -> {
            try {
                if (session.isOpen()) {
                    session.sendMessage(new PingMessage(ByteBuffer.allocate(0)));
                }
            } catch (Exception e) {
                log.warn("keepalive ping 실패: {}", session.getId(), e);
            }
        }, 25, 25, TimeUnit.SECONDS);
        keepAlives.put(session.getId(), f);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WebSocket 연결 종료: {} status={}", session.getId(), status);
        subscriptions.values().forEach(set -> set.remove(session));
        ScheduledFuture<?> f = keepAlives.remove(session.getId());
        if (f != null) f.cancel(true);
    }


    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("전송 오류: {} {}", session.getId(), exception.toString());
    }

    // 클라이언트가 웹소켓을 통해 메시지를 보냈을 때 호출되는 함수
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode node = objectMapper.readTree(message.getPayload());
            String type = node.get("type").asText();
            String modelType = node.path("modelType").asText(null);

            switch (type) {
                case "subscribe" -> {
                    subscriptions.computeIfAbsent(modelType, k -> ConcurrentHashMap.newKeySet()).add(session);
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                            Map.of("event","subscribed","modelType", modelType))));
                }
                case "unsubscribe" -> {
                    if (modelType != null) {
                        var set = subscriptions.get(modelType);
                        if (set != null) {
                            set.remove(session);
                            if (set.isEmpty()) subscriptions.remove(modelType); // 비면 room 정리
                        }
                    }
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                            Map.of("event","unsubscribed","modelType", modelType))));
                }
                case "disconnect" -> {
                    session.close(CloseStatus.NORMAL); // 정상 종료
                }
                case "ping" -> {
                    session.sendMessage(new TextMessage("{\"event\":\"pong\"}"));
                }
            }
        }
        catch (Exception e) {
            log.error("메시지 처리 중 예외 발생: {}", e.getMessage());
        }
    }
    private void sendUpdateNow(String modelType) {
        Set<WebSocketSession> sessions = subscriptions.get(modelType);
        if (sessions != null) {
            for (WebSocketSession session : sessions) {
                try {
                    session.sendMessage(new TextMessage(
                            objectMapper.writeValueAsString(Map.of(
                                    "event", "update",
                                    "modelType", modelType
                            ))
                    ));
                } catch (IOException e) {
                    log.error("알림 전송 실패", e);
                }
            }
        }
    }

    // 서버에서 데이터 변경 시 알림 전송
    // 특정 모델타입 데이터가 변경되었을 때 이 메소드를 호출해서 해당 모델타입을 구독한 클라이언트들에게 실시간 알림을 전송함.
    public void notifyModelChanged(String modelType) {
        long now = System.currentTimeMillis();
        Long windowStart = windowStartTime.get(modelType);

        // 1) 타이머가 안 돌고 있는 경우 (처음이거나, 이전 윈도우가 끝난 지 3초 이상 지난 경우)
        if (windowStart == null || (now - windowStart) >= WINDOW_MILLIS) {
            // 혹시 남아 있던 예약 알림 있으면 정리
            ScheduledFuture<?> prev = pendingUpdates.remove(modelType);
            if (prev != null && !prev.isDone()) {
                prev.cancel(false);
            }

            // 1-1) 바로 알림 보내기
            sendUpdateNow(modelType);
            log.debug("즉시 알림 전송 (새 윈도우 시작): modelType={}", modelType);

            // 1-2) 새 3초 윈도우 시작
            windowStartTime.put(modelType, now);
            return;
        }

        // 2) 타이머가 이미 돌고 있는 경우 (윈도우 안에 있음: 3초 중 일부만 경과)
        long elapsed = now - windowStart;
        long remaining = WINDOW_MILLIS - elapsed;

        // 2-1) 이미 윈도우 끝에 보낼 예약이 있으면 또 예약할 필요 없음
        ScheduledFuture<?> existing = pendingUpdates.get(modelType);
        if (existing != null && !existing.isDone()) {
            log.debug("이미 trailing 알림 예약됨: modelType={}", modelType);
            return;
        }

        // 2-2) 윈도우 끝(remaining ms 뒤)에 알림 1번 더 보내도록 예약
        ScheduledFuture<?> future = scheduler.schedule(() -> {
            try {
                sendUpdateNow(modelType);
                log.debug("윈도우 끝(trailing) 알림 전송: modelType={}", modelType);

                // "또 타이머가 시작되는거지" → 이 시점을 새 윈도우 시작으로 본다
                long runNow = System.currentTimeMillis();
                windowStartTime.put(modelType, runNow);
            } finally {
                pendingUpdates.remove(modelType);
            }
        }, remaining, TimeUnit.MILLISECONDS);

        pendingUpdates.put(modelType, future);
        log.debug("trailing 알림 예약: modelType={}, {}ms 후 실행 예정", modelType, remaining);
    }


}

