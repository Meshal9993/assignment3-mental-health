"""Focused voice API checks. Every outbound HTTP operation uses MockTransport."""
import asyncio
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, AsyncMock

import httpx
from fastapi.testclient import TestClient

from . import db, voice, voice_cleanup
from .main import app

SDP = ('v=0\r\no=- 123 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
       'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n')
PROVIDER_BODY = {'session': {'id': 'live_fictional_123'},
                 'transport': {'type': 'webrtc', 'sdp': SDP}}
REAL_CLIENT_FACTORY = voice.provider_client


class VoiceChecks(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.old_path, db.DB_PATH = db.DB_PATH, Path(self.folder.name) / 'voice.sqlite3'
        self.environment = patch.dict(os.environ, {
            'OPENAI_API_KEY': 'fictional-server-secret', 'VOICE_ENABLED': 'true',
            'LIVE_CALL_LIMIT': '50', 'MODEL_MODE': 'mock',
            'VOICE_LIVE_MODEL': 'gpt-live-1', 'VOICE_MAX_SESSION_SECONDS': '60',
            'VOICE_BACKEND_MODEL': 'gpt-6-luna',
            # These must not override the code-owned model or provider URL.
            'OPENAI_MODEL': 'browser-must-not-see-this',
            'VOICE_PROVIDER_URL': 'https://untrusted.invalid',
        })
        self.environment.start()
        self.registry = patch.object(voice_cleanup, 'attempts', {})
        self.registry.start()
        self.closer = AsyncMock(return_value=True)
        self.close_patch = patch.object(voice_cleanup, 'close_provider', self.closer)
        self.close_patch.start()
        self.requests = []
        self.reply = lambda request: httpx.Response(201, json=PROVIDER_BODY)

        async def handler(request):
            self.requests.append(request)
            result = self.reply(request)
            return await result if hasattr(result, '__await__') else result

        # All requests, including negative cases, are intercepted at HTTP transport.
        self.factory = patch.object(voice, 'provider_client', lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(handler), follow_redirects=False))
        self.factory.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.factory.stop()
        self.close_patch.stop()
        self.registry.stop()
        self.environment.stop()
        db.DB_PATH = self.old_path
        self.folder.cleanup()

    def post(self, **extra):
        return self.client.post('/api/voice/sessions', json={'sdp_offer': SDP, **extra})

    def assert_sanitized(self, response):
        for secret in ('fictional-server-secret', 'upstream-sensitive', 'untrusted.invalid', SDP):
            self.assertNotIn(secret, response.text)
        self.assertEqual(response.headers['cache-control'], 'no-store')

    def test_config_reports_only_status_and_duration(self):
        response = self.client.get('/api/voice/config')
        self.assertEqual(response.json(), {'status': 'configured', 'duration_seconds': 60})
        self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_server_duration_setting_is_used_without_exposing_models(self):
        with patch.dict(os.environ, {'VOICE_MAX_SESSION_SECONDS': '300',
                                     'VOICE_BACKEND_MODEL': 'gpt-6-luna'}):
            self.assertEqual(self.client.get('/api/voice/config').json(),
                             {'status': 'configured', 'duration_seconds': 300})
            response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['duration_seconds'], 300)
        payload = json.loads(self.requests[0].content)
        self.assertEqual(payload['session']['delegation']['responses']['model'], 'gpt-6-luna')
        self.assertNotIn('gpt-live-1', response.text)
        self.assertNotIn('gpt-6-luna', response.text)

    def test_backend_model_is_read_only_from_server_environment(self):
        with patch.dict(os.environ, {'VOICE_BACKEND_MODEL': 'gpt-6-sol'}):
            response = self.post()
        self.assertEqual(response.status_code, 201)
        payload = json.loads(self.requests[0].content)
        backend = payload['session']['delegation']['responses']
        self.assertEqual(backend['model'], 'gpt-6-sol')
        self.assertEqual(backend['tools'], [])
        self.assertEqual(backend['tool_choice'], 'none')
        self.assertNotIn(voice.LIVE_INSTRUCTIONS, response.text)
        self.assertNotIn(voice.BACKEND_INSTRUCTIONS, response.text)
        self.assertNotIn('gpt-6-sol', response.text)

    def test_voice_setup_does_not_save_audio_or_transcripts(self):
        self.reply = lambda request: httpx.Response(201, json={**PROVIDER_BODY,
            'audio': 'fictional-audio-not-for-storage',
            'transcript': 'fictional-transcript-not-for-storage'})
        response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertNotIn('fictional-audio-not-for-storage', response.text)
        self.assertNotIn('fictional-transcript-not-for-storage', response.text)
        with db.connect() as conn:
            self.assertEqual(conn.execute('SELECT count(*) FROM messages').fetchone()[0], 0)
            self.assertEqual(conn.execute('SELECT count(*) FROM sessions').fetchone()[0], 0)
            self.assertEqual(conn.execute('SELECT count(*) FROM conversations').fetchone()[0], 0)
            self.assertEqual(conn.execute('SELECT count(*) FROM model_calls').fetchone()[0], 1)

    def test_invalid_server_settings_disable_voice(self):
        for values in ({'VOICE_MAX_SESSION_SECONDS': '0'},
                       {'VOICE_MAX_SESSION_SECONDS': '301'},
                       {'VOICE_MAX_SESSION_SECONDS': 'invalid'},
                       {'VOICE_LIVE_MODEL': 'unsupported'},
                       {'VOICE_BACKEND_MODEL': ''},
                       {'VOICE_BACKEND_MODEL': 'https://untrusted.invalid'},
                       {'VOICE_BACKEND_MODEL': 'bad\nmodel'}):
            with self.subTest(setting=tuple(values)), patch.dict(os.environ, values):
                self.assertEqual(self.client.get('/api/voice/config').json()['status'], 'unconfigured')
                self.assertEqual(self.post().status_code, 503)
        self.assertEqual(self.requests, [])

    def test_missing_or_disabled_configuration_never_calls_provider(self):
        for configuration in ({'OPENAI_API_KEY': ''}, {'OPENAI_API_KEY': '   '},
                              {'VOICE_ENABLED': 'false'}, {'VOICE_ENABLED': ''}):
            with self.subTest(configuration=tuple(configuration)), patch.dict(os.environ, configuration):
                self.assertEqual(self.client.get('/api/voice/config').json()['status'], 'unconfigured')
                response = self.post()
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json(), {'detail': 'Voice is not configured.'})
                self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_valid_session_uses_only_server_policy_and_returns_projection(self):
        self.reply = lambda request: httpx.Response(201, json={
            **PROVIDER_BODY, 'secret': 'upstream-sensitive',
            'session': {**PROVIDER_BODY['session'], 'api_key': 'upstream-sensitive'},
        })
        response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {'session_id': 'live_fictional_123',
                                          'sdp_answer': SDP, 'duration_seconds': 60})
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertNotIn('upstream-sensitive', response.text)
        self.assertEqual(len(self.requests), 1)
        request = self.requests[0]
        self.assertEqual(str(request.url), 'https://api.openai.com/v1/live/sessions')
        self.assertEqual(request.method, 'POST')
        self.assertEqual(request.headers['authorization'], 'Bearer fictional-server-secret')
        payload = json.loads(request.content)
        self.assertEqual(set(payload), {'session', 'transport'})
        self.assertEqual(payload['transport'], {'type': 'webrtc', 'sdp': SDP})
        self.assertEqual(payload['session'], {
            'model': 'gpt-live-1', 'instructions': voice.LIVE_INSTRUCTIONS, 'store': False,
            'delegation': {'type': 'responses', 'responses': {
                'model': 'gpt-6-luna', 'instructions': voice.BACKEND_INSTRUCTIONS,
                'tools': [], 'tool_choice': 'none', 'parallel_tool_calls': False,
                'max_output_tokens': 400,
            }}, 'triggers': [],
            'client': {'data_channel': {
                'allowed_client_events': ['session.close'],
                'allowed_server_events': [{'type': 'session.started'}, {'type': 'session.closed'}],
            }},
        })
        with db.connect() as conn:
            self.assertEqual(conn.execute('SELECT purpose FROM model_calls').fetchone()[0], 'voice_session')

    def test_browser_policy_and_unneeded_identity_fields_are_rejected(self):
        for field in ('model', 'api_key', 'instructions', 'tools', 'store', 'provider_url',
                      'duration_seconds', 'session', 'transport', 'client', 'policy',
                      'allowed_client_events', 'owner_id', 'profile_id', 'conversation_id',
                      'backend_model', 'live_instructions', 'backend_instructions', 'delegation'):
            with self.subTest(field=field):
                response = self.post(**{field: 'upstream-sensitive'})
                self.assertEqual(response.status_code, 422)
                self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_query_configuration_is_rejected(self):
        response = self.client.post('/api/voice/sessions?model=upstream-sensitive', json={'sdp_offer': SDP})
        self.assertEqual(response.status_code, 422)
        self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_invalid_sdp_never_calls_provider(self):
        for value in ('', 'upstream-sensitive', SDP.replace('v=0', 'v=1'),
                      SDP.replace('m=audio ', 'm=video '), SDP + '\x00', SDP + '\rbroken',
                      None, 123, {'value': SDP}):
            with self.subTest(kind=type(value).__name__):
                response = self.client.post('/api/voice/sessions', json={'sdp_offer': value})
                self.assertEqual(response.status_code, 422)
                self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_oversized_sdp_and_multibyte_sdp_are_rejected(self):
        for value in (SDP + 'a=' + 'x' * voice.MAX_SDP_BYTES,
                      SDP + 'a=' + '\u00e9' * (voice.MAX_SDP_BYTES // 2)):
            response = self.client.post('/api/voice/sessions', content=json.dumps(
                {'sdp_offer': value}, ensure_ascii=False).encode(), headers={'Content-Type': 'application/json'})
            self.assertEqual(response.status_code, 422)
            self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_body_limit_applies_without_content_length(self):
        response = self.client.post('/api/voice/sessions',
            content=iter([b'{"sdp_offer":"', b'x' * voice.MAX_REQUEST_BYTES, b'"}']),
            headers={'Content-Type': 'application/json'})
        self.assertEqual(response.status_code, 413)
        self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_invalid_json_and_content_type_are_sanitized(self):
        for body in (b'{"sdp_offer": upstream-sensitive}', b'null', b'[]', b'{}',
                     b'{"sdp_offer":"\\ud800"}', b'\xff'):
            response = self.client.post('/api/voice/sessions', content=body,
                                        headers={'Content-Type': 'application/json'})
            self.assertEqual(response.status_code, 422)
            self.assert_sanitized(response)
        response = self.client.post('/api/voice/sessions', content=SDP)
        self.assertEqual(response.status_code, 415)
        self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_provider_http_errors_and_redirects_are_not_retried_or_exposed(self):
        for status in (200, 302, 401, 429, 500):
            with self.subTest(status=status):
                self.requests.clear()
                self.reply = lambda request: httpx.Response(status, text='upstream-sensitive',
                    headers={'Location': 'https://untrusted.invalid'})
                response = self.post()
                self.assertEqual(response.status_code, 502)
                self.assert_sanitized(response)
                self.assertEqual(len(self.requests), 1)

    def test_provider_network_error_is_sanitized(self):
        def fail(request):
            raise httpx.ConnectError('upstream-sensitive fictional-server-secret')
        self.reply = fail
        response = self.post()
        self.assertEqual(response.status_code, 502)
        self.assert_sanitized(response)
        self.assertEqual(len(self.requests), 1)

    def test_timeout_is_finite_and_not_retried(self):
        async def slow(request):
            await asyncio.sleep(0.05)
            return httpx.Response(201, json=PROVIDER_BODY)
        self.reply = slow
        with patch.object(voice, 'REQUEST_TIMEOUT_SECONDS', 0.001):
            response = self.post()
        self.assertEqual(response.status_code, 504)
        self.assert_sanitized(response)
        self.assertEqual(len(self.requests), 1)

    def test_provider_phase_timeout_is_sanitized(self):
        def fail(request):
            raise httpx.ReadTimeout('upstream-sensitive')
        self.reply = fail
        self.assertEqual(self.post().status_code, 504)
        self.assertEqual(len(self.requests), 1)

    def test_malformed_provider_responses_are_rejected(self):
        invalid = [None, [], {}, {'session': {}, 'transport': PROVIDER_BODY['transport']},
                   {**PROVIDER_BODY, 'session': {'id': 123}},
                   {**PROVIDER_BODY, 'session': {'id': ''}},
                   {**PROVIDER_BODY, 'session': {'id': 'x' * 257}},
                   {**PROVIDER_BODY, 'session': {'id': 'bad\nupstream-sensitive'}},
                   {**PROVIDER_BODY, 'transport': {'type': 'sip', 'sdp': SDP}},
                   {**PROVIDER_BODY, 'transport': {'type': 'webrtc', 'sdp': ''}},
                   {**PROVIDER_BODY, 'transport': {'type': 'webrtc', 'sdp': 42}},
                   {**PROVIDER_BODY, 'transport': {'type': 'webrtc', 'sdp': SDP + 'a=' + 'x'*voice.MAX_SDP_BYTES}}]
        for body in invalid:
            with self.subTest(kind=type(body).__name__):
                self.reply = lambda request: httpx.Response(201, json=body)
                response = self.post()
                self.assertEqual(response.status_code, 502)
                self.assert_sanitized(response)

    def test_non_json_and_oversized_provider_responses_are_rejected(self):
        for body in (b'upstream-sensitive', b'\xff', b'x' * (voice.MAX_PROVIDER_BYTES + 1)):
            self.reply = lambda request: httpx.Response(201, content=body)
            response = self.post()
            self.assertEqual(response.status_code, 502)
            self.assert_sanitized(response)

    def test_budget_exhaustion_never_calls_provider(self):
        with patch.dict(os.environ, {'LIVE_CALL_LIMIT': '0'}):
            response = self.post()
        self.assertEqual(response.status_code, 503)
        self.assert_sanitized(response)
        self.assertEqual(self.requests, [])

    def test_failed_attempt_still_reserves_shared_budget(self):
        self.reply = lambda request: httpx.Response(500, text='upstream-sensitive')
        with patch.dict(os.environ, {'LIVE_CALL_LIMIT': '1'}):
            self.assertEqual(self.post().status_code, 502)
            self.assertEqual(self.post().status_code, 503)
        self.assertEqual(len(self.requests), 1)

    def test_real_client_factory_has_explicit_safe_transport_settings(self):
        # Inspect construction only. Neither object is used to open a connection.
        with patch.object(voice.httpx, 'AsyncHTTPTransport') as transport, \
             patch.object(voice.httpx, 'AsyncClient') as client:
            REAL_CLIENT_FACTORY()
        transport.assert_called_once_with(retries=0)
        kwargs = client.call_args.kwargs
        self.assertFalse(kwargs['follow_redirects'])
        self.assertFalse(kwargs['trust_env'])
        self.assertEqual(kwargs['timeout'].connect, 3.0)
        self.assertEqual(kwargs['timeout'].read, 10.0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
