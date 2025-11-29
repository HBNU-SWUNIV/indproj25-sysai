from __future__ import annotations

import cv2
import time
import re
import numpy as np
from typing import List, Tuple, Optional, Dict

Box = Tuple[int, int, int, int]
TrackItem = Tuple[int, int, int, int, int]
QRItem = Tuple[str, Box]


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

    def __init__(self, dedup_ttl: float = 0.8, bind_ttl: float = 12.0, iou_th: float = 0.06, max_center_dist: float = 130):
        self.det = cv2.QRCodeDetector()
        self._seen_qr: Dict[str, float] = {}
        self._bindings: Dict[int, Dict[str, float]] = {}
        self.dedup_ttl = dedup_ttl
        self.bind_ttl = bind_ttl
        self.iou_th = iou_th
        self.max_center_dist = max_center_dist
        self._streak: Dict[str, Tuple[int, Box]] = {}

    def _gc_qr(self) -> None:
        now = time.time()
        self._seen_qr = {k: v for k, v in self._seen_qr.items() if (now - v) <= self.dedup_ttl}

    def _gc_bindings(self) -> None:
        now = time.time()
        self._bindings = {tid: b for tid, b in self._bindings.items() if (now - b.get("last_seen", 0.0)) <= self.bind_ttl}

    def _parse_user_id(self, text: str) -> Optional[str]:
        if not text:
            return None
        m = self.ABS_PATTERN.match(text.strip())
        return m.group(1) if m else None

    def _preprocess_for_qr(self, img):
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        g = cv2.bilateralFilter(g, 7, 40, 40)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        g = clahe.apply(g)
        k = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
        g = cv2.filter2D(g, -1, k)
        g = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 7)
        return g

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
                    x1 = int(min(p[0] for p in pts)); y1 = int(min(p[1] for p in pts))
                    x2 = int(max(p[0] for p in pts)); y2 = int(max(p[1] for p in pts))
                    results.append((uid, (x1, y1, x2, y2)))
        except Exception:
            pass
        if not results:
            try:
                prep = self._preprocess_for_qr(frame)
                found, decoded_list, points, _ = self.det.detectAndDecodeMulti(prep)
                if found and decoded_list is not None and points is not None:
                    for text, pts in zip(decoded_list, points):
                        if not text or pts is None or len(pts) == 0:
                            continue
                        uid = self._parse_user_id(text)
                        if uid is None:
                            continue
                        x1 = int(min(p[0] for p in pts)); y1 = int(min(p[1] for p in pts))
                        x2 = int(max(p[0] for p in pts)); y2 = int(max(p[1] for p in pts))
                        results.append((uid, (x1, y1, x2, y2)))
            except Exception:
                pass
        if not results:
            try:
                text, pts, _ = self.det.detectAndDecode(frame)
                if text:
                    uid = self._parse_user_id(text)
                    if uid:
                        if pts is not None and len(pts) > 0:
                            pts_arr = np.array(pts)
                            x1 = int(pts_arr[:, 0].min()); y1 = int(pts_arr[:, 1].min())
                            x2 = int(pts_arr[:, 0].max()); y2 = int(pts_arr[:, 1].max())
                        else:
                            h, w = frame.shape[:2]
                            cx, cy = w // 2, h // 2
                            x1, y1 = max(0, cx - 20), max(0, cy - 20)
                            x2, y2 = min(w - 1, cx + 20), min(h - 1, cy + 20)
                        results.append((uid, (x1, y1, x2, y2)))
            except Exception:
                pass
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

    def decode_from_tracks(self, frame, tracks: List[TrackItem], expand: float = 0.2) -> List[QRItem]:
        H, W = frame.shape[:2]
        found_all: List[QRItem] = []

        def _to_int(v):
            try:
                v = float(v)
                if not np.isfinite(v):
                    return None
                return int(round(v))
            except Exception:
                return None

        for t in tracks:
            if len(t) != 5:
                continue
            tid, x1, y1, x2, y2 = t
            x1 = _to_int(x1); y1 = _to_int(y1); x2 = _to_int(x2); y2 = _to_int(y2)
            if None in (x1, y1, x2, y2):
                continue
            if x2 < x1:
                x1, x2 = x2, x1
            if y2 < y1:
                y1, y2 = y2, y1
            w = x2 - x1; h = y2 - y1
            if w <= 0 or h <= 0:
                continue
            ex = int(round(w * expand)); ey = int(round(h * expand))
            cx1 = max(0, min(x1 - ex, W - 1))
            cy1 = max(0, min(y1 - ey, H - 1))
            cx2 = max(0, min(x2 + ex, W - 1))
            cy2 = max(0, min(y2 + ey, H - 1))
            if cx2 <= cx1 or cy2 <= cy1:
                continue
            roi = frame[cy1:cy2, cx1:cx2]
            if roi.size == 0:
                continue
            items = self.decode(roi)
            for uid, (rx1, ry1, rx2, ry2) in items:
                found_all.append((uid, (cx1 + rx1, cy1 + ry1, cx1 + rx2, cy1 + ry2)))
        return found_all

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
                if best_iou < self.iou_th and best_dist > (self.max_center_dist ** 2):
                    continue
                prev = self._bindings.get(best_tid)
                if (prev is None) or (prev.get("user_id") != uid):
                    self._bindings[best_tid] = {"user_id": uid, "last_seen": now}
                    updated.append((best_tid, uid))
                else:
                    prev["last_seen"] = now
        return updated

    def stabilize(self, items: List[QRItem], min_hit: int = 1) -> List[QRItem]:
        if min_hit <= 1:
            return items
        out = []
        for uid, box in items:
            cnt, _ = self._streak.get(uid, (0, None))
            cnt += 1
            self._streak[uid] = (cnt, box)
            if cnt >= min_hit:
                out.append((uid, box))
        for uid in list(self._streak.keys()):
            c, b = self._streak[uid]
            if c > 0:
                self._streak[uid] = (max(0, c - 1), b)
        return out

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
            cv2.putText(frame, f"QR:{uid}", (x1, max(0, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
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
            cv2.putText(frame, label, (int(x1), max(0, int(y1) - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
        return frame
