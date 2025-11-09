from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime, timezone
from zoneinfo import ZoneInfo 

_client = None
_db = None

def init_db(uri, dbname):
    global _client, _db
    _client = MongoClient(uri)
    _db = _client[dbname] 
    coll = _db["pose_events"]
    coll.create_index([("user_id", ASCENDING), ("ts", DESCENDING)])
    coll.create_index([("cam_id", ASCENDING), ("ts", DESCENDING)])
    coll.create_index([("ts", DESCENDING)])
    return _db


def get_db():
    return _db

# def now_utc():
#     return datetime.utcnow()

def now_utc_and_kst_str():
    utc = datetime.now(timezone.utc)
    kst = utc.astimezone(ZoneInfo("Asia/Seoul"))
    # 원하는 포맷: 2025/10/30/14:46:30
    kst_str = kst.strftime("%Y/%m/%d/%H:%M:%S")
    return utc, kst_str