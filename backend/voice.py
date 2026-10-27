"""Server-owned Live session setup. No microphone handling or frontend policy."""
import asyncio
import json
import os
import re
import uuid

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from . import db, model, voice_cleanup
from .voice_prompts import LIVE_INSTRUCTIONS, BACKEND_INSTRUCTIONS

router = APIRouter(prefix='/api/voice', tags=['voice'])

PROVIDER_URL = 'https://api.openai.com/v1/live/sessions'
VOICE_MODEL = 'gpt-live-1'
DURATION_SECONDS = 60
MAX_SDP_BYTES = 64 * 1024
MAX_REQUEST_BYTES = 96 * 1024
MAX_PROVIDER_BYTES = 128 * 1024
REQUEST_TIMEOUT_SECONDS = 12


class VoiceOffer(BaseModel):
    # There is no profile/owner system in this local app. Do not invent an ID.
    model_config = ConfigDict(extra='forbid', strict=True)
    sdp_offer: str = Field(min_length=1, max_length=MAX_SDP_BYTES)


class VoiceSession(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    session_id: str
    sdp_answer: str
    duration_seconds: int


class VoiceFailure(Exception):
    def __init__(self, status, detail):
        self.status, self.detail = status, detail


def settings():
    """Read local server settings; malformed settings keep voice unavailable."""
    live_model = os.environ.get('VOICE_LIVE_MODEL', VOICE_MODEL).strip()
    backend_model = os.environ.get('VOICE_BACKEND_MODEL', 'gpt-6-luna').strip()
    duration = int(os.environ.get('VOICE_MAX_SESSION_SECONDS', str(DURATION_SECONDS)))
    if (live_model != VOICE_MODEL or not 1 <= duration <= 300
            or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:-]{0,127}', backend_model)):
        raise ValueError('Invalid server voice settings')
    return live_model, backend_model, duration


def configured():
    try:
        settings()
    except ValueError:
        return False
    return os.environ.get('VOICE_ENABLED', '').strip().lower() == 'true' and bool(
        os.environ.get('OPENAI_API_KEY', '').strip()
    )


def validate_sdp(value):
    """Bounded SDP envelope validation; the WebRTC peers negotiate its semantics."""
    if not isinstance(value, str) or not 1 <= len(value.encode('utf-8')) <= MAX_SDP_BYTES:
        raise ValueError('Invalid SDP')
    # Reject control characters, embedded CR, empty records, and non-SDP text.
    lines = value.replace('\r\n', '\n').rstrip('\n').split('\n')
    if lines[0] != 'v=0' or any(not re.fullmatch(r'[a-z]=[\x20-\x7e]+', line) for line in lines):
        raise ValueError('Invalid SDP')
    if not all(any(line.startswith(prefix) for line in lines) for prefix in ('o=', 's=', 't=', 'm=audio ')):
        raise ValueError('Invalid SDP')
    return value


def session_payload(sdp):
    live_model, backend_model, _ = settings()
    return {
        'session': {
            'model': live_model,
            'instructions': LIVE_INSTRUCTIONS,
            # Retrieval/forking setting, NOT a promise about general retention.
            'store': False,
            # Hosted reasoning only; no tools, application actions, or record access.
            'delegation': {'type': 'responses', 'responses': {
                'model': backend_model,
                'instructions': BACKEND_INSTRUCTIONS,
                'tools': [],
                'tool_choice': 'none',
                'parallel_tool_calls': False,
                'max_output_tokens': 400,
            }},
            'triggers': [],
            'client': {'data_channel': {
                # Exactly the lifecycle commands/events used by frontend/voice.js.
                'allowed_client_events': ['session.close'],
                'allowed_server_events': [{'type': 'session.started'}, {'type': 'session.closed'}],
            }},
        },
        'transport': {'type': 'webrtc', 'sdp': sdp},
    }


def provider_client():
    # One attempt only, no redirects carrying credentials, finite phase timeouts.
    return httpx.AsyncClient(
        transport=httpx.AsyncHTTPTransport(retries=0),
        timeout=httpx.Timeout(10.0, connect=3.0, pool=3.0),
        follow_redirects=False,
        trust_env=False,
    )


def reserve_call():
    """Include setup attempts, even failures, in the existing host call budget."""
    limit = model.budget()['limit']
    with db.connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        used = conn.execute('SELECT count(*) FROM model_calls WHERE host_session=?',
                            (model.HOST_SESSION,)).fetchone()[0]
        if used >= limit:
            raise VoiceFailure(503, 'Voice session limit reached.')
        conn.execute('INSERT INTO model_calls VALUES(?,?,?,?)',
                     (str(uuid.uuid4()), model.HOST_SESSION, db.now(), 'voice_session'))


def parse_provider(body, duration_seconds=DURATION_SECONDS):
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError('Invalid response')
    session, transport = data.get('session'), data.get('transport')
    if not isinstance(session, dict) or not isinstance(transport, dict):
        raise ValueError('Invalid response')
    sid = session.get('id')
    if not isinstance(sid, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,255}', sid):
        raise ValueError('Invalid response')
    if transport.get('type') != 'webrtc':
        raise ValueError('Invalid response')
    answer = validate_sdp(transport.get('sdp'))
    # Select fields explicitly; never relay a provider body, headers, or secrets.
    return VoiceSession(session_id=sid, sdp_answer=answer, duration_seconds=duration_seconds)


async def create_session(offer):
    if not configured():
        raise VoiceFailure(503, 'Voice is not configured.')
    _, _, duration = settings()
    try:
        reserve_call()
        # Wall-clock deadline also bounds streaming/chunked responses.
        async with asyncio.timeout(REQUEST_TIMEOUT_SECONDS):
            async with provider_client() as client:
                async with client.stream(
                    'POST', PROVIDER_URL,
                    headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'].strip()},
                    json=session_payload(offer),
                ) as response:
                    if response.status_code != 201:
                        raise VoiceFailure(502, 'Voice provider request failed.')
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > MAX_PROVIDER_BYTES:
                            raise VoiceFailure(502, 'Invalid voice provider response.')
                    try:
                        return parse_provider(bytes(body), duration)
                    except (ValueError, TypeError, UnicodeError, RecursionError):
                        raise VoiceFailure(502, 'Invalid voice provider response.') from None
    except VoiceFailure:
        raise
    except (TimeoutError, httpx.TimeoutException):
        raise VoiceFailure(504, 'Voice provider request timed out.') from None
    except Exception:
        # No exception text, SDP, credentials, or upstream bodies in public errors.
        raise VoiceFailure(502, 'Voice provider request failed.') from None


@router.get('/config')
def config(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    try:
        _, _, duration = settings()
    except ValueError:
        duration = DURATION_SECONDS
    return {'status': 'configured' if configured() else 'unconfigured',
            'duration_seconds': duration}


@router.post('/sessions', response_model=VoiceSession, status_code=201)
async def sessions(request: Request, response: Response):
    # Read a bounded body before JSON/Pydantic parsing; error responses never echo
    # rejected inputs (FastAPI's default validation response includes input values).
    headers = {'Cache-Control': 'no-store'}
    if request.query_params:
        raise HTTPException(422, 'Invalid voice session request.', headers=headers)
    if request.headers.get('content-type', '').split(';')[0].strip().lower() != 'application/json':
        raise HTTPException(415, 'Voice session request must be JSON.', headers=headers)
    body = bytearray()
    try:
        async for chunk in request.stream():
            if len(body) + len(chunk) > MAX_REQUEST_BYTES:
                raise HTTPException(413, 'Voice session request is too large.', headers=headers)
            body.extend(chunk)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, 'Invalid voice session request.', headers=headers) from None
    try:
        value = VoiceOffer.model_validate_json(bytes(body))
        offer = validate_sdp(value.sdp_offer)
    except (ValidationError, ValueError, TypeError, UnicodeError, RecursionError):
        raise HTTPException(422, 'Invalid voice session request.', headers=headers) from None
    try:
        token = request.headers.get('x-voice-attempt-id') or str(uuid.uuid4())
        attempt = voice_cleanup.begin(token)
    except voice_cleanup.AttemptConflict as error:
        raise HTTPException(409, str(error), headers=headers) from None
    # Do not abandon a possibly billable creation if the browser request exits.
    creation = asyncio.create_task(create_session(offer))
    try:
        result = await asyncio.shield(creation)
        if await request.is_disconnected():
            attempt.cancelled = True
        await voice_cleanup.finish_creation(attempt, result)
    except VoiceFailure as error:
        raise HTTPException(error.status, error.detail, headers=headers) from None
    except asyncio.CancelledError:
        voice_cleanup.finish_after_disconnect(attempt, creation)
        raise
    if attempt.cancelled:
        raise HTTPException(409, 'Voice attempt ended.', headers=headers)
    response.headers['Cache-Control'] = 'no-store'
    return result


@router.post('/attempts/{token}/end')
async def end_attempt(token: str, response: Response):
    try:
        status = await voice_cleanup.end(token)
    except voice_cleanup.AttemptConflict as error:
        raise HTTPException(409, str(error), headers={'Cache-Control': 'no-store'}) from None
    response.headers['Cache-Control'] = 'no-store'
    return {'status': status}
