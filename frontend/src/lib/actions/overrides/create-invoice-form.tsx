import { createTypedForm } from "@/lib/forms/base";
import type { GeneratedFormProps } from "@/lib/forms/types";
import type { CreateInvoiceData } from "@/openapi/litestarAPI.schemas";
import { listSurvey } from "@/openapi/survey/survey";
import { listClient } from "@/openapi/client/client";

const f = createTypedForm<CreateInvoiceData>();

async function loadSurveys() {
  const res = await listSurvey({ limit: 100 });
  return res.items.map((s) => ({
    value: s.id,
    label: `${s.survey_type} — ${s.state}`,
  }));
}

async function loadClients() {
  const res = await listClient({ limit: 100 });
  return res.items.map((c) => ({
    value: c.id,
    label: c.display_name,
  }));
}

export function CreateInvoiceForm(props: GeneratedFormProps<CreateInvoiceData>) {
  const defaults = props.defaultValues as Partial<CreateInvoiceData> | undefined;
  const surveyFromContext = !!defaults?.survey_id;
  const clientFromContext = !!defaults?.client_id;

  return (
    <f.FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.actionLabel}
      onSubmit={props.onSubmit}
      defaultValues={props.defaultValues}
      isSubmitting={props.isSubmitting}
    >
      {!surveyFromContext && (
        <f.FormCombobox name="survey_id" label="Survey" required queryFn={loadSurveys} />
      )}
      {!clientFromContext && (
        <f.FormCombobox name="client_id" label="Client" required queryFn={loadClients} />
      )}
      <f.FormString name="invoice_number" label="Invoice Number" />
      <f.FormDatetime name="due_at" label="Due Date" />
      <f.FormText name="notes" label="Notes" />
    </f.FormModal>
  );
}
