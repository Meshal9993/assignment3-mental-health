"""Focused cancellation races and sideband closure: all providers are fakes."""
import asyncio
import json
import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from . import db, voice, voice_cleanup
from .main import app
from .test_voice import SDP


class CancellationChecks(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.original, db.DB_PATH = db.DB_PATH, Path(self.folder.name) / 'test.sqlite3'
        self.registry = patch.object(voice_cleanup, 'attempts', {})
        self.registry.start()
        self.result = voice.VoiceSession(session_id='live_fictional_cleanup', sdp_answer=SDP, duration_seconds=300)
        self.create = AsyncMock(return_value=self.result)
        self.provider = patch.object(voice, 'create_session', self.create)
        self.provider.start()
        self.close = AsyncMock(return_value=True)
        self.closer = patch.object(voice_cleanup, 'close_provider', self.close)
        self.closer.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.closer.stop(); self.provider.stop(); self.registry.stop()
        db.DB_PATH = self.original
        self.folder.cleanup()

    def test_duplicate_creation_and_repeated_end_are_idempotent(self):
        token = str(uuid.uuid4())
        request = lambda: self.client.post('/api/voice/sessions', json={'sdp_offer': SDP}, headers={'X-Voice-Attempt-ID': token})
        self.assertEqual(request().status_code, 201)
        self.assertEqual(request().status_code, 409)
        self.create.assert_awaited_once()
        for _ in range(2):
            response = self.client.post(f'/api/voice/attempts/{token}/end')
            self.assertEqual(response.json(), {'status': 'closed'})
        self.close.assert_awaited_once_with('live_fictional_cleanup')

    def test_cancel_before_create_prevents_a_provider_session(self):
        token = str(uuid.uuid4())
        self.assertEqual(self.client.post(f'/api/voice/attempts/{token}/end').json(), {'status': 'pending'})
        response = self.client.post('/api/voice/sessions', json={'sdp_offer': SDP}, headers={'X-Voice-Attempt-ID': token})
        self.assertEqual(response.status_code, 409)
        self.create.assert_not_awaited(); self.close.assert_not_awaited()

    def test_late_created_session_is_closed_after_end_without_returning_sdp(self):
        async def scenario():
            entered, release = asyncio.Event(), asyncio.Event()
            async def delayed(offer):
                entered.set(); await release.wait(); return self.result
            self.create.side_effect = delayed
            token = str(uuid.uuid4())
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url='http://test') as client:
                creation = asyncio.create_task(client.post('/api/voice/sessions', json={'sdp_offer': SDP}, headers={'X-Voice-Attempt-ID': token}))
                await entered.wait()
                self.assertEqual((await client.post(f'/api/voice/attempts/{token}/end')).json(), {'status': 'pending'})
                release.set()
                result = await creation
                self.assertEqual(result.status_code, 409)
                self.assertNotIn('sdp_answer', result.text)
                self.assertEqual((await client.post(f'/api/voice/attempts/{token}/end')).json(), {'status': 'closed'})
        asyncio.run(scenario())
        self.close.assert_awaited_once_with('live_fictional_cleanup')

    def test_disconnected_creation_still_closes_when_provider_finishes(self):
        async def scenario():
            token = str(uuid.uuid4())
            entry = voice_cleanup.begin(token)
            future = asyncio.get_running_loop().create_future()
            voice_cleanup.finish_after_disconnect(entry, future)
            future.set_result(self.result)
            await asyncio.gather(*list(voice_cleanup.background))
            self.assertTrue(entry.cancelled)
            self.assertEqual(await voice_cleanup.close_once(entry), 'closed')
        asyncio.run(scenario())
        self.close.assert_awaited_once()

    def test_aborted_http_request_keeps_creation_observed_for_cleanup(self):
        async def scenario():
            entered, release = asyncio.Event(), asyncio.Event()
            async def delayed(offer):
                entered.set(); await release.wait(); return self.result
            self.create.side_effect = delayed
            token = str(uuid.uuid4())
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url='http://test') as client:
                request = asyncio.create_task(client.post('/api/voice/sessions', json={'sdp_offer': SDP}, headers={'X-Voice-Attempt-ID': token}))
                await entered.wait(); request.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await request
                release.set()
                await asyncio.gather(*list(voice_cleanup.background))
                self.assertTrue(voice_cleanup.attempts[token].cancelled)
        asyncio.run(scenario())
        self.close.assert_awaited_once_with('live_fictional_cleanup')

    def test_close_failure_is_unconfirmed_and_not_retried(self):
        self.close.return_value = False
        token = str(uuid.uuid4())
        self.client.post('/api/voice/sessions', json={'sdp_offer': SDP}, headers={'X-Voice-Attempt-ID': token})
        for _ in range(2):
            self.assertEqual(self.client.post(f'/api/voice/attempts/{token}/end').json(), {'status': 'unconfirmed'})
        self.close.assert_awaited_once()

    def test_invalid_attempt_ids_never_reach_a_provider(self):
        for token in ('bad', 'not-a-uuid'):
            self.assertEqual(self.client.post(f'/api/voice/attempts/{token}/end').status_code, 409)
            self.assertEqual(self.client.post('/api/voice/sessions', json={'sdp_offer': SDP}, headers={'X-Voice-Attempt-ID': token}).status_code, 409)
        self.create.assert_not_awaited(); self.close.assert_not_awaited()


class SidebandChecks(unittest.TestCase):
    def test_only_close_is_sent_and_media_events_are_not_saved(self):
        sent, opened = [], []
        class Socket:
            async def __aenter__(self): opened.append(True); return self
            async def __aexit__(self, *args): opened.append(False)
            async def send(self, value): sent.append(json.loads(value))
            async def recv(self):
                return json.dumps(events.pop(0))
        events = [{'type': 'session.input_audio.append', 'audio': 'fictional-audio'},
                  {'type': 'session.input_transcript.delta', 'delta': 'fictional-transcript'},
                  {'type': 'session.closed'}]
        with patch.object(voice_cleanup, 'sideband', return_value=Socket()) as connector:
            self.assertTrue(asyncio.run(voice_cleanup.close_provider('live_fictional')))
        connector.assert_called_once_with('live_fictional')
        self.assertEqual(sent, [{'type': 'session.close'}])
        self.assertEqual(opened, [True, False])

    def test_sideband_deadline_and_errors_report_unconfirmed(self):
        class Socket:
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def send(self, value): pass
            async def recv(self): await asyncio.sleep(10)
        with patch.object(voice_cleanup, 'sideband', return_value=Socket()), patch.object(voice_cleanup, 'CLOSE_SECONDS', 0.001):
            self.assertFalse(asyncio.run(voice_cleanup.close_provider('live_fictional')))
        with patch.object(voice_cleanup, 'sideband', side_effect=RuntimeError('private provider error')):
            self.assertFalse(asyncio.run(voice_cleanup.close_provider('live_fictional')))

    def test_sideband_credentials_stay_server_owned(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'fictional-key'}), patch.object(voice_cleanup, 'connect') as connector:
            voice_cleanup.sideband('live_fictional')
        args, kwargs = connector.call_args
        self.assertEqual(args[0], 'wss://api.openai.com/v1/live/sessions/live_fictional/attach')
        self.assertEqual(kwargs['additional_headers'], {'Authorization': 'Bearer fictional-key'})
        self.assertIsNone(kwargs['proxy'])
        self.assertEqual(kwargs['open_timeout'], 2)


if __name__ == '__main__': unittest.main(verbosity=2)
