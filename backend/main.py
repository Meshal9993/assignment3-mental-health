from contextlib import asynccontextmanager
from typing import Literal
import uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from . import db, controllers, model
from .voice import router as voice_router

@asynccontextmanager
async def lifespan(app):
    db.initialize()
    yield

app = FastAPI(title='Coursework Skills Prototype', lifespan=lifespan)
app.include_router(voice_router)

class ChatInput(BaseModel):
    conversation_id: str
    content: str = Field(min_length=1, max_length=1000)
    simulate_failure: bool = False

class StartInput(BaseModel):
    conversation_id: str

class FinishInput(BaseModel):
    status: Literal['completed', 'stopped', 'interrupted']
    reason: Literal['finished', 'stop', 'page_hidden', 'page_leave', 'recovery', 'timing_gap']
    client_duration_ms: int = Field(ge=0, le=86400000)

class PreferenceInput(BaseModel):
    reduced_motion: bool

def require(cid):
    if not db.require_conversation(cid):
        raise HTTPException(404, 'Conversation not found')

@app.get('/api/health')
def health():
    return {'status': 'ok', 'model_mode': model.mode(), 'live_calls': model.budget()}

@app.post('/api/conversations')
def new_conversation():
    cid = str(uuid.uuid4())
    with db.connect() as conn:
        conn.execute('INSERT INTO conversations VALUES(?,?)', (cid, db.now()))
    return {'id': cid}

@app.get('/api/conversations/{cid}')
def history(cid: str):
    require(cid)
    with db.connect() as conn:
        messages = [dict(row) for row in conn.execute('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at', (cid,))]
        sessions = [dict(row) for row in conn.execute('SELECT * FROM sessions WHERE conversation_id=? ORDER BY start_time DESC', (cid,))]
        prefs = conn.execute('SELECT reduced_motion FROM preferences WHERE conversation_id=?', (cid,)).fetchone()
    return {'messages': messages, 'sessions': sessions, 'reduced_motion': bool(prefs[0]) if prefs else None}

@app.put('/api/conversations/{cid}/preferences')
def preferences(cid: str, value: PreferenceInput):
    require(cid)
    with db.connect() as conn:
        conn.execute('INSERT INTO preferences VALUES(?,?) ON CONFLICT(conversation_id) DO UPDATE SET reduced_motion=excluded.reduced_motion', (cid, value.reduced_motion))
    return {'reduced_motion': value.reduced_motion}

@app.post('/api/chat')
async def chat(value: ChatInput):
    require(value.conversation_id)
    if not value.content.strip():
        raise HTTPException(422, 'Enter a question')
    if value.simulate_failure and model.mode() != 'mock':
        raise HTTPException(400, 'Demonstration failure is available in mock mode only')
    return await controllers.chat(value.conversation_id, value.content.strip(), value.simulate_failure)

@app.post('/api/sessions')
def start(value: StartInput):
    require(value.conversation_id)
    sid = str(uuid.uuid4())
    with db.connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        if conn.execute("SELECT 1 FROM sessions WHERE conversation_id=? AND status='active'", (value.conversation_id,)).fetchone():
            raise HTTPException(409, 'An exercise is already active; return to the page to recover it')
        conn.execute('INSERT INTO sessions(id,conversation_id,start_time,status) VALUES(?,?,?,?)', (sid, value.conversation_id, db.now(), 'active'))
    return {'id': sid}

@app.post('/api/sessions/{sid}/finish')
def finish(sid: str, value: FinishInput):
    try:
        result = controllers.finish(sid, value.status, value.reason, value.client_duration_ms)
    except ValueError as error:
        raise HTTPException(409, str(error))
    if result is None:
        raise HTTPException(404, 'Session not found')
    return result
