"""Ephemeral cancellation metadata only. Never retain audio or transcripts."""
import asyncio
from dataclasses import dataclass, field
import json
import logging
import os
import time
import uuid

from websockets.asyncio.client import connect


class AttemptConflict(Exception):
    pass


@dataclass
class Attempt:
    claimed: bool = False
    cancelled: bool = False
    session_id: str | None = None
    close_task: asyncio.Task | None = None
    created: float = field(default_factory=time.monotonic)


attempts: dict[str, Attempt] = {}
background: set[asyncio.Task] = set()
CLOSE_SECONDS = 3


def lookup(token):
    try:
        if str(uuid.UUID(token)) != token:
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise AttemptConflict('Invalid voice attempt.') from None
    # Bound the process-local registry, including cancel-before-create tombstones.
    for key, entry in list(attempts.items()):
        if time.monotonic() - entry.created > 600 and (entry.close_task is None or entry.close_task.done()):
            del attempts[key]
    if token not in attempts:
        if len(attempts) >= 1024:
            raise AttemptConflict('Voice attempt limit reached.')
        attempts[token] = Attempt()
    return attempts[token]


def begin(token):
    entry = lookup(token)
    if entry.claimed or entry.cancelled:
        raise AttemptConflict('Voice attempt already ended or started.')
    entry.claimed = True
    return entry


def sideband(session_id):
    return connect(
        f'wss://api.openai.com/v1/live/sessions/{session_id}/attach',
        additional_headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'].strip()},
        proxy=None, open_timeout=2, close_timeout=0.25,
        max_size=128 * 1024, max_queue=4, compression=None,
        # Do not log frames: sideband may briefly receive reflected audio/text.
        logger=logging.Logger('voice-close', level=logging.CRITICAL),
    )


async def close_provider(session_id):
    try:
        async with asyncio.timeout(CLOSE_SECONDS):
            async with sideband(session_id) as socket:
                await socket.send(json.dumps({'type': 'session.close'}))
                while True:
                    message = await socket.recv()
                    if not isinstance(message, str):
                        continue
                    try:
                        event = json.loads(message)
                    except ValueError:
                        continue
                    if isinstance(event, dict) and event.get('type') == 'session.closed':
                        return True
    except Exception:
        return False


async def close_once(entry):
    if not entry.session_id:
        return 'pending'
    if entry.close_task is None:
        entry.close_task = asyncio.create_task(close_provider(entry.session_id))
    confirmed = await asyncio.shield(entry.close_task)
    return 'closed' if confirmed else 'unconfirmed'


async def end(token):
    entry = lookup(token)
    entry.cancelled = True
    return await close_once(entry)


async def finish_creation(entry, result):
    entry.session_id = result.session_id
    if entry.cancelled:
        await close_once(entry)


def finish_after_disconnect(entry, creation_task):
    entry.cancelled = True

    async def finish():
        try:
            result = await creation_task
            await finish_creation(entry, result)
        except Exception:
            pass
    task = asyncio.create_task(finish())
    background.add(task)
    task.add_done_callback(background.discard)
