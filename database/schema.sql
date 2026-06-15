PRAGMA foreign_keys=ON;

PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS "AccountPayable" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "description" TEXT,
  "supplier_name" TEXT,
  "amount" REAL,
  "amount_paid" REAL,
  "due_date" TEXT,
  "competence_date" TEXT,
  "category" TEXT,
  "cost_center" TEXT,
  "payment_method" TEXT,
  "installments" REAL,
  "installment_number" REAL,
  "paid" INTEGER,
  "paid_date" TEXT,
  "paid_by_partner" TEXT,
  "recurrent" INTEGER,
  "notes" TEXT,
  "attachment_url" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_AccountPayable_created_date" ON "AccountPayable" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_AccountPayable_updated_date" ON "AccountPayable" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_AccountPayable_created_by_id" ON "AccountPayable" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_AccountPayable_installment_number" ON "AccountPayable" ("installment_number");

CREATE TABLE IF NOT EXISTS "AccountReceivable" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "description" TEXT,
  "amount" REAL,
  "amount_received" REAL,
  "due_date" TEXT,
  "competence_date" TEXT,
  "client_id" TEXT,
  "client_name" TEXT,
  "order_id" TEXT,
  "category" TEXT,
  "payment_method" TEXT,
  "installments" REAL,
  "installment_number" REAL,
  "received" INTEGER,
  "received_date" TEXT,
  "received_by_partner" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_AccountReceivable_created_date" ON "AccountReceivable" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_AccountReceivable_updated_date" ON "AccountReceivable" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_AccountReceivable_created_by_id" ON "AccountReceivable" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_AccountReceivable_client_id" ON "AccountReceivable" ("client_id");

CREATE INDEX IF NOT EXISTS "idx_AccountReceivable_order_id" ON "AccountReceivable" ("order_id");

CREATE INDEX IF NOT EXISTS "idx_AccountReceivable_installment_number" ON "AccountReceivable" ("installment_number");

CREATE TABLE IF NOT EXISTS "AssetMaintenance" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "asset_id" TEXT,
  "asset_name" TEXT,
  "type" TEXT,
  "priority" TEXT,
  "description" TEXT,
  "cost" REAL,
  "technician" TEXT,
  "replaced_parts" TEXT,
  "scheduled_date" TEXT,
  "next_maintenance" TEXT,
  "status" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_AssetMaintenance_created_date" ON "AssetMaintenance" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_AssetMaintenance_updated_date" ON "AssetMaintenance" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_AssetMaintenance_created_by_id" ON "AssetMaintenance" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_AssetMaintenance_asset_id" ON "AssetMaintenance" ("asset_id");

CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "entity_name" TEXT,
  "entity_id" TEXT,
  "file_url" TEXT,
  "file_name" TEXT,
  "file_type" TEXT,
  "category" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Attachment_created_date" ON "Attachment" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Attachment_updated_date" ON "Attachment" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Attachment_created_by_id" ON "Attachment" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_Attachment_entity_id" ON "Attachment" ("entity_id");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "module" TEXT,
  "entity_name" TEXT,
  "entity_id" TEXT,
  "action" TEXT,
  "field_name" TEXT,
  "old_value" TEXT,
  "new_value" TEXT,
  "user_email" TEXT,
  "document_number" TEXT,
  "ip_address" TEXT,
  "device_info" TEXT,
  "metadata" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_AuditLog_created_date" ON "AuditLog" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_AuditLog_updated_date" ON "AuditLog" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_AuditLog_created_by_id" ON "AuditLog" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_AuditLog_entity_id" ON "AuditLog" ("entity_id");

CREATE INDEX IF NOT EXISTS "idx_AuditLog_document_number" ON "AuditLog" ("document_number");

CREATE TABLE IF NOT EXISTS "CalendarEvent" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "title" TEXT,
  "type" TEXT,
  "date" TEXT,
  "time" TEXT,
  "description" TEXT,
  "completed" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_CalendarEvent_created_date" ON "CalendarEvent" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_CalendarEvent_updated_date" ON "CalendarEvent" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_CalendarEvent_created_by_id" ON "CalendarEvent" ("created_by_id");

CREATE TABLE IF NOT EXISTS "Client" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "email" TEXT,
  "address" TEXT,
  "payment_method" TEXT,
  "status" TEXT,
  "total_purchases" REAL,
  "total_debt" REAL,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Client_created_date" ON "Client" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Client_updated_date" ON "Client" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Client_created_by_id" ON "Client" ("created_by_id");

CREATE TABLE IF NOT EXISTS "ClientPriceHistory" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "client_id" TEXT,
  "client_name" TEXT,
  "item_name" TEXT,
  "quantity" REAL,
  "unit_price" REAL,
  "total" REAL,
  "date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ClientPriceHistory_created_date" ON "ClientPriceHistory" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ClientPriceHistory_updated_date" ON "ClientPriceHistory" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ClientPriceHistory_created_by_id" ON "ClientPriceHistory" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ClientPriceHistory_client_id" ON "ClientPriceHistory" ("client_id");

CREATE TABLE IF NOT EXISTS "CollectionRule" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "days_overdue" REAL,
  "action" TEXT,
  "template" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_CollectionRule_created_date" ON "CollectionRule" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_CollectionRule_updated_date" ON "CollectionRule" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_CollectionRule_created_by_id" ON "CollectionRule" ("created_by_id");

CREATE TABLE IF NOT EXISTS "CompanyAsset" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "category" TEXT,
  "description" TEXT,
  "purchase_value" REAL,
  "current_value" REAL,
  "depreciation_rate" REAL,
  "serial_number" TEXT,
  "location" TEXT,
  "condition" TEXT,
  "responsible_partner" TEXT,
  "purchase_date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_CompanyAsset_created_date" ON "CompanyAsset" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_CompanyAsset_updated_date" ON "CompanyAsset" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_CompanyAsset_created_by_id" ON "CompanyAsset" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_CompanyAsset_serial_number" ON "CompanyAsset" ("serial_number");

CREATE TABLE IF NOT EXISTS "CompanyConfig" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "company_name" TEXT,
  "logo_url" TEXT,
  "cnpj" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "email" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_CompanyConfig_created_date" ON "CompanyConfig" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_CompanyConfig_updated_date" ON "CompanyConfig" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_CompanyConfig_created_by_id" ON "CompanyConfig" ("created_by_id");

CREATE TABLE IF NOT EXISTS "CrmReminder" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "client_id" TEXT,
  "client_name" TEXT,
  "title" TEXT,
  "description" TEXT,
  "type" TEXT,
  "reminder_date" TEXT,
  "completed" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_CrmReminder_created_date" ON "CrmReminder" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_CrmReminder_updated_date" ON "CrmReminder" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_CrmReminder_created_by_id" ON "CrmReminder" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_CrmReminder_client_id" ON "CrmReminder" ("client_id");

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "legacy_client_id" TEXT,
  "name" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "email" TEXT,
  "document_number" TEXT,
  "address" TEXT,
  "status" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Customer_created_date" ON "Customer" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Customer_updated_date" ON "Customer" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Customer_created_by_id" ON "Customer" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_Customer_legacy_client_id" ON "Customer" ("legacy_client_id");

CREATE INDEX IF NOT EXISTS "idx_Customer_document_number" ON "Customer" ("document_number");

CREATE TABLE IF NOT EXISTS "ERPRequirement" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "code" TEXT,
  "area" TEXT,
  "title" TEXT,
  "current_state" TEXT,
  "target_state" TEXT,
  "gap" TEXT,
  "recommendation" TEXT,
  "priority" TEXT,
  "status" TEXT,
  "maturity" REAL,
  "owner" TEXT,
  "due_date" TEXT,
  "evidence" TEXT,
  "module_path" TEXT,
  "source_reference" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ERPRequirement_created_date" ON "ERPRequirement" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ERPRequirement_updated_date" ON "ERPRequirement" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ERPRequirement_created_by_id" ON "ERPRequirement" ("created_by_id");

CREATE TABLE IF NOT EXISTS "EpiRecord" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "employee_name" TEXT,
  "epi_type" TEXT,
  "quantity" REAL,
  "delivery_date" TEXT,
  "expiry_date" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_EpiRecord_created_date" ON "EpiRecord" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_EpiRecord_updated_date" ON "EpiRecord" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_EpiRecord_created_by_id" ON "EpiRecord" ("created_by_id");

CREATE TABLE IF NOT EXISTS "FiscalConfig" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "focusnfe_token" TEXT,
  "ambiente" TEXT,
  "cnpj_emitente" TEXT,
  "razao_social" TEXT,
  "nome_fantasia" TEXT,
  "inscricao_municipal" TEXT,
  "codigo_municipio" TEXT,
  "logradouro" TEXT,
  "numero" TEXT,
  "bairro" TEXT,
  "municipio" TEXT,
  "uf" TEXT,
  "cep" TEXT,
  "telefone" TEXT,
  "email" TEXT,
  "regime_tributario" TEXT,
  "numero_nfe_serie" REAL,
  "proximo_numero_nfe" REAL,
  "codigo_servico_padrao" TEXT,
  "aliquota_iss" REAL
);

CREATE INDEX IF NOT EXISTS "idx_FiscalConfig_created_date" ON "FiscalConfig" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_FiscalConfig_updated_date" ON "FiscalConfig" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_FiscalConfig_created_by_id" ON "FiscalConfig" ("created_by_id");

CREATE TABLE IF NOT EXISTS "FixedExpense" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "amount" REAL,
  "due_day" REAL,
  "category" TEXT,
  "payment_method" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_FixedExpense_created_date" ON "FixedExpense" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_FixedExpense_updated_date" ON "FixedExpense" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_FixedExpense_created_by_id" ON "FixedExpense" ("created_by_id");

CREATE TABLE IF NOT EXISTS "FreightConfig" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "zone_name" TEXT,
  "base_cost" REAL,
  "cost_per_kg" REAL,
  "cost_per_m3" REAL,
  "min_value" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_FreightConfig_created_date" ON "FreightConfig" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_FreightConfig_updated_date" ON "FreightConfig" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_FreightConfig_created_by_id" ON "FreightConfig" ("created_by_id");

CREATE TABLE IF NOT EXISTS "Goal" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "title" TEXT,
  "target_value" REAL,
  "current_value" REAL,
  "type" TEXT,
  "deadline" TEXT,
  "completed" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_Goal_created_date" ON "Goal" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Goal_updated_date" ON "Goal" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Goal_created_by_id" ON "Goal" ("created_by_id");

CREATE TABLE IF NOT EXISTS "HolidayConfig" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "date" TEXT,
  "recurring" INTEGER,
  "affects_deadline" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_HolidayConfig_created_date" ON "HolidayConfig" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_HolidayConfig_updated_date" ON "HolidayConfig" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_HolidayConfig_created_by_id" ON "HolidayConfig" ("created_by_id");

CREATE TABLE IF NOT EXISTS "IntegrationEvent" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "integration_name" TEXT,
  "event_type" TEXT,
  "reference_id" TEXT,
  "status" TEXT,
  "payload_excerpt" TEXT,
  "processed_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_IntegrationEvent_created_date" ON "IntegrationEvent" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_IntegrationEvent_updated_date" ON "IntegrationEvent" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_IntegrationEvent_created_by_id" ON "IntegrationEvent" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_IntegrationEvent_reference_id" ON "IntegrationEvent" ("reference_id");

CREATE TABLE IF NOT EXISTS "IntegrationFailureLog" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "integration_name" TEXT,
  "event_type" TEXT,
  "reference_id" TEXT,
  "status" TEXT,
  "error_message" TEXT,
  "retry_count" REAL,
  "last_attempt_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_IntegrationFailureLog_created_date" ON "IntegrationFailureLog" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_IntegrationFailureLog_updated_date" ON "IntegrationFailureLog" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_IntegrationFailureLog_created_by_id" ON "IntegrationFailureLog" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_IntegrationFailureLog_reference_id" ON "IntegrationFailureLog" ("reference_id");

CREATE TABLE IF NOT EXISTS "LaserTube" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "machine" TEXT,
  "current_hours" REAL,
  "max_hours" REAL,
  "power_loss" REAL,
  "status" TEXT,
  "cost" REAL,
  "install_date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_LaserTube_created_date" ON "LaserTube" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_LaserTube_updated_date" ON "LaserTube" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_LaserTube_created_by_id" ON "LaserTube" ("created_by_id");

CREATE TABLE IF NOT EXISTS "LotBatch" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_variant_id" TEXT,
  "code" TEXT,
  "supplier_lot" TEXT,
  "manufacture_date" TEXT,
  "expiry_date" TEXT,
  "status" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_LotBatch_created_date" ON "LotBatch" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_LotBatch_updated_date" ON "LotBatch" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_LotBatch_created_by_id" ON "LotBatch" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_LotBatch_product_variant_id" ON "LotBatch" ("product_variant_id");

CREATE TABLE IF NOT EXISTS "MachineCost" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "machine_name" TEXT,
  "energy_cost_hour" REAL,
  "gas_cost_hour" REAL,
  "compressor_cost_hour" REAL,
  "maintenance_cost_hour" REAL,
  "total_cost_minute" REAL
);

CREATE INDEX IF NOT EXISTS "idx_MachineCost_created_date" ON "MachineCost" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_MachineCost_updated_date" ON "MachineCost" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_MachineCost_created_by_id" ON "MachineCost" ("created_by_id");

CREATE TABLE IF NOT EXISTS "MaintenanceChecklist" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "task" TEXT,
  "machine" TEXT,
  "interval_hours" REAL,
  "last_executed" TEXT,
  "next_due" TEXT,
  "completed" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_MaintenanceChecklist_created_date" ON "MaintenanceChecklist" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_MaintenanceChecklist_updated_date" ON "MaintenanceChecklist" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_MaintenanceChecklist_created_by_id" ON "MaintenanceChecklist" ("created_by_id");

CREATE TABLE IF NOT EXISTS "MarkupRule" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "material_type" TEXT,
  "markup_percent" REAL,
  "min_markup_percent" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_MarkupRule_created_date" ON "MarkupRule" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_MarkupRule_updated_date" ON "MarkupRule" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_MarkupRule_created_by_id" ON "MarkupRule" ("created_by_id");

CREATE TABLE IF NOT EXISTS "MaterialParameter" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "material" TEXT,
  "thickness" REAL,
  "cut_speed" REAL,
  "power" REAL,
  "gas_type" TEXT,
  "gas_pressure" REAL,
  "focal_distance" REAL,
  "passes" REAL,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_MaterialParameter_created_date" ON "MaterialParameter" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_MaterialParameter_updated_date" ON "MaterialParameter" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_MaterialParameter_created_by_id" ON "MaterialParameter" ("created_by_id");

CREATE TABLE IF NOT EXISTS "NotaFiscal" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "tipo" TEXT,
  "referencia" TEXT,
  "pedido_id" TEXT,
  "cliente_nome" TEXT,
  "cliente_cpf_cnpj" TEXT,
  "valor_total" REAL,
  "descricao_servico" TEXT,
  "status" TEXT,
  "numero_nota" TEXT,
  "chave_acesso" TEXT,
  "url_danfe" TEXT,
  "url_xml" TEXT,
  "protocolo" TEXT,
  "motivo_erro" TEXT,
  "payload_enviado" TEXT,
  "resposta_api" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_NotaFiscal_created_date" ON "NotaFiscal" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_NotaFiscal_updated_date" ON "NotaFiscal" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_NotaFiscal_created_by_id" ON "NotaFiscal" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_NotaFiscal_pedido_id" ON "NotaFiscal" ("pedido_id");

CREATE TABLE IF NOT EXISTS "OperationalLoss" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "description" TEXT,
  "loss_percent" REAL,
  "applies_to" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_OperationalLoss_created_date" ON "OperationalLoss" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_OperationalLoss_updated_date" ON "OperationalLoss" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_OperationalLoss_created_by_id" ON "OperationalLoss" ("created_by_id");

CREATE TABLE IF NOT EXISTS "OperationalPreset" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "preset_type" TEXT,
  "label" TEXT,
  "value" REAL,
  "sort_order" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_OperationalPreset_created_date" ON "OperationalPreset" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_OperationalPreset_updated_date" ON "OperationalPreset" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_OperationalPreset_created_by_id" ON "OperationalPreset" ("created_by_id");

CREATE TABLE IF NOT EXISTS "OrderMessage" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "author" TEXT,
  "message" TEXT,
  "department" TEXT,
  "service_order_id" TEXT,
  "sales_order_id" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_OrderMessage_created_date" ON "OrderMessage" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_OrderMessage_updated_date" ON "OrderMessage" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_OrderMessage_created_by_id" ON "OrderMessage" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_OrderMessage_service_order_id" ON "OrderMessage" ("service_order_id");

CREATE INDEX IF NOT EXISTS "idx_OrderMessage_sales_order_id" ON "OrderMessage" ("sales_order_id");

CREATE TABLE IF NOT EXISTS "PartnerCapital" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "partner" TEXT,
  "type" TEXT,
  "amount" REAL,
  "date" TEXT,
  "description" TEXT,
  "payment_method" TEXT,
  "asset_description" TEXT,
  "confirmed" INTEGER,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_PartnerCapital_created_date" ON "PartnerCapital" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_PartnerCapital_updated_date" ON "PartnerCapital" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_PartnerCapital_created_by_id" ON "PartnerCapital" ("created_by_id");

CREATE TABLE IF NOT EXISTS "PermissionRule" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "role_id" TEXT,
  "module" TEXT,
  "resource" TEXT,
  "action" TEXT,
  "condition" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_PermissionRule_created_date" ON "PermissionRule" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_PermissionRule_updated_date" ON "PermissionRule" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_PermissionRule_created_by_id" ON "PermissionRule" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_PermissionRule_role_id" ON "PermissionRule" ("role_id");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "brand" TEXT,
  "supplier_name" TEXT,
  "category" TEXT,
  "category_id" TEXT,
  "product_group" TEXT,
  "description" TEXT,
  "unit" TEXT,
  "pricing_mode" TEXT,
  "dimensions_required" INTEGER,
  "can_quote" INTEGER,
  "can_sell" INTEGER,
  "track_stock" INTEGER,
  "auto_deduct_on_sale" INTEGER,
  "is_active" INTEGER,
  "quantity" REAL,
  "min_quantity" REAL,
  "max_quantity" REAL,
  "lead_time_days" REAL,
  "sheet_width_mm" REAL,
  "sheet_height_mm" REAL,
  "thickness_mm" REAL,
  "cost_price" REAL,
  "price_per_m2" REAL,
  "sale_price" REAL,
  "default_markup_pct" REAL,
  "default_labor_hours" REAL,
  "labor_cost_hour" REAL,
  "default_machine_minutes" REAL,
  "machine_cost_per_min" REAL,
  "default_art_cost" REAL,
  "art_template_notes" TEXT,
  "color" TEXT,
  "location" TEXT,
  "asset_type" TEXT,
  "asset_category" TEXT,
  "asset_condition" TEXT,
  "responsible_partner" TEXT,
  "auto_create_asset" INTEGER,
  "linked_asset_id" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Product_created_date" ON "Product" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Product_updated_date" ON "Product" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Product_created_by_id" ON "Product" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_Product_category_id" ON "Product" ("category_id");

CREATE INDEX IF NOT EXISTS "idx_Product_linked_asset_id" ON "Product" ("linked_asset_id");

CREATE TABLE IF NOT EXISTS "ProductAlternative" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_variant_id" TEXT,
  "alternative_variant_id" TEXT,
  "relation_type" TEXT,
  "priority" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductAlternative_created_date" ON "ProductAlternative" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductAlternative_updated_date" ON "ProductAlternative" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductAlternative_created_by_id" ON "ProductAlternative" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductAlternative_product_variant_id" ON "ProductAlternative" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_ProductAlternative_alternative_variant_id" ON "ProductAlternative" ("alternative_variant_id");

CREATE TABLE IF NOT EXISTS "ProductAttribute" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "code" TEXT,
  "input_type" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductAttribute_created_date" ON "ProductAttribute" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductAttribute_updated_date" ON "ProductAttribute" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductAttribute_created_by_id" ON "ProductAttribute" ("created_by_id");

CREATE TABLE IF NOT EXISTS "ProductAttributeValue" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "attribute_id" TEXT,
  "attribute_name" TEXT,
  "value" TEXT,
  "code" TEXT,
  "sort_order" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductAttributeValue_created_date" ON "ProductAttributeValue" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductAttributeValue_updated_date" ON "ProductAttributeValue" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductAttributeValue_created_by_id" ON "ProductAttributeValue" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductAttributeValue_attribute_id" ON "ProductAttributeValue" ("attribute_id");

CREATE TABLE IF NOT EXISTS "ProductBarcode" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_variant_id" TEXT,
  "barcode" TEXT,
  "barcode_type" TEXT,
  "is_primary" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductBarcode_created_date" ON "ProductBarcode" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductBarcode_updated_date" ON "ProductBarcode" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductBarcode_created_by_id" ON "ProductBarcode" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductBarcode_product_variant_id" ON "ProductBarcode" ("product_variant_id");

CREATE TABLE IF NOT EXISTS "ProductBundle" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "bundle_variant_id" TEXT,
  "component_variant_id" TEXT,
  "quantity" REAL,
  "optional" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductBundle_created_date" ON "ProductBundle" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductBundle_updated_date" ON "ProductBundle" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductBundle_created_by_id" ON "ProductBundle" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductBundle_bundle_variant_id" ON "ProductBundle" ("bundle_variant_id");

CREATE INDEX IF NOT EXISTS "idx_ProductBundle_component_variant_id" ON "ProductBundle" ("component_variant_id");

CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "code" TEXT,
  "parent_category_id" TEXT,
  "active" INTEGER,
  "sort_order" REAL
);

CREATE INDEX IF NOT EXISTS "idx_ProductCategory_created_date" ON "ProductCategory" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductCategory_updated_date" ON "ProductCategory" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductCategory_created_by_id" ON "ProductCategory" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductCategory_parent_category_id" ON "ProductCategory" ("parent_category_id");

CREATE TABLE IF NOT EXISTS "ProductMaster" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "sku_base" TEXT,
  "name" TEXT,
  "short_name" TEXT,
  "item_type" TEXT,
  "category_id" TEXT,
  "category_name" TEXT,
  "unit_id" TEXT,
  "unit_name" TEXT,
  "brand" TEXT,
  "description" TEXT,
  "sellable" INTEGER,
  "purchasable" INTEGER,
  "track_stock" INTEGER,
  "has_variants" INTEGER,
  "active" INTEGER,
  "image_url" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ProductMaster_created_date" ON "ProductMaster" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductMaster_updated_date" ON "ProductMaster" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductMaster_created_by_id" ON "ProductMaster" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductMaster_category_id" ON "ProductMaster" ("category_id");

CREATE INDEX IF NOT EXISTS "idx_ProductMaster_unit_id" ON "ProductMaster" ("unit_id");

CREATE TABLE IF NOT EXISTS "ProductPriceList" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "code" TEXT,
  "channel" TEXT,
  "currency" TEXT,
  "priority" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductPriceList_created_date" ON "ProductPriceList" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceList_updated_date" ON "ProductPriceList" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceList_created_by_id" ON "ProductPriceList" ("created_by_id");

CREATE TABLE IF NOT EXISTS "ProductPriceRule" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "price_list_id" TEXT,
  "product_master_id" TEXT,
  "product_variant_id" TEXT,
  "customer_id" TEXT,
  "minimum_quantity" REAL,
  "price" REAL,
  "discount_pct" REAL,
  "starts_at" TEXT,
  "ends_at" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_created_date" ON "ProductPriceRule" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_updated_date" ON "ProductPriceRule" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_created_by_id" ON "ProductPriceRule" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_price_list_id" ON "ProductPriceRule" ("price_list_id");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_product_master_id" ON "ProductPriceRule" ("product_master_id");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_product_variant_id" ON "ProductPriceRule" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_ProductPriceRule_customer_id" ON "ProductPriceRule" ("customer_id");

CREATE TABLE IF NOT EXISTS "ProductQuote" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "quote_number" TEXT,
  "client_name" TEXT,
  "client_phone" TEXT,
  "product_id" TEXT,
  "product_group" TEXT,
  "pricing_mode" TEXT,
  "product_name" TEXT,
  "description" TEXT,
  "items_summary" TEXT,
  "line_items_count" REAL,
  "quantity" REAL,
  "width_mm" REAL,
  "height_mm" REAL,
  "depth_mm" REAL,
  "material" TEXT,
  "material_color" TEXT,
  "material_thickness_mm" REAL,
  "material_cost" REAL,
  "secondary_material" TEXT,
  "secondary_material_cost" REAL,
  "process" TEXT,
  "cut_time_min" REAL,
  "machine_cost_per_min" REAL,
  "machine_cost_total" REAL,
  "labor_hours" REAL,
  "labor_cost_hour" REAL,
  "labor_cost_total" REAL,
  "general_art_cost" REAL,
  "additional_charge" REAL,
  "subtotal_products" REAL,
  "subtotal_services" REAL,
  "finishing" TEXT,
  "finishing_cost" REAL,
  "packaging_cost" REAL,
  "freight_cost" REAL,
  "operational_loss_pct" REAL,
  "tax_pct" REAL,
  "markup_pct" REAL,
  "total_cost" REAL,
  "unit_price" REAL,
  "total_price" REAL,
  "discount_pct" REAL,
  "final_price" REAL,
  "status" TEXT,
  "valid_days" REAL,
  "deadline_days" REAL,
  "notes" TEXT,
  "internal_notes" TEXT,
  "payment_conditions" TEXT,
  "created_by_partner" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ProductQuote_created_date" ON "ProductQuote" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductQuote_updated_date" ON "ProductQuote" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductQuote_created_by_id" ON "ProductQuote" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductQuote_quote_number" ON "ProductQuote" ("quote_number");

CREATE INDEX IF NOT EXISTS "idx_ProductQuote_product_id" ON "ProductQuote" ("product_id");

CREATE TABLE IF NOT EXISTS "ProductUnit" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "symbol" TEXT,
  "precision" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductUnit_created_date" ON "ProductUnit" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductUnit_updated_date" ON "ProductUnit" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductUnit_created_by_id" ON "ProductUnit" ("created_by_id");

CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_master_id" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "name" TEXT,
  "variant_label" TEXT,
  "attribute_summary" TEXT,
  "sale_price" REAL,
  "cost_price" REAL,
  "track_stock" INTEGER,
  "sellable" INTEGER,
  "purchasable" INTEGER,
  "lot_controlled" INTEGER,
  "serial_controlled" INTEGER,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_ProductVariant_created_date" ON "ProductVariant" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductVariant_updated_date" ON "ProductVariant" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductVariant_created_by_id" ON "ProductVariant" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductVariant_product_master_id" ON "ProductVariant" ("product_master_id");

CREATE TABLE IF NOT EXISTS "ProductionQueue" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "title" TEXT,
  "client_name" TEXT,
  "sales_order_id" TEXT,
  "service_order_id" TEXT,
  "material" TEXT,
  "machine" TEXT,
  "priority" TEXT,
  "operation_type" TEXT,
  "perimeter" REAL,
  "engraving_area" REAL,
  "estimated_time" REAL,
  "actual_time" REAL,
  "status" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ProductionQueue_created_date" ON "ProductionQueue" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ProductionQueue_updated_date" ON "ProductionQueue" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ProductionQueue_created_by_id" ON "ProductionQueue" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ProductionQueue_sales_order_id" ON "ProductionQueue" ("sales_order_id");

CREATE INDEX IF NOT EXISTS "idx_ProductionQueue_service_order_id" ON "ProductionQueue" ("service_order_id");

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "supplier_id" TEXT,
  "supplier_name" TEXT,
  "items" TEXT,
  "total" REAL,
  "status" TEXT,
  "order_date" TEXT,
  "delivery_date" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_PurchaseOrder_created_date" ON "PurchaseOrder" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_PurchaseOrder_updated_date" ON "PurchaseOrder" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_PurchaseOrder_created_by_id" ON "PurchaseOrder" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_PurchaseOrder_supplier_id" ON "PurchaseOrder" ("supplier_id");

CREATE TABLE IF NOT EXISTS "Quotation" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "quotation_number" TEXT,
  "customer_id" TEXT,
  "customer_name" TEXT,
  "price_list_id" TEXT,
  "status" TEXT,
  "valid_until" TEXT,
  "subtotal" REAL,
  "discount_amount" REAL,
  "total" REAL,
  "origin" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Quotation_created_date" ON "Quotation" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Quotation_updated_date" ON "Quotation" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Quotation_created_by_id" ON "Quotation" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_Quotation_quotation_number" ON "Quotation" ("quotation_number");

CREATE INDEX IF NOT EXISTS "idx_Quotation_customer_id" ON "Quotation" ("customer_id");

CREATE INDEX IF NOT EXISTS "idx_Quotation_price_list_id" ON "Quotation" ("price_list_id");

CREATE TABLE IF NOT EXISTS "QuotationItem" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "quotation_id" TEXT,
  "product_id" TEXT,
  "product_variant_id" TEXT,
  "product_name" TEXT,
  "pricing_mode" TEXT,
  "description" TEXT,
  "item_notes" TEXT,
  "quantity" REAL,
  "unit" TEXT,
  "width_mm" REAL,
  "height_mm" REAL,
  "base_price" REAL,
  "unit_price" REAL,
  "base_subtotal" REAL,
  "services_total" REAL,
  "material_cost" REAL,
  "labor_hours" REAL,
  "labor_cost_hour" REAL,
  "labor_cost_total" REAL,
  "machine_time_min" REAL,
  "machine_cost_per_min" REAL,
  "machine_cost_total" REAL,
  "art_type" TEXT,
  "art_cost" REAL,
  "art_description" TEXT,
  "discount_pct" REAL,
  "total_cost" REAL,
  "total" REAL,
  "warehouse_id" TEXT,
  "projected_available" REAL
);

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_created_date" ON "QuotationItem" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_updated_date" ON "QuotationItem" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_created_by_id" ON "QuotationItem" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_quotation_id" ON "QuotationItem" ("quotation_id");

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_product_id" ON "QuotationItem" ("product_id");

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_product_variant_id" ON "QuotationItem" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_QuotationItem_warehouse_id" ON "QuotationItem" ("warehouse_id");

CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "client_name" TEXT,
  "client_id" TEXT,
  "client_phone" TEXT,
  "items" TEXT,
  "subtotal" REAL,
  "discount" REAL,
  "total" REAL,
  "validity_days" REAL,
  "status" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Quote_created_date" ON "Quote" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Quote_updated_date" ON "Quote" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Quote_created_by_id" ON "Quote" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_Quote_client_id" ON "Quote" ("client_id");

CREATE TABLE IF NOT EXISTS "QuoteCatalogItem" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "category" TEXT,
  "unit" TEXT,
  "unit_cost" REAL,
  "machine" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_QuoteCatalogItem_created_date" ON "QuoteCatalogItem" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_QuoteCatalogItem_updated_date" ON "QuoteCatalogItem" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_QuoteCatalogItem_created_by_id" ON "QuoteCatalogItem" ("created_by_id");

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "code" TEXT,
  "scope_level" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_Role_created_date" ON "Role" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Role_updated_date" ON "Role" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Role_created_by_id" ON "Role" ("created_by_id");

CREATE TABLE IF NOT EXISTS "SaleReturn" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "return_number" TEXT,
  "sales_order_id" TEXT,
  "customer_id" TEXT,
  "customer_name" TEXT,
  "status" TEXT,
  "total" REAL,
  "reason" TEXT,
  "return_date" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_SaleReturn_created_date" ON "SaleReturn" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_SaleReturn_updated_date" ON "SaleReturn" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_SaleReturn_created_by_id" ON "SaleReturn" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_SaleReturn_return_number" ON "SaleReturn" ("return_number");

CREATE INDEX IF NOT EXISTS "idx_SaleReturn_sales_order_id" ON "SaleReturn" ("sales_order_id");

CREATE INDEX IF NOT EXISTS "idx_SaleReturn_customer_id" ON "SaleReturn" ("customer_id");

CREATE TABLE IF NOT EXISTS "SaleReturnItem" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "sale_return_id" TEXT,
  "product_variant_id" TEXT,
  "quantity" REAL,
  "unit_price" REAL,
  "total" REAL,
  "reason" TEXT,
  "restock" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_SaleReturnItem_created_date" ON "SaleReturnItem" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_SaleReturnItem_updated_date" ON "SaleReturnItem" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_SaleReturnItem_created_by_id" ON "SaleReturnItem" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_SaleReturnItem_sale_return_id" ON "SaleReturnItem" ("sale_return_id");

CREATE INDEX IF NOT EXISTS "idx_SaleReturnItem_product_variant_id" ON "SaleReturnItem" ("product_variant_id");

CREATE TABLE IF NOT EXISTS "SalesOrder" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "order_number" TEXT,
  "client_id" TEXT,
  "client_name" TEXT,
  "product_id" TEXT,
  "product_group" TEXT,
  "pricing_mode" TEXT,
  "quantity" REAL,
  "unit_price" REAL,
  "width_mm" REAL,
  "height_mm" REAL,
  "items" TEXT,
  "line_items_count" REAL,
  "subtotal" REAL,
  "discount_percent" REAL,
  "labor_hours" REAL,
  "labor_cost_hour" REAL,
  "labor_cost_total" REAL,
  "machine_time_min" REAL,
  "machine_cost_per_min" REAL,
  "machine_cost_total" REAL,
  "general_art_cost" REAL,
  "additional_charge" REAL,
  "total_cost" REAL,
  "total" REAL,
  "payment_method" TEXT,
  "delivery_date" TEXT,
  "notes" TEXT,
  "status" TEXT,
  "payment_status" TEXT,
  "transaction_id" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_created_date" ON "SalesOrder" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_updated_date" ON "SalesOrder" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_created_by_id" ON "SalesOrder" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_order_number" ON "SalesOrder" ("order_number");

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_client_id" ON "SalesOrder" ("client_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_product_id" ON "SalesOrder" ("product_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrder_transaction_id" ON "SalesOrder" ("transaction_id");

CREATE TABLE IF NOT EXISTS "SalesOrderItem" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "sales_order_id" TEXT,
  "product_id" TEXT,
  "product_variant_id" TEXT,
  "product_name" TEXT,
  "pricing_mode" TEXT,
  "description" TEXT,
  "item_notes" TEXT,
  "quantity" REAL,
  "unit" TEXT,
  "width_mm" REAL,
  "height_mm" REAL,
  "base_price" REAL,
  "unit_price" REAL,
  "base_subtotal" REAL,
  "services_total" REAL,
  "material_cost" REAL,
  "labor_hours" REAL,
  "labor_cost_hour" REAL,
  "labor_cost_total" REAL,
  "machine_time_min" REAL,
  "machine_cost_per_min" REAL,
  "machine_cost_total" REAL,
  "art_type" TEXT,
  "art_cost" REAL,
  "art_description" TEXT,
  "discount_pct" REAL,
  "total_cost" REAL,
  "total" REAL,
  "warehouse_id" TEXT,
  "reservation_id" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_created_date" ON "SalesOrderItem" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_updated_date" ON "SalesOrderItem" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_created_by_id" ON "SalesOrderItem" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_sales_order_id" ON "SalesOrderItem" ("sales_order_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_product_id" ON "SalesOrderItem" ("product_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_product_variant_id" ON "SalesOrderItem" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_warehouse_id" ON "SalesOrderItem" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_SalesOrderItem_reservation_id" ON "SalesOrderItem" ("reservation_id");

CREATE TABLE IF NOT EXISTS "ScrapInventory" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "material" TEXT,
  "width" REAL,
  "height" REAL,
  "thickness" REAL,
  "area" REAL,
  "status" TEXT,
  "location" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ScrapInventory_created_date" ON "ScrapInventory" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ScrapInventory_updated_date" ON "ScrapInventory" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ScrapInventory_created_by_id" ON "ScrapInventory" ("created_by_id");

CREATE TABLE IF NOT EXISTS "SellerCommission" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "seller_name" TEXT,
  "order_id" TEXT,
  "order_total" REAL,
  "commission_percent" REAL,
  "commission_value" REAL,
  "paid" INTEGER,
  "paid_date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_SellerCommission_created_date" ON "SellerCommission" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_SellerCommission_updated_date" ON "SellerCommission" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_SellerCommission_created_by_id" ON "SellerCommission" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_SellerCommission_order_id" ON "SellerCommission" ("order_id");

CREATE TABLE IF NOT EXISTS "SerialNumber" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_variant_id" TEXT,
  "serial" TEXT,
  "warehouse_id" TEXT,
  "location_id" TEXT,
  "status" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_SerialNumber_created_date" ON "SerialNumber" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_SerialNumber_updated_date" ON "SerialNumber" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_SerialNumber_created_by_id" ON "SerialNumber" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_SerialNumber_product_variant_id" ON "SerialNumber" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_SerialNumber_warehouse_id" ON "SerialNumber" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_SerialNumber_location_id" ON "SerialNumber" ("location_id");

CREATE TABLE IF NOT EXISTS "ServiceOrder" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "title" TEXT,
  "client_id" TEXT,
  "client_name" TEXT,
  "sales_order_id" TEXT,
  "description" TEXT,
  "priority" TEXT,
  "estimated_hours" REAL,
  "deadline" TEXT,
  "status" TEXT,
  "started_at" TEXT,
  "completed_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_ServiceOrder_created_date" ON "ServiceOrder" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_ServiceOrder_updated_date" ON "ServiceOrder" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_ServiceOrder_created_by_id" ON "ServiceOrder" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_ServiceOrder_client_id" ON "ServiceOrder" ("client_id");

CREATE INDEX IF NOT EXISTS "idx_ServiceOrder_sales_order_id" ON "ServiceOrder" ("sales_order_id");

CREATE TABLE IF NOT EXISTS "StockAdjustment" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "adjustment_number" TEXT,
  "warehouse_id" TEXT,
  "location_id" TEXT,
  "reason" TEXT,
  "status" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_created_date" ON "StockAdjustment" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_updated_date" ON "StockAdjustment" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_created_by_id" ON "StockAdjustment" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_adjustment_number" ON "StockAdjustment" ("adjustment_number");

CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_warehouse_id" ON "StockAdjustment" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_StockAdjustment_location_id" ON "StockAdjustment" ("location_id");

CREATE TABLE IF NOT EXISTS "StockBalanceSnapshot" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_variant_id" TEXT,
  "warehouse_id" TEXT,
  "location_id" TEXT,
  "on_hand" REAL,
  "reserved" REAL,
  "available" REAL,
  "average_cost" REAL,
  "snapshot_date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockBalanceSnapshot_created_date" ON "StockBalanceSnapshot" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockBalanceSnapshot_updated_date" ON "StockBalanceSnapshot" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockBalanceSnapshot_created_by_id" ON "StockBalanceSnapshot" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockBalanceSnapshot_product_variant_id" ON "StockBalanceSnapshot" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_StockBalanceSnapshot_warehouse_id" ON "StockBalanceSnapshot" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_StockBalanceSnapshot_location_id" ON "StockBalanceSnapshot" ("location_id");

CREATE TABLE IF NOT EXISTS "StockCountItem" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "session_id" TEXT,
  "product_variant_id" TEXT,
  "location_id" TEXT,
  "expected_quantity" REAL,
  "counted_quantity" REAL,
  "difference_quantity" REAL,
  "reason" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockCountItem_created_date" ON "StockCountItem" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockCountItem_updated_date" ON "StockCountItem" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockCountItem_created_by_id" ON "StockCountItem" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockCountItem_session_id" ON "StockCountItem" ("session_id");

CREATE INDEX IF NOT EXISTS "idx_StockCountItem_product_variant_id" ON "StockCountItem" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_StockCountItem_location_id" ON "StockCountItem" ("location_id");

CREATE TABLE IF NOT EXISTS "StockCountSession" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "session_number" TEXT,
  "warehouse_id" TEXT,
  "status" TEXT,
  "scheduled_date" TEXT,
  "started_at" TEXT,
  "completed_at" TEXT,
  "responsible_user_email" TEXT,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockCountSession_created_date" ON "StockCountSession" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockCountSession_updated_date" ON "StockCountSession" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockCountSession_created_by_id" ON "StockCountSession" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockCountSession_session_number" ON "StockCountSession" ("session_number");

CREATE INDEX IF NOT EXISTS "idx_StockCountSession_warehouse_id" ON "StockCountSession" ("warehouse_id");

CREATE TABLE IF NOT EXISTS "StockLocation" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "warehouse_id" TEXT,
  "warehouse_name" TEXT,
  "name" TEXT,
  "code" TEXT,
  "parent_location_id" TEXT,
  "picking_sequence" REAL,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_StockLocation_created_date" ON "StockLocation" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockLocation_updated_date" ON "StockLocation" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockLocation_created_by_id" ON "StockLocation" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockLocation_warehouse_id" ON "StockLocation" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_StockLocation_parent_location_id" ON "StockLocation" ("parent_location_id");

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_id" TEXT,
  "product_name" TEXT,
  "type" TEXT,
  "quantity" REAL,
  "reason" TEXT,
  "date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockMovement_created_date" ON "StockMovement" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockMovement_updated_date" ON "StockMovement" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockMovement_created_by_id" ON "StockMovement" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovement_product_id" ON "StockMovement" ("product_id");

CREATE TABLE IF NOT EXISTS "StockMovementItem" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "movement_number" TEXT,
  "movement_type" TEXT,
  "product_variant_id" TEXT,
  "warehouse_from_id" TEXT,
  "location_from_id" TEXT,
  "warehouse_to_id" TEXT,
  "location_to_id" TEXT,
  "quantity" REAL,
  "unit_cost" REAL,
  "reason" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "status" TEXT,
  "movement_date" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_created_date" ON "StockMovementItem" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_updated_date" ON "StockMovementItem" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_created_by_id" ON "StockMovementItem" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_movement_number" ON "StockMovementItem" ("movement_number");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_product_variant_id" ON "StockMovementItem" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_warehouse_from_id" ON "StockMovementItem" ("warehouse_from_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_location_from_id" ON "StockMovementItem" ("location_from_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_warehouse_to_id" ON "StockMovementItem" ("warehouse_to_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_location_to_id" ON "StockMovementItem" ("location_to_id");

CREATE INDEX IF NOT EXISTS "idx_StockMovementItem_reference_id" ON "StockMovementItem" ("reference_id");

CREATE TABLE IF NOT EXISTS "StockReservation" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_variant_id" TEXT,
  "warehouse_id" TEXT,
  "location_id" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "quantity" REAL,
  "status" TEXT,
  "expires_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_StockReservation_created_date" ON "StockReservation" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_StockReservation_updated_date" ON "StockReservation" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_StockReservation_created_by_id" ON "StockReservation" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_StockReservation_product_variant_id" ON "StockReservation" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_StockReservation_warehouse_id" ON "StockReservation" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_StockReservation_location_id" ON "StockReservation" ("location_id");

CREATE INDEX IF NOT EXISTS "idx_StockReservation_reference_id" ON "StockReservation" ("reference_id");

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "company_name" TEXT,
  "cnpj" TEXT,
  "contact_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "category" TEXT,
  "rating" REAL,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_Supplier_created_date" ON "Supplier" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Supplier_updated_date" ON "Supplier" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Supplier_created_by_id" ON "Supplier" ("created_by_id");

CREATE TABLE IF NOT EXISTS "TaxConfig" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "type" TEXT,
  "rate" REAL,
  "calculation_base" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_TaxConfig_created_date" ON "TaxConfig" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_TaxConfig_updated_date" ON "TaxConfig" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_TaxConfig_created_by_id" ON "TaxConfig" ("created_by_id");

CREATE TABLE IF NOT EXISTS "TimeEntry" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "employee_name" TEXT,
  "date" TEXT,
  "hours" REAL,
  "hourly_rate" REAL,
  "total_cost" REAL,
  "task_description" TEXT,
  "service_order_id" TEXT,
  "production_queue_id" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_TimeEntry_created_date" ON "TimeEntry" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_TimeEntry_updated_date" ON "TimeEntry" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_TimeEntry_created_by_id" ON "TimeEntry" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_TimeEntry_service_order_id" ON "TimeEntry" ("service_order_id");

CREATE INDEX IF NOT EXISTS "idx_TimeEntry_production_queue_id" ON "TimeEntry" ("production_queue_id");

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "type" TEXT,
  "amount" REAL,
  "description" TEXT,
  "category" TEXT,
  "payment_method" TEXT,
  "date" TEXT,
  "partner" TEXT,
  "client_id" TEXT,
  "order_id" TEXT,
  "confirmed" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_Transaction_created_date" ON "Transaction" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Transaction_updated_date" ON "Transaction" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Transaction_created_by_id" ON "Transaction" ("created_by_id");

CREATE INDEX IF NOT EXISTS "idx_Transaction_client_id" ON "Transaction" ("client_id");

CREATE INDEX IF NOT EXISTS "idx_Transaction_order_id" ON "Transaction" ("order_id");

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "role" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_User_created_date" ON "User" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_User_updated_date" ON "User" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_User_created_by_id" ON "User" ("created_by_id");

CREATE TABLE IF NOT EXISTS "VolumePricing" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "product_name" TEXT,
  "min_quantity" REAL,
  "max_quantity" REAL,
  "unit_price" REAL,
  "discount_percent" REAL
);

CREATE INDEX IF NOT EXISTS "idx_VolumePricing_created_date" ON "VolumePricing" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_VolumePricing_updated_date" ON "VolumePricing" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_VolumePricing_created_by_id" ON "VolumePricing" ("created_by_id");

CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "name" TEXT,
  "code" TEXT,
  "type" TEXT,
  "active" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_Warehouse_created_date" ON "Warehouse" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_Warehouse_updated_date" ON "Warehouse" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_Warehouse_created_by_id" ON "Warehouse" ("created_by_id");

CREATE TABLE IF NOT EXISTS "WhatsAppConfig" (
  "id" TEXT PRIMARY KEY,
  "created_date" TEXT,
  "updated_date" TEXT,
  "created_by_id" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "is_sample" INTEGER,
  "api_url" TEXT,
  "api_key" TEXT,
  "instance_name" TEXT,
  "connected" INTEGER,
  "last_check" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_WhatsAppConfig_created_date" ON "WhatsAppConfig" ("created_date");

CREATE INDEX IF NOT EXISTS "idx_WhatsAppConfig_updated_date" ON "WhatsAppConfig" ("updated_date");

CREATE INDEX IF NOT EXISTS "idx_WhatsAppConfig_created_by_id" ON "WhatsAppConfig" ("created_by_id");
