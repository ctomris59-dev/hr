# 5 Büyük Lig Toplu Veri Collector

Branch: `football-data-collector`
Klasör: `football_bulk_collector/`

## Varsayılan kapsam
- Premier League (39)
- La Liga (140)
- Serie A (135)
- Bundesliga (78)
- Ligue 1 (61)
- 2024/25 (`season=2024`)
- 2025/26 (`season=2025`)

## Toplanan veri
- `/leagues`: coverage kontrolü
- `/fixtures`: sezon fikstürü ve skorlar
- `/fixtures?ids=...`: 20 maça kadar toplu lineups, statistics, players, events
- `/injuries?league=...&season=...`: sakatlık + cezalar (`type=Injury/Suspension`, reason, fixture/team/player)
- `/players?league=...&season=...`: sezon oyuncu istatistikleri

Collector kaldığı yerden devam edecek şekilde tasarlanmıştır. Günlük API kotasına yaklaşınca durur; tekrar çalıştırıldığında tamamlanan aşamaları yeniden çekmez.

## Render mimarisi
API-Football -> Render Cron Job -> Render Postgres -> Export Web Service -> ZIP

Render job diski geçici olduğu için kalıcı veriler Postgres'e yazılır. Export servisi veritabanındaki veriyi tarayıcıdan ZIP olarak indirilebilir hale getirir.

## Gerçek maliyet
Bu kurulum terminal gerektirmez fakat tamamen ücretsiz değildir.

- Kalıcı Render Postgres: ücretli; kaynak durduğu sürece aylık ücret işler.
- Cron Job: kullanılan plan ve çalışma süresine göre ücretlenir.
- Export Web Service: free plan kullanılabilir.

Render fiyatları zamanla değişebilir; oluşturma ekranındaki güncel bedeli esas alın. Tarihsel veri çekimi tamamlandıktan, ZIP indirildikten ve doğrulandıktan sonra Postgres ve Cron kaynaklarını silersen sürekli aylık maliyeti durdurabilirsin.

## Render komutları
Collector build:
`cd football_bulk_collector && pip install -r requirements.txt`

Collector start:
`cd football_bulk_collector && python collector.py`

Export build:
`cd football_bulk_collector && pip install -r requirements.txt`

Export start:
`cd football_bulk_collector && uvicorn export_app:app --host 0.0.0.0 --port $PORT`

## Collector environment variables
- `API_FOOTBALL_KEY` = API-Football anahtarın
- `DATABASE_URL` = Render Postgres internal connection string
- `SEASONS` = `2024,2025`
- `DAILY_REQUEST_RESERVE` = `20`

## Export environment variables
- `DATABASE_URL` = Render Postgres internal connection string
- `DOWNLOAD_TOKEN` = uzun rastgele gizli değer

## Veri kontrolü
Export servisinde:
- `/health`
- `/status?token=DOWNLOAD_TOKEN`
- `/download?token=DOWNLOAD_TOKEN`

ZIP içinde şu tablolar bulunur:
- `league_coverage.jsonl`
- `fixtures.jsonl`
- `fixture_details.jsonl`
- `injuries.jsonl`
- `season_players.jsonl`
- `collection_runs.jsonl`
- `api_call_log.jsonl`
- `manifest.json`
