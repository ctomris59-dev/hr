#!/usr/bin/env python3
from __future__ import annotations
import hashlib, os, sys, time, uuid
from datetime import datetime, timezone
import requests, psycopg
from psycopg.types.json import Jsonb

BASE="https://v3.football.api-sports.io"
KEY=os.environ.get("API_FOOTBALL_KEY","").strip()
DB=os.environ.get("DATABASE_URL","").strip()
SEASONS=[int(x) for x in os.getenv("SEASONS","2024,2025").split(",")]
LEAGUES=[(39,"Premier League"),(140,"La Liga"),(135,"Serie A"),(78,"Bundesliga"),(61,"Ligue 1")]
RESERVE=int(os.getenv("DAILY_REQUEST_RESERVE","20"))
FINISHED={"FT","AET","PEN"}
S=requests.Session()
if KEY: S.headers.update({"x-apisports-key":KEY})

SCHEMA="""
CREATE TABLE IF NOT EXISTS collection_state(k text primary key,meta jsonb,done_at timestamptz default now());
CREATE TABLE IF NOT EXISTS collection_runs(run_id uuid primary key,started_at timestamptz,finished_at timestamptz,status text,api_calls int default 0,message text);
CREATE TABLE IF NOT EXISTS league_coverage(league_id int,league_name text,season int,coverage jsonb,raw jsonb,primary key(league_id,season));
CREATE TABLE IF NOT EXISTS fixtures(fixture_id bigint primary key,league_id int,league_name text,season int,fixture_date timestamptz,status text,home_team_id bigint,home_team text,away_team_id bigint,away_team text,home_goals int,away_goals int,raw jsonb);
CREATE INDEX IF NOT EXISTS fixtures_ls ON fixtures(league_id,season);
CREATE TABLE IF NOT EXISTS fixture_details(fixture_id bigint primary key,lineups jsonb,statistics jsonb,players jsonb,events jsonb,raw jsonb);
CREATE TABLE IF NOT EXISTS injuries(injury_key text primary key,league_id int,league_name text,season int,fixture_id bigint,fixture_date timestamptz,team_id bigint,team_name text,player_id bigint,player_name text,absence_type text,reason text,raw jsonb);
CREATE INDEX IF NOT EXISTS injuries_ls ON injuries(league_id,season);
CREATE INDEX IF NOT EXISTS injuries_fixture ON injuries(fixture_id);
CREATE TABLE IF NOT EXISTS season_players(league_id int,season int,player_id bigint,player_name text,raw jsonb,primary key(league_id,season,player_id));
CREATE TABLE IF NOT EXISTS api_call_log(id bigserial primary key,called_at timestamptz default now(),endpoint text,params jsonb,http_status int,results int,daily_remaining int,error text);
"""

def utcnow(): return datetime.now(timezone.utc)
def chunks(a,n=20):
    for i in range(0,len(a),n): yield a[i:i+n]
class QuotaStop(Exception): pass

class Collector:
    def __init__(self):
        if not KEY: raise SystemExit("API_FOOTBALL_KEY missing")
        if not DB: raise SystemExit("DATABASE_URL missing")
        self.db=psycopg.connect(DB,autocommit=True); self.db.execute(SCHEMA)
        self.calls=0; self.run_id=uuid.uuid4()
        self.db.execute("insert into collection_runs(run_id,started_at,status) values(%s,%s,'running')",(self.run_id,utcnow()))
    def done(self,k): return bool(self.db.execute("select 1 from collection_state where k=%s",(k,)).fetchone())
    def mark(self,k,meta=None): self.db.execute("insert into collection_state(k,meta) values(%s,%s) on conflict(k) do update set meta=excluded.meta,done_at=now()",(k,Jsonb(meta or {})))
    def api(self,endpoint,params):
        last=None
        for attempt in range(5):
            try:
                time.sleep(.3); r=S.get(f"{BASE}/{endpoint}",params=params,timeout=45); self.calls+=1
                rem=r.headers.get("x-ratelimit-requests-remaining")
                try: rem=int(rem) if rem is not None else None
                except: rem=None
                try: d=r.json()
                except: d={}
                errs=d.get("errors"); err=(r.text[:500] if not r.ok else (str(errs) if errs not in ({},[],None) else None))
                self.db.execute("insert into api_call_log(endpoint,params,http_status,results,daily_remaining,error) values(%s,%s,%s,%s,%s,%s)",(endpoint,Jsonb(params),r.status_code,d.get("results") if isinstance(d.get("results"),int) else None,rem,err))
                if rem is not None and rem<=RESERVE: raise QuotaStop(f"Daily quota reserve reached: {rem} remaining")
                if r.status_code==429: time.sleep(65); continue
                r.raise_for_status()
                if errs not in ({},[],None): raise RuntimeError(str(errs))
                return d
            except QuotaStop: raise
            except Exception as e:
                last=e
                if attempt==4: raise
                time.sleep(min(30,3*(2**attempt)))
        raise last
    def coverage(self,lid,lname,season):
        k=f"coverage:{lid}:{season}"
        if not self.done(k):
            d=self.api("leagues",{"id":lid,"season":season}); cov={}
            if d.get("response"):
                ss=d["response"][0].get("seasons",[]); m=next((x for x in ss if x.get("year")==season),None); cov=(m or {}).get("coverage") or {}
            self.db.execute("insert into league_coverage values(%s,%s,%s,%s,%s) on conflict(league_id,season) do update set coverage=excluded.coverage,raw=excluded.raw",(lid,lname,season,Jsonb(cov),Jsonb(d))); self.mark(k,{"coverage":cov})
        row=self.db.execute("select coverage from league_coverage where league_id=%s and season=%s",(lid,season)).fetchone(); return row[0] if row else {}
    def fixture_list(self,lid,lname,season):
        k=f"fixtures:{lid}:{season}"
        if not self.done(k):
            d=self.api("fixtures",{"league":lid,"season":season})
            for x in d.get("response",[]):
                f=x.get("fixture") or {}; t=x.get("teams") or {}; g=x.get("goals") or {}; fid=f.get("id")
                if not fid: continue
                self.db.execute("""insert into fixtures values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) on conflict(fixture_id) do update set raw=excluded.raw,status=excluded.status,home_goals=excluded.home_goals,away_goals=excluded.away_goals""",(fid,lid,lname,season,f.get("date"),(f.get("status") or {}).get("short"),(t.get("home") or {}).get("id"),(t.get("home") or {}).get("name"),(t.get("away") or {}).get("id"),(t.get("away") or {}).get("name"),g.get("home"),g.get("away"),Jsonb(x)))
            self.mark(k,{"results":d.get("results")})
        rows=self.db.execute("select fixture_id from fixtures where league_id=%s and season=%s and status=any(%s) order by fixture_date",(lid,season,list(FINISHED))).fetchall(); return [r[0] for r in rows]
    def injuries(self,lid,lname,season,cov):
        k=f"injuries:{lid}:{season}"
        if self.done(k): return
        if not (cov or {}).get("injuries"):
            self.mark(k,{"skipped":"coverage.injuries=false"}); return
        d=self.api("injuries",{"league":lid,"season":season}); n=0
        for x in d.get("response",[]):
            f=x.get("fixture") or {}; t=x.get("team") or {}; p=x.get("player") or {}
            raw="|".join(str(v or "") for v in (lid,season,f.get("id"),t.get("id"),p.get("id"),x.get("type"),x.get("reason"),f.get("date")))
            ik=hashlib.sha256(raw.encode()).hexdigest()
            self.db.execute("""insert into injuries values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) on conflict(injury_key) do update set absence_type=excluded.absence_type,reason=excluded.reason,raw=excluded.raw""",(ik,lid,lname,season,f.get("id"),f.get("date"),t.get("id"),t.get("name"),p.get("id"),p.get("name"),x.get("type"),x.get("reason"),Jsonb(x))); n+=1
        self.mark(k,{"results":d.get("results"),"stored":n})
    def details(self,lid,season,ids):
        missing=[fid for fid in ids if not self.db.execute("select 1 from fixture_details where fixture_id=%s",(fid,)).fetchone()]
        for batch in chunks(missing):
            k=f"detail:{lid}:{season}:"+"-".join(map(str,batch))
            if self.done(k): continue
            d=self.api("fixtures",{"ids":"-".join(map(str,batch))}); returned=[]
            for x in d.get("response",[]):
                fid=(x.get("fixture") or {}).get("id")
                if not fid: continue
                self.db.execute("""insert into fixture_details values(%s,%s,%s,%s,%s,%s) on conflict(fixture_id) do update set lineups=excluded.lineups,statistics=excluded.statistics,players=excluded.players,events=excluded.events,raw=excluded.raw""",(fid,Jsonb(x.get("lineups")),Jsonb(x.get("statistics")),Jsonb(x.get("players")),Jsonb(x.get("events")),Jsonb(x))); returned.append(fid)
            self.mark(k,{"returned":returned})
    def season_players(self,lid,lname,season):
        page=1
        while True:
            k=f"players:{lid}:{season}:{page}"
            if self.done(k):
                meta=self.db.execute("select meta from collection_state where k=%s",(k,)).fetchone()[0] or {}; total=int(meta.get("total",page))
                if page>=total: break
                page+=1; continue
            d=self.api("players",{"league":lid,"season":season,"page":page})
            for x in d.get("response",[]):
                p=x.get("player") or {}; pid=p.get("id")
                if pid: self.db.execute("insert into season_players values(%s,%s,%s,%s,%s) on conflict(league_id,season,player_id) do update set raw=excluded.raw,player_name=excluded.player_name",(lid,season,pid,p.get("name"),Jsonb(x)))
            pg=d.get("paging") or {}; cur=int(pg.get("current") or page); total=int(pg.get("total") or cur); self.mark(k,{"total":total,"results":d.get("results")})
            if cur>=total: break
            page=cur+1
    def finish(self,status,msg): self.db.execute("update collection_runs set finished_at=%s,status=%s,api_calls=%s,message=%s where run_id=%s",(utcnow(),status,self.calls,msg,self.run_id))
    def run(self):
        try:
            fm={}; covs={}
            for season in SEASONS:
                for lid,lname in LEAGUES:
                    covs[(lid,season)]=self.coverage(lid,lname,season); fm[(lid,season)]=self.fixture_list(lid,lname,season)
            for season in SEASONS:
                for lid,lname in LEAGUES: self.injuries(lid,lname,season,covs[(lid,season)])
            for season in SEASONS:
                for lid,lname in LEAGUES: self.details(lid,season,fm[(lid,season)])
            for season in SEASONS:
                for lid,lname in LEAGUES: self.season_players(lid,lname,season)
            self.finish("success","completed")
        except QuotaStop as e:
            self.finish("paused_quota",str(e)); sys.exit(0)
        except Exception as e:
            self.finish("failed",str(e)); raise

if __name__=="__main__":
    c=Collector()
    try: c.run()
    finally: c.db.close()
