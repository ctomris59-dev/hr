#!/usr/bin/env python3
import json, os, tempfile, zipfile
from datetime import datetime, timezone
import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

DB=os.environ.get('DATABASE_URL','').strip()
TOKEN=os.environ.get('DOWNLOAD_TOKEN','').strip()
TABLES=['league_coverage','fixtures','fixture_details','injuries','season_players','collection_runs','api_call_log']
app=FastAPI(title='Football Dataset Export')

def auth(token):
    if not TOKEN: raise HTTPException(500,'DOWNLOAD_TOKEN missing')
    if token!=TOKEN: raise HTTPException(401,'Invalid token')

def clean(path):
    try: os.remove(path)
    except OSError: pass

@app.get('/health')
def health(): return {'ok':True}

@app.get('/status')
def status(token:str=Query(...)):
    auth(token); out={}
    with psycopg.connect(DB) as c:
        for t in TABLES:
            out[t]=c.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        last=c.execute('SELECT run_id::text,started_at,finished_at,status,api_calls,message FROM collection_runs ORDER BY started_at DESC LIMIT 1').fetchone()
    return {'counts':out,'last_run':list(last) if last else None,'generated_at':datetime.now(timezone.utc).isoformat()}

@app.get('/download')
def download(token:str=Query(...)):
    auth(token)
    f=tempfile.NamedTemporaryFile(prefix='football_big5_',suffix='.zip',delete=False); path=f.name; f.close()
    manifest={'generated_at':datetime.now(timezone.utc).isoformat(),'format':'JSON Lines','tables':{}}
    with psycopg.connect(DB) as c, zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        for t in TABLES:
            cur=c.cursor(name=f'exp_{t}'); cur.execute(f'SELECT * FROM {t}'); cols=[d.name for d in cur.description]; n=0
            with z.open(f'{t}.jsonl','w') as o:
                for row in cur:
                    obj=dict(zip(cols,row)); o.write((json.dumps(obj,ensure_ascii=False,default=str)+'\n').encode()); n+=1
            manifest['tables'][t]={'rows':n}
        z.writestr('manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    return FileResponse(path,media_type='application/zip',filename='football_big5_dataset.zip',background=BackgroundTask(clean,path))
