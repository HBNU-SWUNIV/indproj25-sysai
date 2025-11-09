import os
import time
import cv2
import threading
import collections
from app.utils.config import CAMERA_URL


os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;5000000"


class CaptureService:
    def __init__(self, url: str | None = None):
        self.url = url or CAMERA_URL
        self.cap = None
        self.q = collections.deque(maxlen=1)
        self.alive = False
        self.th: threading.Thread | None = None
        self._lock = threading.Lock()

    def _open(self):
        if self.url.isdigit():
            cap = cv2.VideoCapture(int(self.url))
        else:
            cap = cv2.VideoCapture(self.url, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video source: {self.url}")
        return cap

    def start(self):
        if self.alive:
            return
        self.alive = True
        self.cap = self._open()
        self.th = threading.Thread(target=self._loop, daemon=True)
        self.th.start()

    def _loop(self):
        while self.alive:
            ok, frame = self.cap.read()
            if not ok or frame is None: # 연결 실패시 reconnect
                self._reconnect()
                continue
            self.q.append(frame)

    def _reconnect(self):
        try:
            if self.cap:
                self.cap.release()
        except:
            pass
        time.sleep(1.0)
        self.cap = self._open()

    def get_latest(self):
        return self.q[-1] if self.q else None

    def stop(self):
        self.alive = False # false로 끊고 리소스 정리
        try:
            if self.cap:
                self.cap.release()
        except:
            pass