import { useState } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldTypeEnum } from '@/lib/form-dsl/types';
import type {
  FormDefinition,
  FormField,
  FormSection,
} from '@/lib/form-dsl/types';

interface Props {
  value: FormDefinition;
  onChange: (v: FormDefinition) => void;
}

function newId(prefix: string) {
  return prefix + crypto.randomUUID().replace(/-/g, '');
}

function newField(): FormField {
  return {
    id: newId('f'),
    type: FieldTypeEnum.text,
    label: '',
    required: false,
    config: {},
  };
}

function newSection(): FormSection {
  return { id: newId('s'), title: '', fields: [] };
}

export function DynamicFormBuilder({ value, onChange }: Props) {
  const sections = value.sections ?? [];

  function updateSections(next: FormSection[]) {
    onChange({ ...value, sections: next });
  }

  function addSection() {
    updateSections([...sections, newSection()]);
  }

  function deleteSection(si: number) {
    updateSections(sections.filter((_, i) => i !== si));
  }

  function moveSection(si: number, dir: -1 | 1) {
    const next = [...sections];
    const target = si + dir;
    if (target < 0 || target >= next.length) return;
    [next[si], next[target]] = [next[target], next[si]];
    updateSections(next);
  }

  function updateSection(si: number, patch: Partial<FormSection>) {
    updateSections(sections.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <SectionEditor
          key={section.id}
          section={section}
          index={si}
          total={sections.length}
          onMove={(dir) => moveSection(si, dir)}
          onDelete={() => deleteSection(si)}
          onUpdateTitle={(title) => updateSection(si, { title })}
          onUpdateFields={(fields) => updateSection(si, { fields })}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSection}
        className="w-full"
      >
        <Plus className="mr-1 h-4 w-4" /> Add Section
      </Button>
    </div>
  );
}

interface SectionEditorProps {
  section: FormSection;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onUpdateTitle: (t: string) => void;
  onUpdateFields: (fields: FormField[]) => void;
}

function SectionEditor({
  section,
  index,
  total,
  onMove,
  onDelete,
  onUpdateTitle,
  onUpdateFields,
}: SectionEditorProps) {
  return (
    <div className="border-border bg-card space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Input
          value={section.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Section title"
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMove(-1)}
          disabled={index === 0}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="pl-2">
        <FieldListEditor
          fields={section.fields ?? []}
          onChange={onUpdateFields}
        />
      </div>
    </div>
  );
}

interface FieldListEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

function FieldListEditor({ fields, onChange }: FieldListEditorProps) {
  function addField() {
    onChange([...fields, newField()]);
  }

  function deleteField(fi: number) {
    onChange(fields.filter((_, i) => i !== fi));
  }

  function updateField(fi: number, patch: Partial<FormField>) {
    onChange(fields.map((f, i) => (i === fi ? { ...f, ...patch } : f)));
  }

  return (
    <div className="space-y-2">
      {fields.map((field, fi) => (
        <FieldEditor
          key={field.id}
          field={field}
          onChange={(patch) => updateField(fi, patch)}
          onDelete={() => deleteField(fi)}
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addField}
        className="text-muted-foreground"
      >
        <Plus className="mr-1 h-3 w-3" /> Add Field
      </Button>
    </div>
  );
}

interface FieldEditorProps {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  onDelete: () => void;
}

function FieldEditor({ field, onChange, onDelete }: FieldEditorProps) {
  const [newOption, setNewOption] = useState('');
  const config = field.config ?? {};
  const options = (config.options as string[] | undefined) ?? [];
  const unit = config.unit as string | undefined;

  function updateConfig(patch: Record<string, unknown>) {
    onChange({ config: { ...config, ...patch } });
  }

  function addOption() {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    updateConfig({ options: [...options, trimmed] });
    setNewOption('');
  }

  function removeOption(opt: string) {
    updateConfig({ options: options.filter((o) => o !== opt) });
  }

  const isOptionField =
    field.type === FieldTypeEnum.select ||
    field.type === FieldTypeEnum.multiselect ||
    field.type === FieldTypeEnum.segmented;

  const isGroup = field.type === FieldTypeEnum.group;

  return (
    <div className="border-border/50 bg-background space-y-2 rounded border p-3">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Field label"
          className="flex-1"
        />
        <Select
          value={field.type}
          onValueChange={(v) =>
            onChange({ type: v as typeof field.type, config: {} })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(FieldTypeEnum).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Checkbox
            id={`req-${field.id}`}
            checked={field.required ?? false}
            onCheckedChange={(v) => onChange({ required: !!v })}
          />
          <Label
            htmlFor={`req-${field.id}`}
            className="text-muted-foreground text-xs whitespace-nowrap"
          >
            Required
          </Label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isOptionField && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {options.map((opt) => (
              <span
                key={opt}
                className="bg-muted flex items-center gap-0.5 rounded px-2 py-0.5 text-xs"
              >
                {opt}
                <button
                  type="button"
                  onClick={() => removeOption(opt)}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOption();
              }
            }}
            placeholder="Add option, press Enter"
            className="h-7 text-xs"
          />
        </div>
      )}

      {field.type === FieldTypeEnum.number && (
        <Input
          value={unit ?? ''}
          onChange={(e) => updateConfig({ unit: e.target.value || undefined })}
          placeholder="Unit (e.g. ft, lbs)"
          className="h-7 w-40 text-xs"
        />
      )}

      {isGroup && (
        <div className="border-border/60 rounded border border-dashed p-2 pl-3">
          <FieldListEditor
            fields={field.fields ?? []}
            onChange={(next) => onChange({ fields: next })}
          />
        </div>
      )}
    </div>
  );
}
