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
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

    // 서버에서 데이터 변경 시 알림 전송
    // 특정 모델타입 데이터가 변경되었을 때 이 메소드를 호출해서 해당 모델타입을 구독한 클라이언트들에게 실시간 알림을 전송함.
    public void notifyModelChanged(String modelType) {
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
        try {
            String nodeUrl = "http://localhost:3000/cache/event"; // 프론트 서버
            HttpClient client = HttpClient.newHttpClient();

            String jsonPayload = objectMapper.writeValueAsString(Map.of(
                    "modelType", modelType
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(nodeUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            client.sendAsync(request, HttpResponse.BodyHandlers.discarding());
            log.info("노드 서버에 캐시 삭제 요청 전송 완료: {}", modelType);
        } catch (Exception e) {
            log.error("노드 서버 캐시 삭제 요청 실패", e);
        }
    }



}

