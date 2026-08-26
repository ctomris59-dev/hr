#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os

# Mevcut dizini path'e ekle
sys.path.insert(0, os.path.dirname(__file__))

# Python dosyasını çalıştır
data_jobs_path = os.path.join(os.path.dirname(__file__), "data", "data_jobs.py")
exec(open(data_jobs_path, encoding='utf-8').read())

# TypeScript header
ts_header = """// Job Profiles - Backend'deki data_jobs.py'den dönüştürüldü
// DİKKAT: Buradaki anahtarlar (Keys), config.py dosyasındaki COMPETENCIES_360
// sözlüğündeki değerlerle BİREBİR AYNI olmalıdır.

export interface JobProfile {
  "Dijital Okuryazarlık": number;
  "Analitik Düşünme": number;
  "Sonuç Odaklılık": number;
  "Detaylara Özen": number;
  "Sürekli Öğrenme": number;
  "Etik ve Uyum": number;
  "Öz-Disiplin": number;
  "Stratejik Bakış": number;
  "Takım Çalışması": number;
  "İletişim Becerileri": number;
}

export const JOB_PROFILES: Record<string, JobProfile> = {
"""

ts_footer = "};"

# TypeScript body oluştur
ts_body_lines = []
for job_name, competencies in JOB_PROFILES.items():
    job_name_escaped = job_name.replace('"', '\\"')
    comp_lines = []
    for comp_name, score in competencies.items():
        comp_name_escaped = comp_name.replace('"', '\\"')
        comp_lines.append(f'    "{comp_name_escaped}": {score}')
    comp_str = ',\n'.join(comp_lines)
    ts_body_lines.append(f'  "{job_name_escaped}": {{\n{comp_str}\n  }},')

ts_body = '\n'.join(ts_body_lines)
ts_content = ts_header + ts_body + '\n' + ts_footer

# Dosyayı yaz
output_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'app', 'data', 'jobData.ts')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"✅ {len(JOB_PROFILES)} pozisyon başarıyla dönüştürüldü ve {output_path} dosyasına yazıldı!")



