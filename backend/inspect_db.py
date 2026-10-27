"""Read-only, reproducible inspection of fictional demonstration records."""
import json
from . import db

with db.connect(readonly=True) as conn:
    result = {}
    for table in ('sessions','messages','retrievals','preferences','model_calls'):
        result[table] = [dict(row) for row in conn.execute(f'SELECT * FROM {table}')]
    print(json.dumps(result, indent=2, ensure_ascii=False))
