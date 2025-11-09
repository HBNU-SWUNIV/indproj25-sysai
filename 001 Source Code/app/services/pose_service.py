import cv2
import numpy as np
from ultralytics import YOLO

class PoseService:
    def __init__(self, weights="yolov8n-pose.pt", conf=0.35, imgsz=480):
        self.model = YOLO(weights)
        self.conf = conf
        self.imgsz = imgsz

    def estimate(self, frame, tracked):
        poses = {}
        results = self.model.predict(frame, conf=self.conf, imgsz=self.imgsz, verbose=False)
        if not results:
            return poses

        r = results[0]
        if r.keypoints is None:
            return poses

        yolo_boxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else []
        yolo_kpts = r.keypoints.xy.cpu().numpy() if r.keypoints is not None else []

        for tid, x1, y1, x2, y2 in tracked:
            best_iou, best_idx = 0.0, -1
            for i, b in enumerate(yolo_boxes):
                iou = self._iou((x1,y1,x2,y2), b)
                if iou > best_iou:
                    best_iou, best_idx = iou, i
            if best_idx >= 0:
                poses[tid] = {"kpts": yolo_kpts[best_idx], "score": float(best_iou)}
        return poses

    @staticmethod
    def draw(frame, poses, color=(0,255,255)):
        for tid, data in poses.items():
            k = data["kpts"]
            for (x,y) in k:
                cv2.circle(frame, (int(x),int(y)), 3, color, -1)
        return frame

    @staticmethod
    def _iou(a, b):
        x1 = max(a[0], b[0]); y1 = max(a[1], b[1])
        x2 = min(a[2], b[2]); y2 = min(a[3], b[3])
        inter = max(0, x2-x1) * max(0, y2-y1)
        area_a = (a[2]-a[0])*(a[3]-a[1]); area_b = (b[2]-b[0])*(b[3]-b[1])
        union = area_a + area_b - inter
        return inter/union if union>0 else 0.0
