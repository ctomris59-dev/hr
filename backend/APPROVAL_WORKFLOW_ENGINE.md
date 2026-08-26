# Approval Workflow Engine
## Generic Workflow Engine for Approval Processes

---

## 1. GENERIC WORKFLOW MODELİ

### 1.1 Model Şeması

```
WorkflowDefinition (Template)
├── workflow_id
├── name
├── entity_type (e.g., "LeaveRequest", "Recruitment")
├── steps[]
│   ├── step_order
│   ├── name
│   ├── approver_rules[]
│   │   ├── rule_type (ROLE_BASED, DEPARTMENT_BASED, HIERARCHY_BASED, THRESHOLD_BASED)
│   │   ├── value
│   │   └── condition
│   ├── is_required
│   ├── timeout_hours
│   └── escalation_rule
└── requires_all_steps

WorkflowInstance (Running Workflow)
├── instance_id
├── workflow_id (reference)
├── entity_type
├── entity_id
├── requester_id
├── context (e.g., {"days": 10, "amount": 5000})
├── steps[] (runtime state)
│   ├── status (PENDING, APPROVED, REJECTED)
│   ├── approver_id
│   ├── approved_at
│   └── comments
└── status (PENDING, IN_PROGRESS, APPROVED, REJECTED)
```

### 1.2 Örnek Tablolar

#### WorkflowDefinition Örneği: Leave Request

```json
{
  "workflow_id": "leave-request-v1",
  "name": "Leave Request Workflow",
  "entity_type": "LeaveRequest",
  "steps": [
    {
      "step_order": 1,
      "name": "Manager Approval",
      "approver_rules": [
        {
          "rule_type": "HIERARCHY_BASED",
          "value": "direct_manager"
        }
      ],
      "is_required": true,
      "timeout_hours": 48
    },
    {
      "step_order": 2,
      "name": "HR Approval",
      "approver_rules": [
        {
          "rule_type": "THRESHOLD_BASED",
          "value": 10,
          "condition": "days > 10"
        }
      ],
      "is_required": false,
      "timeout_hours": 24
    }
  ],
  "requires_all_steps": true
}
```

#### WorkflowInstance Örneği

```json
{
  "instance_id": "inst-123",
  "workflow_id": "leave-request-v1",
  "entity_type": "LeaveRequest",
  "entity_id": "leave-456",
  "requester_id": "employee-001",
  "requester_name": "Ahmet Yılmaz",
  "context": {
    "days": 15,
    "start_date": "2025-02-01",
    "end_date": "2025-02-15"
  },
  "steps": [
    {
      "step_id": "step-1",
      "step_order": 1,
      "name": "Manager Approval",
      "status": "APPROVED",
      "approver_id": "manager-001",
      "approver_name": "Mehmet Demir",
      "approved_at": "2025-01-27T10:00:00Z"
    },
    {
      "step_id": "step-2",
      "step_order": 2,
      "name": "HR Approval",
      "status": "PENDING",
      "approver_id": "hr-001",
      "approver_name": "Ayşe Kaya"
    }
  ],
  "status": "IN_PROGRESS",
  "current_step_index": 1
}
```

---

## 2. DİNAMİK SENARYOLAR

### 2.1 Role Bazlı Onay

```python
# Örnek: CEO onayı gerektiren işlemler
approver_rule = ApprovalRule(
    rule_type=ApprovalRuleType.ROLE_BASED,
    value="CEO"
)
```

**Kullanım Senaryosu:**
- Bütçe onayları > 100,000 TL → CEO onayı gerekir
- Departman oluşturma → CEO onayı gerekir

### 2.2 Departman Bazlı Onay

```python
# Örnek: Aynı departmandan onay
approver_rule = ApprovalRule(
    rule_type=ApprovalRuleType.DEPARTMENT_BASED,
    value="İnsan Kaynakları"
)
```

**Kullanım Senaryosu:**
- İşe alım onayları → IK departmanı onayı
- Maaş artışı → Finans departmanı onayı

### 2.3 Hiyerarşi Bazlı Onay

```python
# Örnek: Direkt yönetici onayı
approver_rule = ApprovalRule(
    rule_type=ApprovalRuleType.HIERARCHY_BASED,
    value="direct_manager"
)
```

**Kullanım Senaryosu:**
- İzin talepleri → Direkt yönetici onayı
- Performans değerlendirmesi → Yönetici onayı

### 2.4 Threshold Bazlı Onay

```python
# Örnek: 10 günden fazla izin → HR onayı
approver_rule = ApprovalRule(
    rule_type=ApprovalRuleType.THRESHOLD_BASED,
    value=10,
    condition="days > 10"
)
```

**Kullanım Senaryosu:**
- İzin talebi ≤ 10 gün → Sadece yönetici onayı
- İzin talebi > 10 gün → Yönetici + HR onayı
- Bütçe talebi > 50,000 TL → Ek onay gerekir

### 2.5 Kombine Senaryolar

```python
# Örnek: Çoklu onay kuralları
steps = [
    WorkflowStep(
        step_order=1,
        name="Manager Approval",
        approver_rules=[
            ApprovalRule(
                rule_type=ApprovalRuleType.HIERARCHY_BASED,
                value="direct_manager"
            )
        ]
    ),
    WorkflowStep(
        step_order=2,
        name="HR Approval",
        approver_rules=[
            ApprovalRule(
                rule_type=ApprovalRuleType.THRESHOLD_BASED,
                value=10,
                condition="days > 10"
            )
        ],
        is_required=False  # Sadece threshold aşılırsa gerekli
    ),
    WorkflowStep(
        step_order=3,
        name="CEO Approval",
        approver_rules=[
            ApprovalRule(
                rule_type=ApprovalRuleType.THRESHOLD_BASED,
                value=20,
                condition="days > 20"
            )
        ],
        is_required=False
    )
]
```

**Akış:**
1. İzin talebi ≤ 10 gün → Sadece Manager onayı
2. İzin talebi 11-20 gün → Manager + HR onayı
3. İzin talebi > 20 gün → Manager + HR + CEO onayı

---

## 3. TEKNİK MİMARİ

### 3.1 Domain Service

```
WorkflowService
├── create_definition()      # Workflow template oluştur
├── create_instance()        # Workflow başlat
├── approve_step()           # Adım onayla/reddet
├── get_pending_approvals()  # Bekleyen onaylar
└── cancel_instance()        # İptal et
```

**Sorumluluklar:**
- Business logic (onay kuralları, akış yönetimi)
- Approver determination (kim onaylayacak?)
- Workflow advancement (bir sonraki adıma geç)
- Validation (yetki kontrolü, durum kontrolü)

### 3.2 Persistence

**Repository Pattern:**
```
WorkflowRepository
├── save_definition()        # Workflow template kaydet
├── get_definition()         # Template getir
├── save_instance()          # Running workflow kaydet
├── get_instance()           # Instance getir
└── list_instances()         # Filtreli liste
```

**Storage:**
- Şu anki: JSON files
  - `workflow_definitions.json` (templates)
  - `workflow_instances.json` (running workflows)
- Gelecek: PostgreSQL
  - `workflow_definitions` table
  - `workflow_instances` table
  - `workflow_steps` table (normalized)

### 3.3 Event Tetikleme

**Workflow Events:**
```python
# Workflow başladığında
workflow_started_event = {
    "event_type": "WORKFLOW_STARTED",
    "instance_id": "...",
    "entity_type": "LeaveRequest",
    "entity_id": "..."
}

# Adım onaylandığında
step_approved_event = {
    "event_type": "WORKFLOW_STEP_APPROVED",
    "instance_id": "...",
    "step_id": "...",
    "approver_id": "..."
}

# Workflow tamamlandığında
workflow_completed_event = {
    "event_type": "WORKFLOW_COMPLETED",
    "instance_id": "...",
    "status": "APPROVED" | "REJECTED"
}
```

**Entegrasyon:**
- Audit Log: Tüm onay işlemleri loglanır
- Notifications: Onay bekleyen kullanıcılara bildirim
- Webhooks: External sistemlere event gönderimi (Enterprise)

---

## 4. MEVCUT MODÜLLERE ENTEGRASYON

### 4.1 Leave Request Entegrasyonu

**Mevcut Kod:**
```python
# utils_db.py
def update_leave_status(req_id, new_status, approver_note=""):
    # Basit onay/red mekanizması
    req['durum'] = new_status
    req['yonetici_notu'] = approver_note
```

**Yeni Kod (Workflow ile):**
```python
# routers/leave.py (yeni)
@router.post("/api/leave/request")
async def create_leave_request(
    request: LeaveRequest,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    # 1. İzin talebini kaydet
    leave_id = save_leave_request(request)
    
    # 2. Workflow instance oluştur
    workflow_service = WorkflowService()
    workflow_def = workflow_service.get_definition_for_entity("LeaveRequest")
    
    if workflow_def:
        workflow_instance = workflow_service.create_instance(
            WorkflowCreateRequest(
                workflow_id=workflow_def.workflow_id,
                entity_type="LeaveRequest",
                entity_id=str(leave_id),
                requester_id=name,
                requester_name=name,
                requester_role=role,
                context={
                    "days": request.days,
                    "start_date": request.start_date,
                    "end_date": request.end_date,
                }
            )
        )
    
    return {"success": True, "leave_id": leave_id, "workflow_id": workflow_instance.instance_id}

@router.post("/api/leave/{leave_id}/approve")
async def approve_leave(
    leave_id: str,
    action: str,  # "approve" | "reject"
    comments: str,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    # 1. Workflow instance'ı bul
    workflow_service = WorkflowService()
    instance = workflow_service._repo.get_instance_by_entity("LeaveRequest", leave_id)
    
    if not instance:
        raise HTTPException(404, "Workflow not found")
    
    # 2. Pending step'i bul
    pending_step = None
    for step in instance.steps:
        if step.status == StepStatus.PENDING and step.approver_id == name:
            pending_step = step
            break
    
    if not pending_step:
        raise HTTPException(403, "No pending approval for you")
    
    # 3. Onayla/Reddet
    approval_action = ApprovalAction.APPROVE if action == "approve" else ApprovalAction.REJECT
    updated_instance = workflow_service.approve_step(
        ApprovalRequest(
            instance_id=instance.instance_id,
            step_id=pending_step.step_id,
            action=approval_action,
            approver_id=name,
            approver_name=name,
            approver_role=role,
            comments=comments,
        )
    )
    
    # 4. Workflow tamamlandıysa, leave status'ü güncelle
    if updated_instance.status == WorkflowStatus.APPROVED:
        update_leave_status(leave_id, "Onaylandı", comments)
        # Audit log
        audit_service.log_leave_approved(...)
    elif updated_instance.status == WorkflowStatus.REJECTED:
        update_leave_status(leave_id, "Reddedildi", comments)
    
    return {"success": True, "workflow_status": updated_instance.status}
```

### 4.2 Recruitment Entegrasyonu

**Mevcut Kod:**
```python
# Basit onay mekanizması yok
```

**Yeni Kod (Workflow ile):**
```python
# routers/recruitment.py
@router.post("/api/recruitment/candidate/{candidate_id}/approve")
async def approve_candidate(
    candidate_id: str,
    action: str,
    comments: str,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    # 1. Workflow instance oluştur (eğer yoksa)
    workflow_service = WorkflowService()
    instance = workflow_service._repo.get_instance_by_entity("Recruitment", candidate_id)
    
    if not instance:
        # İlk onay için workflow başlat
        workflow_def = workflow_service.get_definition_for_entity("Recruitment")
        if workflow_def:
            instance = workflow_service.create_instance(
                WorkflowCreateRequest(
                    workflow_id=workflow_def.workflow_id,
                    entity_type="Recruitment",
                    entity_id=candidate_id,
                    requester_id=name,
                    requester_name=name,
                    context={
                        "candidate_score": get_candidate_score(candidate_id),
                        "position": get_candidate_position(candidate_id),
                    }
                )
            )
    
    # 2. Onayla/Reddet
    # ... (aynı mantık)
```

### 4.3 Performance Review Entegrasyonu

**Yeni Kod:**
```python
# routers/performance.py
@router.post("/api/performance/review/{review_id}/submit")
async def submit_performance_review(
    review_id: str,
    review_data: PerformanceReviewData,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    # 1. Review'ı kaydet
    save_performance_review(review_id, review_data)
    
    # 2. Workflow başlat (yönetici onayı gerekir)
    workflow_service = WorkflowService()
    workflow_def = workflow_service.get_definition_for_entity("PerformanceReview")
    
    if workflow_def:
        instance = workflow_service.create_instance(
            WorkflowCreateRequest(
                workflow_id=workflow_def.workflow_id,
                entity_type="PerformanceReview",
                entity_id=review_id,
                requester_id=name,
                requester_name=name,
                context={
                    "employee_id": review_data.employee_id,
                    "review_type": review_data.review_type,
                }
            )
        )
    
    return {"success": True, "workflow_id": instance.instance_id}
```

---

## 5. MVP vs ENTERPRISE FARKI

### 5.1 MVP (Minimum Viable Product)

**Özellikler:**
- ✅ Basit workflow tanımları (2-3 adım)
- ✅ Role/Department bazlı onay kuralları
- ✅ Threshold bazlı koşullu adımlar
- ✅ JSON file storage
- ✅ Temel API endpoints
- ✅ Pending approvals listesi

**Sınırlamalar:**
- ❌ Parallel steps yok
- ❌ Escalation yok
- ❌ Timeout handling yok
- ❌ Custom conditions yok
- ❌ Delegation yok
- ❌ Webhooks yok

**Kullanım Senaryoları:**
- İzin talepleri (Manager → HR)
- Basit onay süreçleri

### 5.2 Enterprise

**Ek Özellikler:**
- ✅ Parallel steps (aynı anda birden fazla onay)
- ✅ Escalation (timeout'ta üst seviyeye geç)
- ✅ Timeout handling (otomatik escalation/auto-approve)
- ✅ Custom conditions (Python function evaluation)
- ✅ Delegation (onayı başkasına devret)
- ✅ Webhooks (external sistemlere event gönderimi)
- ✅ Database storage (PostgreSQL)
- ✅ Workflow versioning (template versiyonlama)
- ✅ Workflow analytics (onay süreleri, bottleneck analizi)
- ✅ SLA tracking (SLA'ya göre uyarılar)
- ✅ Multi-tenant support (farklı şirketler için farklı workflow'lar)

**Kullanım Senaryoları:**
- Kompleks bütçe onayları (paralel onaylar)
- Çok seviyeli işe alım süreçleri
- Compliance onayları (regülasyon gereksinimleri)

### 5.3 Karşılaştırma Tablosu

| Özellik | MVP | Enterprise |
|---------|-----|------------|
| **Workflow Steps** | 2-3 adım | Sınırsız |
| **Approval Rules** | Role, Department, Threshold | + Custom, Complex conditions |
| **Parallel Steps** | ❌ | ✅ |
| **Escalation** | ❌ | ✅ |
| **Timeout Handling** | ❌ | ✅ |
| **Delegation** | ❌ | ✅ |
| **Storage** | JSON | PostgreSQL |
| **Webhooks** | ❌ | ✅ |
| **Analytics** | ❌ | ✅ |
| **Versioning** | ❌ | ✅ |
| **Multi-tenant** | ❌ | ✅ |

---

## 6. KOD İSKELETİ

### 6.1 Workflow Definition Oluşturma

```python
# Örnek: Leave Request Workflow
leave_workflow = WorkflowDefinition(
    workflow_id="leave-request-v1",
    name="Leave Request Workflow",
    entity_type="LeaveRequest",
    steps=[
        WorkflowStep(
            step_order=1,
            name="Manager Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.HIERARCHY_BASED,
                    value="direct_manager"
                )
            ],
            is_required=True,
            timeout_hours=48
        ),
        WorkflowStep(
            step_order=2,
            name="HR Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.THRESHOLD_BASED,
                    value=10,
                    condition="days > 10"
                )
            ],
            is_required=False,  # Sadece 10 günden fazlaysa gerekli
            timeout_hours=24
        )
    ],
    requires_all_steps=True
)

# Kaydet
service = WorkflowService()
service.create_definition(leave_workflow)
```

### 6.2 Workflow Instance Oluşturma

```python
# İzin talebi oluşturulduğunda
workflow_service = WorkflowService()
workflow_def = workflow_service.get_definition_for_entity("LeaveRequest")

instance = workflow_service.create_instance(
    WorkflowCreateRequest(
        workflow_id=workflow_def.workflow_id,
        entity_type="LeaveRequest",
        entity_id="leave-123",
        requester_id="employee-001",
        requester_name="Ahmet Yılmaz",
        requester_role="EMPLOYEE",
        requester_department="IT",
        context={
            "days": 15,  # 15 gün izin
            "start_date": "2025-02-01",
            "end_date": "2025-02-15"
        }
    )
)
```

### 6.3 Onay İşlemi

```python
# Yönetici onay veriyor
workflow_service = WorkflowService()
instance = workflow_service.approve_step(
    ApprovalRequest(
        instance_id="inst-123",
        step_id="step-1",
        action=ApprovalAction.APPROVE,
        approver_id="manager-001",
        approver_name="Mehmet Demir",
        approver_role="MANAGER",
        comments="Onaylandı"
    )
)

# Workflow durumu kontrol et
if instance.status == WorkflowStatus.APPROVED:
    # Tüm adımlar onaylandı
    update_leave_status("leave-123", "Onaylandı")
elif instance.status == WorkflowStatus.IN_PROGRESS:
    # Bir sonraki adıma geçti (HR onayı bekleniyor)
    notify_hr_approver(instance.steps[1].approver_id)
```

### 6.4 Bekleyen Onayları Listeleme

```python
# Kullanıcının bekleyen onayları
workflow_service = WorkflowService()
pending = workflow_service.get_pending_approvals("manager-001")

for instance in pending:
    print(f"Entity: {instance.entity_type}:{instance.entity_id}")
    print(f"Requester: {instance.requester_name}")
    for step in instance.steps:
        if step.status == StepStatus.PENDING:
            print(f"  - {step.name} (Step {step.step_order})")
```

---

## 7. SONUÇ

**Tamamlanan:**
- ✅ Generic workflow modeli
- ✅ Dinamik onay kuralları (role, department, hierarchy, threshold)
- ✅ Domain service (business logic)
- ✅ Repository (data access)
- ✅ API endpoints
- ✅ Entegrasyon örnekleri

**MVP Ready:** ✅ Evet

**Sonraki Adımlar:**
1. Leave Request modülüne entegrasyon
2. Recruitment modülüne entegrasyon
3. Frontend onay ekranı
4. Notification entegrasyonu
5. Enterprise özellikler (escalation, timeout, parallel steps)

