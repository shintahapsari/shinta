import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DOSEN_LIST } from "@/lib/dosenList";

export default function DosenMultiSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (name) => {
    if (value.includes(name)) onChange(value.filter((n) => n !== name));
    else onChange([...value, name]);
  };

  return (
    <div className="mt-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" data-testid="dosen-select-trigger" className="w-full justify-between font-normal">
            {value.length ? `${value.length} dosen dipilih` : "Pilih dosen…"}
            <ChevronsUpDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari nama dosen…" data-testid="dosen-search-input" />
            <CommandList className="max-h-64 scroll-thin">
              <CommandEmpty>Dosen tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {DOSEN_LIST.map((d) => (
                  <CommandItem key={d.nama} value={d.nama} onSelect={() => toggle(d.nama)} data-testid="dosen-option" className="cursor-pointer">
                    <Check className={`mr-2 h-4 w-4 shrink-0 ${value.includes(d.nama) ? "opacity-100 text-emerald-600" : "opacity-0"}`} />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-800">{d.nama}</div>
                      <div className="text-[11px] text-slate-400">{d.kk}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2" data-testid="dosen-selected-chips">
          {value.map((n) => (
            <span key={n} className="inline-flex items-center gap-1 text-xs bg-[#0B2545]/5 border border-slate-200 rounded-full pl-2.5 pr-1.5 py-0.5 text-slate-700">
              {n}
              <button type="button" onClick={() => toggle(n)} className="text-slate-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
