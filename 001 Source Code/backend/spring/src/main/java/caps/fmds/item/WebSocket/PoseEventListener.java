package caps.fmds.item.WebSocket; // 소문자 패키지 권장
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Aggregates;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.changestream.ChangeStreamDocument;
import com.mongodb.client.model.changestream.FullDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PoseEventListener implements ApplicationListener<ApplicationReadyEvent> {

    private final MongoClient mongoClient;
    private final DataWebSocketHandler ws;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        log.info("Change Stream(동기) 시작: pose_events @Atlas");

        Thread watcher = new Thread(() -> {
            while (true) { // 끊기면 재시작
                try {
                    MongoDatabase db = mongoClient.getDatabase("data"); // <-- URI의 DB명
                    MongoCollection<Document> col = db.getCollection("pose_events");

                    var pipeline = List.of(
                            Aggregates.match(Filters.in("operationType",
                                    List.of("insert", "replace", "update")))
                    );

                    var cursor = col.watch(pipeline)
                            .fullDocument(FullDocument.UPDATE_LOOKUP)
                            .iterator();

                    log.info("pose_events Change Stream 커서 오픈");

                    while (cursor.hasNext()) {
                        ChangeStreamDocument<Document> ev = cursor.next();
                        log.info("pose_events 변경 감지: {}", ev.getOperationType());
                        ws.notifyModelChanged("pose_events");
                    }

                    log.warn("Change Stream 커서 종료됨. 2초 후 재시도");
                    Thread.sleep(2000);

                } catch (Exception e) {
                    log.error("Change Stream 루프 오류, 2초 후 재시도", e);
                    try { Thread.sleep(2000); } catch (InterruptedException ignore) {}
                }
            }
        }, "pose-events-cstream");
        watcher.setDaemon(true);
        watcher.start();
    }
}