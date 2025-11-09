import asyncio
from typing import List

class Broadcaster:
    def __init__(self):
        self._clients: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()

    async def connect(self, client_queue: asyncio.Queue):
        async with self._lock:
            self._clients.append(client_queue)

    async def disconnect(self, client_queue: asyncio.Queue):
        async with self._lock:
            try:
                self._clients.remove(client_queue)
            except ValueError:
                pass  

    async def broadcast(self, message: bytes):
        clients_to_broadcast = []
        async with self._lock:
            clients_to_broadcast = self._clients[:]
            
        for q in clients_to_broadcast:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                    q.put_nowait(message)
                except asyncio.QueueEmpty:
                    pass
