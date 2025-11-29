
import threading, queue, time
from app.utils.db import get_db

class PoseWriter(threading.Thread):
    def __init__(self, batch_size=50, flush_sec=0.5):
        super().__init__(daemon=True)
        self.q = queue.Queue(maxsize=5000)
        self.running = True
        self.batch_size = batch_size
        self.flush_sec = flush_sec

    def run(self):
        coll = get_db()["pose_events"]
        buf = []
        last = time.time()
        while self.running:
            try:
                item = self.q.get(timeout=0.1)
                buf.append(item)
            except queue.Empty:
                pass

            if buf and (len(buf) >= self.batch_size or time.time()-last >= self.flush_sec):
                try:
                    coll.insert_many(buf, ordered=False)
                except Exception:
                    # DB 오류 무시하고 계속 진행
                    pass
                buf.clear()
                last = time.time()

    def stop(self):
        self.running = False

    def offer(self, doc):
        try:
            self.q.put_nowait(doc)
        except queue.Full:
            pass  # 큐가 가득 찼을 때 드롭
