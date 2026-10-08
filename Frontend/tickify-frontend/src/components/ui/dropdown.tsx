import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
interface OptionObject {
  value: string;
  label: string;
}

type DropdownOption = string | OptionObject;

interface DropdownProps {
  options?: DropdownOption[]; // lista de opciones (string o {value,label})
  value?: string; // valor seleccionado
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function Dropdown({ options, value, onChange, placeholder, className, }: DropdownProps) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "appearance-none pr-9",
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
      >
        {placeholder && !(() => {
          // determine if placeholder matches an existing option label
          if (!options) return false;
          return options.some((o) => (typeof o === "string" ? o === placeholder : o.label === placeholder));
        })() && (
          <option value="" disabled className="bg-white">
            {placeholder}
          </option>
        )}

        {options?.map((opt) => {
          if (typeof opt === "string") {
            return (
              <option key={opt} value={opt} className="bg-white">
                {opt}
              </option>
            );
          }
          return (
            <option key={opt.value} value={opt.value} className="bg-white">
              {opt.label}
            </option>
          );
        })}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </span>
    </div>
  )
}
