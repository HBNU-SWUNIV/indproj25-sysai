from __future__ import annotations

import cv2
import time
import re
from typing import List, Tuple, Optional, Dict

Box = Tuple[int, int, int, int]  # (x1, y1, x2, y2)
TrackItem = Tuple[int, int, int, int, int]  # (track_id, x1, y1, x2, y2)
QRItem = Tuple[str, Box]  # (user_id, (x1, y1, x2, y2))


def _iou(a: Box, b: Box) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    inter_x1, inter_y1 = max(ax1, bx1), max(ay1, by1)
    inter_x2, inter_y2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, inter_x2 - inter_x1), max(0, inter_y2 - inter_y1)
    inter = iw * ih
    if inter == 0:
        return 0.0
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter + 1e-6
    return float(inter) / float(union)


def _center(b: Box) -> Tuple[float, float]:
    x1, y1, x2, y2 = b
    return (0.5 * (x1 + x2), 0.5 * (y1 + y2))


class QRService:

    ABS_PATTERN = re.compile(r"^abs://patient/([A-Za-z0-9._:@-]+)$")

    def __init__(
        self,
        dedup_ttl: float = 2.0,       # 같은 QR 연속 검출 중복 제거 TTL
        bind_ttl: float = 10.0,       # track_id <-> user_id 바인딩 유지 시간
        iou_th: float = 0.1,          
        max_center_dist: float = 120  
    ):
        self.det = cv2.QRCodeDetector()
        self._seen_qr: Dict[str, float] = {}    
        self._bindings: Dict[int, Dict[str, float]] = {}
        self.dedup_ttl = dedup_ttl
        self.bind_ttl = bind_ttl
        self.iou_th = iou_th
        self.max_center_dist = max_center_dist

    def _gc_qr(self) -> None:
        now = time.time()
        self._seen_qr = {k: v for k, v in self._seen_qr.items() if (now - v) <= self.dedup_ttl}

    def _gc_bindings(self) -> None:
        now = time.time()
        self._bindings = {
            tid: b for tid, b in self._bindings.items()
            if (now - b.get("last_seen", 0.0)) <= self.bind_ttl
        }

    def _parse_user_id(self, text: str) -> Optional[str]:
        if not text:
            return None
        m = self.ABS_PATTERN.match(text.strip())
        if m:
            return m.group(1)
        return None


    def decode(self, frame) -> List[QRItem]:
        results: List[QRItem] = []


        try:
            found, decoded_list, points, _ = self.det.detectAndDecodeMulti(frame)
            if found and decoded_list is not None and points is not None:
                for text, pts in zip(decoded_list, points):
                    if not text or pts is None or len(pts) == 0:
                        continue
                    uid = self._parse_user_id(text)
                    if uid is None:
                        continue
                    x1 = int(min(p[0] for p in pts))
                    y1 = int(min(p[1] for p in pts))
                    x2 = int(max(p[0] for p in pts))
                    y2 = int(max(p[1] for p in pts))
                    results.append((uid, (x1, y1, x2, y2)))
        except Exception:
            pass

        if not results:
            ret = self.det.detectAndDecode(frame)
            if isinstance(ret, tuple):
                if len(ret) >= 2:
                    text, pts = ret[0], ret[1]
                else:
                    text, pts = ret[0], None
            else:
                text, pts = None, None

            if text:
                uid = self._parse_user_id(text)
                if uid and pts is not None and len(pts) > 0:
                    try:
                        import numpy as np
                        pts_arr = np.array(pts)
                        x1 = int(pts_arr[:, 0].min())
                        y1 = int(pts_arr[:, 1].min())
                        x2 = int(pts_arr[:, 0].max())
                        y2 = int(pts_arr[:, 1].max())
                    except Exception:
                        x_coords = [int(p[0]) for p in pts]
                        y_coords = [int(p[1]) for p in pts]
                        x1, y1 = min(x_coords), min(y_coords)
                        x2, y2 = max(x_coords), max(y_coords)

                    results.append((uid, (x1, y1, x2, y2)))

        self._gc_qr()
        now = time.time()
        deduped: List[QRItem] = []
        for uid, box in results:
            last = self._seen_qr.get(uid)
            if last is not None and (now - last) <= self.dedup_ttl:
                continue
            self._seen_qr[uid] = now
            deduped.append((uid, box))

        return deduped

    def bind_to_tracks(self, tracks: List[TrackItem], qr_items: List[QRItem]) -> List[Tuple[int, str]]:
        self._gc_bindings()
        now = time.time()
        updated: List[Tuple[int, str]] = []

        for uid, qbox in qr_items:
            qcx, qcy = _center(qbox)

            best_tid = None
            best_iou = 0.0
            best_dist = float("inf")

            for t in tracks:
                if len(t) != 5:
                    continue
                tid, x1, y1, x2, y2 = t
                tbox = (int(x1), int(y1), int(x2), int(y2))

                iou = _iou(qbox, tbox)
                if iou >= self.iou_th and iou > best_iou:
                    best_iou = iou
                    best_tid = tid
                    tcx, tcy = _center(tbox)
                    best_dist = (tcx - qcx) ** 2 + (tcy - qcy) ** 2
                else:
                    tcx, tcy = _center(tbox)
                    dist2 = (tcx - qcx) ** 2 + (tcy - qcy) ** 2
                    if best_tid is None and dist2 < best_dist:
                        best_dist = dist2
                        best_tid = tid

            if best_tid is not None:
                if best_iou < self.iou_th:
                    if best_dist > (self.max_center_dist ** 2):
                        continue  # 너무 멀다 → 매칭 포기

                # 바인딩 갱신
                prev = self._bindings.get(best_tid)
                if (prev is None) or (prev.get("user_id") != uid):
                    self._bindings[best_tid] = {"user_id": uid, "last_seen": now}
                    updated.append((best_tid, uid))
                else:
                    prev["last_seen"] = now

        return updated

    def get_user_id(self, track_id: int) -> Optional[str]:
        self._gc_bindings()
        info = self._bindings.get(track_id)
        if not info:
            return None
        return str(info.get("user_id"))


    @staticmethod
    def draw_qr(frame, items: List[QRItem], color=(255, 0, 0)):
        for uid, (x1, y1, x2, y2) in items:
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"QR:{uid}", (x1, max(0, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        return frame

    def draw_bindings(self, frame, tracks: List[TrackItem], color=(0, 165, 255)):
        self._gc_bindings()
        for t in tracks:
            if len(t) != 5:
                continue
            tid, x1, y1, x2, y2 = t
            uid = self.get_user_id(tid)
            if uid is None:
                continue
            label = f"ID {tid} (user:{uid})"
            cv2.putText(frame, label, (int(x1), max(0, int(y1) - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
        return frame