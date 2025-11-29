# app/services/yolo_detector.py
from ultralytics import YOLO
import torch
from app.utils.config import YOLO_WEIGHTS, YOLO_CONF, YOLO_IMGSZ

class YoloPersonDetector:

    def __init__(self, weights=YOLO_WEIGHTS, conf=YOLO_CONF, imgsz=YOLO_IMGSZ):
        self.model = YOLO(weights)
        self.conf = conf
        self.imgsz = imgsz

    def detect(self, frame):
        """
        frame -> YOLO 추론 -> [(x1,y1,x2,y2,score), ...] 반환
        """
        results = self.model(
            frame,
            classes=[0],         # 사람만
            conf=self.conf,
            imgsz=self.imgsz,
            verbose=False
        )

        boxes = []
        for r in results:
            if r.boxes is None:
                continue
            # r.boxes.xyxy: (N,4) tensor, r.boxes.conf: (N,) tensor
            xyxy = r.boxes.xyxy
            confs = r.boxes.conf if hasattr(r.boxes, "conf") else None

            # CPU 텐서로 보장
            if isinstance(xyxy, torch.Tensor):
                xyxy = xyxy.detach().cpu()
            if confs is not None and isinstance(confs, torch.Tensor):
                confs = confs.detach().cpu()

            for i in range(xyxy.shape[0]):
                x1, y1, x2, y2 = map(float, xyxy[i].tolist())
                score = float(confs[i].item()) if confs is not None else 1.0
                boxes.append((x1, y1, x2, y2, score))
        return boxes

    # 필요 시: 시각화만 담당하는 헬퍼 (main에서 안 쓰면 생략해도 됨)
    @staticmethod
    def draw(frame, boxes, color=(0,255,0)):
        import cv2
        for x1, y1, x2, y2, _ in boxes:
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            cv2.putText(frame, "Person", (int(x1), max(0, int(y1)-10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        return frame