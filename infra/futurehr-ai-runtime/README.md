# FutureHR Local AI Runtime

FutureHR artık local-first inference zincirini destekler:

1. `futurehr_local`
2. `groq`
3. `openai`
4. deterministic FutureHR rules/guardrails

## Runtime

Bu klasördeki `docker-compose.yml`, OpenAI-compatible bir vLLM endpoint'i açmak için başlangıç şablonudur. Varsayılan model `openai/gpt-oss-20b`, sunulan model adı `futurehr-local` ve port `8000`'dir.

Başlatma:

```bash
docker compose up -d
```

Sağlık kontrolü:

```bash
curl http://localhost:8000/v1/models
```

## FutureHR environment variables

Vercel veya uygulama runtime'ında:

```bash
FUTUREHR_LOCAL_BASE_URL=https://your-private-ai-host.example.com
FUTUREHR_LOCAL_MODEL=futurehr-local
FUTUREHR_LOCAL_API_KEY=optional-private-gateway-key
FUTUREHR_LOCAL_TIMEOUT_MS=18000
```

`FUTUREHR_LOCAL_BASE_URL` `/v1` ile bitebilir veya bitmeyebilir. FutureHR otomatik olarak OpenAI-compatible `/v1/chat/completions` yolunu kullanır.

Local endpoint yapılandırılmamışsa mevcut Groq/OpenAI zinciri aynen çalışır. Local endpoint timeout, 4xx/5xx veya bağlantı hatası verirse FutureHR otomatik olarak sıradaki provider'a geçer.

## Güvenlik

GPU runtime'ı internete doğrudan açık bırakmayın. Tercihen private network/VPN/reverse proxy arkasında çalıştırın. `FUTUREHR_LOCAL_API_KEY` ile gateway doğrulaması kullanın. Model cevabı hangi provider'dan gelirse gelsin FutureHR'ın deterministik output guardrail katmanından geçmeye devam eder.
