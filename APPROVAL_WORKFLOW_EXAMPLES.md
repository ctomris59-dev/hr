# Approval Workflow Engine - Örnek Senaryolar

## Senaryo 1: İzin Talebi (Basit)

### Workflow Definition

```python
leave_workflow = WorkflowDefinition(
    workflow_id="leave-request-simple",
    name="Simple Leave Request",
    entity_type="LeaveRequest",
    steps=[
        WorkflowStep(
            step_order=1,
            name="Manager Approval",
            description="Direct manager approval required",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.HIERARCHY_BASED,
                    value="direct_manager"
                )
            ],
            is_required=True,
            timeout_hours=48
        )
    ],
    requires_all_steps=True
)
```

### Kullanım

```python
# 1. İzin talebi oluştur
leave_id = create_leave_request({
    "employee": "Ahmet Yılmaz",
    "days": 5,
    "start_date": "2025-02-01"
})

# 2. Workflow başlat
workflow_service = WorkflowService()
instance = workflow_service.create_instance(
    WorkflowCreateRequest(
        workflow_id="leave-request-simple",
        entity_type="LeaveRequest",
        entity_id=str(leave_id),
        requester_id="ahmet-yilmaz",
        requester_name="Ahmet Yılmaz",
        context={"days": 5}
    )
)

# 3. Yönetici onaylar
workflow_service.approve_step(
    ApprovalRequest(
        instance_id=instance.instance_id,
        step_id=instance.steps[0].step_id,
        action=ApprovalAction.APPROVE,
        approver_id="manager-001",
        approver_name="Mehmet Demir"
    )
)
```

---

## Senaryo 2: İzin Talebi (Threshold Bazlı)

### Workflow Definition

```python
leave_workflow_threshold = WorkflowDefinition(
    workflow_id="leave-request-threshold",
    name="Leave Request with Threshold",
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
            is_required=True
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
            is_required=False  # Sadece 10 günden fazlaysa
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
            is_required=False  # Sadece 20 günden fazlaysa
        )
    ],
    requires_all_steps=True
)
```

### Senaryolar

**5 Gün İzin:**
- Manager Approval → ✅ Onaylandı
- HR Approval → ⏭️ Skipped (days <= 10)
- CEO Approval → ⏭️ Skipped (days <= 20)
- **Sonuç:** APPROVED

**15 Gün İzin:**
- Manager Approval → ✅ Onaylandı
- HR Approval → ✅ Onaylandı (days > 10)
- CEO Approval → ⏭️ Skipped (days <= 20)
- **Sonuç:** APPROVED

**25 Gün İzin:**
- Manager Approval → ✅ Onaylandı
- HR Approval → ✅ Onaylandı
- CEO Approval → ✅ Onaylandı (days > 20)
- **Sonuç:** APPROVED

---

## Senaryo 3: İşe Alım (Multi-Step)

### Workflow Definition

```python
recruitment_workflow = WorkflowDefinition(
    workflow_id="recruitment-v1",
    name="Recruitment Workflow",
    entity_type="Recruitment",
    steps=[
        WorkflowStep(
            step_order=1,
            name="HR Screening",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.DEPARTMENT_BASED,
                    value="İnsan Kaynakları"
                )
            ],
            is_required=True
        ),
        WorkflowStep(
            step_order=2,
            name="Technical Interview",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.ROLE_BASED,
                    value="TECHNICAL_LEAD"
                )
            ],
            is_required=True
        ),
        WorkflowStep(
            step_order=3,
            name="Department Manager Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.DEPARTMENT_BASED,
                    value="context.department"  # Dynamic department
                )
            ],
            is_required=True
        ),
        WorkflowStep(
            step_order=4,
            name="CEO Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.ROLE_BASED,
                    value="CEO"
                )
            ],
            is_required=False,
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.THRESHOLD_BASED,
                    value=100000,
                    condition="salary > 100000"
                )
            ]
        )
    ],
    requires_all_steps=True
)
```

### Kullanım

```python
# Aday oluşturuldu
candidate_id = create_candidate({
    "name": "Ayşe Kaya",
    "position": "Senior Developer",
    "salary": 120000,
    "department": "IT"
})

# Workflow başlat
instance = workflow_service.create_instance(
    WorkflowCreateRequest(
        workflow_id="recruitment-v1",
        entity_type="Recruitment",
        entity_id=str(candidate_id),
        requester_id="hr-001",
        requester_name="HR Team",
        context={
            "salary": 120000,
            "department": "IT"
        }
    )
)

# Adım adım onay
# 1. HR Screening
workflow_service.approve_step(...)  # HR onaylar

# 2. Technical Interview
workflow_service.approve_step(...)  # Tech Lead onaylar

# 3. Department Manager
workflow_service.approve_step(...)  # IT Manager onaylar

# 4. CEO Approval (salary > 100000 olduğu için gerekli)
workflow_service.approve_step(...)  # CEO onaylar

# Sonuç: APPROVED
```

---

## Senaryo 4: Performans Değerlendirmesi

### Workflow Definition

```python
performance_workflow = WorkflowDefinition(
    workflow_id="performance-review-v1",
    name="Performance Review Workflow",
    entity_type="PerformanceReview",
    steps=[
        WorkflowStep(
            step_order=1,
            name="Self Evaluation",
            approver_rules=[],  # Employee kendisi doldurur
            is_required=True
        ),
        WorkflowStep(
            step_order=2,
            name="Manager Review",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.HIERARCHY_BASED,
                    value="direct_manager"
                )
            ],
            is_required=True
        ),
        WorkflowStep(
            step_order=3,
            name="HR Final Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.DEPARTMENT_BASED,
                    value="İnsan Kaynakları"
                )
            ],
            is_required=True
        )
    ],
    requires_all_steps=True
)
```

---

## Senaryo 5: Bütçe Onayı (Enterprise - Parallel Steps)

### Workflow Definition (Enterprise)

```python
budget_workflow = WorkflowDefinition(
    workflow_id="budget-approval-v1",
    name="Budget Approval Workflow",
    entity_type="BudgetRequest",
    steps=[
        WorkflowStep(
            step_order=1,
            name="Finance Review",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.DEPARTMENT_BASED,
                    value="Finans"
                )
            ],
            is_required=True,
            is_parallel=False
        ),
        WorkflowStep(
            step_order=2,
            name="Department Manager Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.DEPARTMENT_BASED,
                    value="context.department"
                )
            ],
            is_required=True,
            is_parallel=True  # Finance ile paralel çalışabilir
        ),
        WorkflowStep(
            step_order=3,
            name="CEO Approval",
            approver_rules=[
                ApprovalRule(
                    rule_type=ApprovalRuleType.THRESHOLD_BASED,
                    value=50000,
                    condition="amount > 50000"
                )
            ],
            is_required=False,
            timeout_hours=24,
            escalation_rule=ApprovalRule(
                rule_type=ApprovalRuleType.ROLE_BASED,
                value="CFO"
            )
        )
    ],
    requires_all_steps=True,
    allow_parallel=True  # Parallel steps allowed
)
```

### Kullanım

```python
# Bütçe talebi
budget_id = create_budget_request({
    "amount": 75000,
    "department": "IT",
    "purpose": "New equipment"
})

# Workflow başlat
instance = workflow_service.create_instance(
    WorkflowCreateRequest(
        workflow_id="budget-approval-v1",
        entity_type="BudgetRequest",
        entity_id=str(budget_id),
        requester_id="it-manager",
        context={
            "amount": 75000,
            "department": "IT"
        }
    )
)

# Parallel onaylar (Finance ve IT Manager aynı anda onaylayabilir)
# 1. Finance Review
workflow_service.approve_step(...)  # Finance onaylar

# 2. Department Manager (paralel)
workflow_service.approve_step(...)  # IT Manager onaylar

# 3. CEO Approval (amount > 50000 olduğu için gerekli)
workflow_service.approve_step(...)  # CEO onaylar

# Sonuç: APPROVED
```

---

## Senaryo 6: Delegation (Enterprise)

```python
# Yönetici onayı başkasına devrediyor
workflow_service.approve_step(
    ApprovalRequest(
        instance_id=instance.instance_id,
        step_id=step.step_id,
        action=ApprovalAction.DELEGATE,
        approver_id="manager-001",
        approver_name="Mehmet Demir",
        delegate_to_id="manager-002",  # Başka bir yöneticiye devret
        comments="I'm on vacation, delegating to manager-002"
    )
)

# Artık manager-002 onaylayabilir
```

---

## Senaryo 7: Escalation (Enterprise)

```python
# Timeout sonrası otomatik escalation
workflow_step = WorkflowStep(
    step_order=1,
    name="Manager Approval",
    timeout_hours=48,  # 48 saat sonra timeout
    escalation_rule=ApprovalRule(
        rule_type=ApprovalRuleType.HIERARCHY_BASED,
        value="department_director"  # Üst seviyeye escalate et
    )
)

# 48 saat sonra otomatik olarak:
# - Manager onaylamadıysa
# - Department Director'a escalate edilir
# - Department Director onaylayabilir
```

---

## Senaryo 8: Custom Condition (Enterprise)

```python
# Custom condition function
def custom_approval_condition(context: Dict) -> bool:
    """Custom condition: Onay gerekli mi?"""
    days = context.get("days", 0)
    employee_level = context.get("employee_level", "junior")
    
    # Senior employee ve 5 günden fazla izin → HR onayı gerekir
    if employee_level == "senior" and days > 5:
        return True
    return False

# Workflow definition
workflow_step = WorkflowStep(
    step_order=2,
    name="HR Approval",
    approver_rules=[
        ApprovalRule(
            rule_type=ApprovalRuleType.CUSTOM,
            custom_function="custom_approval_condition"
        )
    ],
    is_required=False
)
```

---

## Özet

**MVP Senaryoları:**
- ✅ Basit izin talebi (1 onay)
- ✅ Threshold bazlı izin talebi (2-3 onay)
- ✅ İşe alım (sıralı onaylar)
- ✅ Performans değerlendirmesi

**Enterprise Senaryoları:**
- ✅ Parallel onaylar
- ✅ Delegation
- ✅ Escalation
- ✅ Custom conditions
- ✅ Timeout handling

