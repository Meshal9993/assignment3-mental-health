import re
import uuid
from datetime import datetime
from . import db, model

# This is a routing heuristic, not detection of a person's state or a safety guarantee.
CRISIS = re.compile(r'\b(suicid\w*|self[ -]?harm|kill myself|end my life|hurt myself|crisis|overdose)\b', re.I)
CRISIS_REPLY = 'This prototype cannot provide crisis support, and nobody is monitoring it. Open Crisis / Support for independent resources.'
FALLBACK = 'The model request failed. You can still start the exercise or open Crisis / Support. Your submitted message was saved.'

def message(cid, rid, role, content, status, source):
    with db.connect() as conn:
        conn.execute('INSERT INTO messages VALUES(?,?,?,?,?,?,?,?)',
                     (str(uuid.uuid4()), cid, rid, role, content, db.now(), status, source))

async def chat(cid, question, simulate_failure=False):
    rid = str(uuid.uuid4())
    source = model.mode()
    message(cid, rid, 'user', question, 'pending', source)
    crisis = bool(CRISIS.search(question))
    try:
        if crisis:
            reply, source = CRISIS_REPLY, 'static_support'
        else:
            if simulate_failure:
                raise RuntimeError('Deliberate demonstration failure')
            sql = await model.propose(question)
            try:
                rows = db.retrieve(sql, cid)
            except ValueError:
                with db.connect() as conn:
                    conn.execute('INSERT INTO retrievals VALUES(?,?,?,?)', (rid, sql, 'rejected', 0))
                raise
            with db.connect() as conn:
                conn.execute('INSERT INTO retrievals VALUES(?,?,?,?)', (rid, sql, 'accepted', len(rows)))
            if source == 'live' and model.budget()['used'] >= model.budget()['limit']:
                source = 'mock_budget_limit'
            reply = await model.answer(question, rows)
        status = 'succeeded'
    except Exception:
        # Do not return credentials, provider bodies, or internal stack traces.
        reply, status, source = FALLBACK, 'failed', 'static_fallback'
    message(cid, rid, 'assistant', reply, status, source)
    with db.connect() as conn:
        conn.execute('UPDATE messages SET status=? WHERE request_id=? AND role=?', (status, rid, 'user'))
    return {'request_id': rid, 'content': reply, 'status': status, 'source': source, 'support_recommended': crisis}

def finish(sid, status, reason, client_duration_ms):
    with db.connect() as conn:
        row = conn.execute('SELECT * FROM sessions WHERE id=?', (sid,)).fetchone()
        if not row:
            return None
        if row['status'] != 'active':
            return dict(row)
        duration = max(0, round((datetime.fromisoformat(db.now()) - datetime.fromisoformat(row['start_time'])).total_seconds()*1000))
        # Independent wall/monotonic clocks and millisecond rounding need a small
        # tolerance. Vue still targets 60,000 ms; keep raw measurements as evidence.
        if status == 'completed' and (duration < 59500 or client_duration_ms < 59950):
            raise ValueError(f'Completion timing conflict: server={duration} ms, browser={client_duration_ms} ms')
        if status == 'completed' and (duration > 90000 or client_duration_ms > 90000):
            status, reason = 'interrupted', 'timing_gap'
        conn.execute('UPDATE sessions SET status=?,reason=?,end_time=?,duration_ms=?,client_duration_ms=? WHERE id=?',
                     (status, reason, db.now(), duration, client_duration_ms, sid))
        return dict(conn.execute('SELECT * FROM sessions WHERE id=?', (sid,)).fetchone())
