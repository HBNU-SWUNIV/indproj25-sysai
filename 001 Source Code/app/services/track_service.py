import time
from typing import List, Tuple

def iou(a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    inter_x1, inter_y1 = max(ax1, bx1), max(ay1, by1)
    inter_x2, inter_y2 = min(ax2, bx2), min(ay2, by2)

    iw, ih = max(0, inter_x2 - inter_x1), max(0, inter_y2 - inter_y1)
    inter = iw * ih
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter + 1e-6
    return inter / union


class SimpleTracker:

    def __init__(self, iou_th: float = 0.3, ttl: float = 2.5): 
        self.iou_th = iou_th
        self.ttl = ttl
        self.next_id = 1
        self.tracks = {}  

    def update(self, detections: List[Tuple[int, int, int, int, float]]):
        now = time.time()
        assigned = set()

        for tid, t in list(self.tracks.items()):
            best_iou, best_idx = 0.0, -1
            for i, d in enumerate(detections):
                if i in assigned:
                    continue
                iou_val = iou(t["box"], d[:4])
                if iou_val > best_iou:
                    best_iou, best_idx = iou_val, i

            if best_iou >= self.iou_th and best_idx >= 0:
                self.tracks[tid] = {"box": detections[best_idx][:4], "last": now}
                assigned.add(best_idx)
            # detection이 없으면 TTL이 끝날 때까지 유지

        for i, d in enumerate(detections):
            if i in assigned:
                continue
            tid = self.next_id
            self.next_id += 1
            self.tracks[tid] = {"box": d[:4], "last": now}


        for tid in list(self.tracks.keys()):
            if now - self.tracks[tid]["last"] > self.ttl:
                del self.tracks[tid]


        out = []
        for tid, t in self.tracks.items():
            x1, y1, x2, y2 = t["box"]
            out.append((tid, x1, y1, x2, y2))
        return out