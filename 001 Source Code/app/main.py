from __future__ import annotations

import asyncio
import cv2
import threading
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse, Response
import math
from functools import partial
import numpy as np

def _safe_int(v):
    try: v = float(v)
    except Exception: return None
    if not math.isfinite(v): return None
    return int(round(v))

def _safe_box_to_ints(item, w, h):
    if len(item) == 5: _, x1, y1, x2, y2 = item
    else: x1, y1, x2, y2 = item
    x1, y1, x2, y2 = _safe_int(x1), _safe_int(y1), _safe_int(x2), _safe_int(y2)
    if None in (x1, y1, x2, y2): return None
    if x2 < x1: x1, x2 = x2, x1
    if y2 < y1: y1, y2 = y2, y1
    x1, y1, x2, y2 = max(0, min(x1, w-1)), max(0, min(y1, h-1)), max(0, min(x2, w-1)), max(0, min(y2, h-1))
    if x2 == x1 or y2 == y1: return None
    return (x1, y1, x2, y2)


from app.services.capture_service import CaptureService
from app.services.yolo_detector import YoloPersonDetector
from app.services.track_service import SimpleTracker
from app.services.qr_service import QRService
from app.services.pose_service import PoseService
from app.services.pose_writer import PoseWriter
from app.utils import config
from app.utils.db import init_db, now_utc_and_kst_str, get_db
from app.utils.broadcaster import Broadcaster

app = FastAPI(title="RTSP + YOLO + Tracker + QR + Pose Stream")

capture: CaptureService | None = None
detector: YoloPersonDetector | None = None
tracker: SimpleTracker | None = None
qr: QRService | None = None
pose: PoseService | None = None
writer: PoseWriter | None = None
broadcaster = Broadcaster()

_lock = threading.Lock()
_last_save_t = 0.0
_user_name_cache = {} 


@app.on_event("startup")
async def on_startup():
    global capture, detector, tracker, qr, pose, writer
    with _lock:
        init_db(config.MONGO_URI, config.MONGO_DB)
        capture = CaptureService()
        capture.start()
        detector = YoloPersonDetector()
        tracker = SimpleTracker(iou_th=0.3, ttl=1.0)
        qr = QRService(dedup_ttl=0.8, bind_ttl=12.0, iou_th=0.06, max_center_dist=130)
        pose = PoseService(weights="yolov8n-pose.pt", conf=0.35, imgsz=480)
        writer = PoseWriter(batch_size=80, flush_sec=0.5)
        writer.start()
    asyncio.create_task(background_processor())

@app.on_event("shutdown")
def on_shutdown():
    global capture, writer
    with _lock:
        if capture: capture.stop()
        if writer: writer.stop()
        capture = writer = None


def _should_save(now_t: float) -> bool:
    if config.POSE_SAVE_HZ <= 0: return False
    global _last_save_t
    period = 1.0 / config.POSE_SAVE_HZ
    return (now_t - _last_save_t) >= period

def get_user_name(user_id: str) -> str: 
    if user_id in _user_name_cache:
        return _user_name_cache[user_id]

    try:
        db = get_db()
        user_doc = db["users"].find_one({"user_id_field": user_id})

        if user_doc and "name" in user_doc:
            name = user_doc["name"]
            _user_name_cache[user_id] = name
            return name
    except Exception as e:
        print(f"Error fetching user name from DB: {e}")

    _user_name_cache[user_id] = user_id
    return user_id

async def background_processor():
    global _last_save_t
    assert all((capture, detector, tracker, qr, pose, writer))
    frame_seq = 0
    loop = asyncio.get_running_loop()

    while True:
        frame = capture.get_latest()
        if frame is None:
            await asyncio.sleep(0.01)
            continue


        process_func = partial(process_frame_sync, frame)
        processed_frame, tracked_with_user, poses = await loop.run_in_executor(None, process_func)


        H, W = processed_frame.shape[:2]
        now_t = time.time()
        if _should_save(now_t):
            _last_save_t = now_t
            ts_utc, ts_kst_str = now_utc_and_kst_str()
            for tid, x1, y1, x2, y2, uid in tracked_with_user:
                p = poses.get(tid)
                if not p: continue
                writer.offer({
                    "ts": ts_utc,
                    "ts_kst_str": ts_kst_str,
                    "cam_id": config.CAM_ID, 
                    "user_id": uid, 
                    "track_id": int(tid),
                    "frame_seq": frame_seq, 
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "kpts": [[float(x), float(y)] for (x,y) in p["kpts"]], 
                    "score": float(p["score"]),
                    "img_w": int(W), 
                    "img_h": int(H),
                })


        encode_func = partial(cv2.imencode, ".jpg", processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        ok, buf = await loop.run_in_executor(None, encode_func)
        if ok:
            await broadcaster.broadcast(buf.tobytes())
        frame_seq += 1

def process_frame_sync(frame):
    draw_frame = frame.copy()
    

    detections = detector.detect(draw_frame)
    tracked = tracker.update(detections)


    qr_items = qr.decode_from_tracks(draw_frame, tracked, expand=0.2)  
    if not qr_items:
        qr_items = qr.decode(draw_frame)                               

    qr_items = qr.stabilize(qr_items, min_hit=1)                       
    qr.bind_to_tracks(tracked, qr_items)   

 
    tracked_with_user = []
    for tid, x1, y1, x2, y2 in tracked:
        uid = qr.get_user_id(tid)
        if uid:
            tracked_with_user.append((tid, x1, y1, x2, y2, uid))


    poses = {}
    if tracked_with_user:
        poses = pose.estimate(draw_frame, [t[:5] for t in tracked_with_user])


    H, W = draw_frame.shape[:2]
    for tr in tracked:
        ok = _safe_box_to_ints(tr, W, H)
        if ok is None: continue
        x1, y1, x2, y2 = ok
        tid = tr[0]
        uid = qr.get_user_id(tid)

        if uid:
            name = get_user_name(uid)
            label = f"{name}"
            color = (0, 165, 255) # 주황
        else:
            label = f"ID {tid}"
            color = (0, 255, 0)   # 초록
        
        cv2.rectangle(draw_frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(draw_frame, label, (x1, max(0, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    draw_frame = pose.draw(draw_frame, poses)
    
    return draw_frame, tracked_with_user, poses

@app.get("/", summary="Real-time MJPEG stream...")
async def root_stream():
    async def mjpeg_generator():
        q = asyncio.Queue(maxsize=2)
        await broadcaster.connect(q)
        try:
            while True:
                jpeg_bytes = await q.get()
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n")
        finally:
            await broadcaster.disconnect(q)
    return StreamingResponse(mjpeg_generator(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.websocket("/ws")
async def ws_stream(ws: WebSocket):
    await ws.accept()
    q = asyncio.Queue(maxsize=2)
    await broadcaster.connect(q)
    try:
        while True:
            jpeg_bytes = await q.get()
            await ws.send_bytes(jpeg_bytes)
    except (WebSocketDisconnect, ConnectionResetError):
        print("WebSocket client disconnected.")
    finally:
        await broadcaster.disconnect(q)


@app.get("/skeleton/{user_id}", summary="특정 사용자 최신 스켈레톤 이미지")
async def get_latest_skeleton_image(user_id: str, closeup: bool = True):
    """
    MongoDB pose_events에서 user_id 기준 가장 최근 관절 데이터를 가져와서
    백엔드에서 스켈레톤을 그린 뒤 JPEG 이미지로 반환.
    closeup=True 이면 bbox 기준으로 잘라서 클로즈업 이미지 반환.
    """
    db = get_db()

    # pose_events 컬렉션에서 해당 유저의 가장 최근 관절 데이터 조회
    doc = db["pose_events"].find_one(
        {"user_id": user_id},
        sort=[("ts", -1)]
    )
    if not doc:
        raise HTTPException(status_code=404, detail="해당 사용자에 대한 포즈 데이터가 없습니다.")

    kpts = doc.get("kpts") or []       # [[x, y], [x, y], ...] 형태
    score = float(doc.get("score", 1.0))
    img_w = int(doc.get("img_w", 640))
    img_h = int(doc.get("img_h", 480))

    # 전체 프레임(검정 배경) 생성
    frame = np.zeros((img_h, img_w, 3), dtype=np.uint8)

    # pose.draw 에 맞게 poses 딕셔너리 구성
    # 기존 process_frame_sync 에서 사용하는 형식 그대로 맞춰줌
    poses = {
        0: {
            "kpts": [ (float(x), float(y)) for x, y in kpts ],
            "score": score,
        }
    }

    # 기존 pose.draw 로 스켈레톤 그리기 (같은 스타일 유지)
    global pose
    if pose is None:
        raise HTTPException(status_code=500, detail="PoseService 가 초기화되지 않았습니다.")

    frame = pose.draw(frame, poses)

    # 필요하면 bbox 기준으로 클로즈업
    if closeup and "bbox" in doc:
        try:
            x1, y1, x2, y2 = doc["bbox"]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

            # 경계 체크
            x1 = max(0, min(x1, img_w - 1))
            x2 = max(0, min(x2, img_w))
            y1 = max(0, min(y1, img_h - 1))
            y2 = max(0, min(y2, img_h))

            if x2 > x1 and y2 > y1:
                frame = frame[y1:y2, x1:x2]
        except Exception as e:
            print(f"[skeleton] bbox crop 실패: {e}")

    # JPEG 인코딩
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        raise HTTPException(status_code=500, detail="이미지 인코딩에 실패했습니다.")

    return Response(content=buf.tobytes(), media_type="image/jpeg")



