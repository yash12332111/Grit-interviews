"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectPersona } from "@/actions/persona";

export type SwitcherPersona = { id: string; name: string };
export type SwitcherGroup = { label: string; personas: SwitcherPersona[] };

type PersonaSwitcherProps = {
  currentId: string | null;
  groups: SwitcherGroup[];
};

export function PersonaSwitcher({ currentId, groups }: PersonaSwitcherProps) {
  const [pending, startTransition] = useTransition();
  const items = groups.flatMap((g) =>
    g.personas.map((p) => ({ value: p.id, label: p.name })),
  );

  const handleChange = (value: string | null) => {
    if (!value || value === currentId) return;
    startTransition(async () => {
      const result = await selectPersona(value);
      // On success the action redirects, so we only get here on failure.
      if (result && !result.ok) toast.error(result.error.message);
    });
  };

  return (
    <Select items={items} value={currentId} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" className="w-52 max-w-full bg-background" aria-label="Switch persona">
        <SelectValue placeholder="Choose a persona" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.personas.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
