import os

# 카메라 URL
CAMERA_URL = os.getenv("CAMERA_URL", "")


YOLO_WEIGHTS = os.getenv("YOLO_WEIGHTS", "yolov8n.pt")
YOLO_CONF = float(os.getenv("YOLO_CONF", "0.35"))
YOLO_IMGSZ = int(os.getenv("YOLO_IMGSZ", "480"))

MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB  = os.getenv("MONGO_DB", "data")
CAM_ID    = os.getenv("CAM_ID", "cam-1")

POSE_SAVE_HZ = float(os.getenv("POSE_SAVE_HZ", "5"))
