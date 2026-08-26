import { useId } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { Check, Pipette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLOR_PALETTE } from '@/features/medications/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColorPickerProps {
  id?: string;
  /** Hex color, e.g. "#ef4444" */
  value: string;
  onChange: (color: string) => void;
}

/** Palette membership is compared case-insensitively */
function isPaletteColor(color: string): boolean {
  return COLOR_PALETTE.some((c) => c.toLowerCase() === color.toLowerCase());
}

/**
 * Relative luminance, used to pick a readable checkmark colour on top of the
 * swatch. Custom colours can be very light or very dark, so a fixed white
 * check would disappear on pale picks.
 */
function isLightColor(hex: string): boolean {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return false;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  // ITU-R BT.601 luma
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/**
 * Colour selection with two paths: the shared palette for quick, consistent
 * picks, and a free colour picker in a popover for anything else.
 */
export function ColorPicker({ id, value, onChange }: ColorPickerProps) {
  const custom = !isPaletteColor(value);
  // Unique per instance so two pickers on one page keep valid label targets
  const hexInputId = `${useId()}-hex`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_PALETTE.map((color) => {
          const selected = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`رنگ ${color}`}
              aria-pressed={selected}
              className={cn(
                'size-9 rounded-full border-2 flex items-center justify-center transition-transform',
                selected
                  ? 'border-foreground scale-110'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: color }}
            >
              {selected && (
                <Check
                  className={cn(
                    'h-4 w-4',
                    isLightColor(color) ? 'text-black/70' : 'text-white',
                  )}
                />
              )}
            </button>
          );
        })}

        {/* Free colour choice */}
        <Popover>
          <PopoverTrigger
            id={id}
            // type="button" matters: this sits inside a form and must not submit
            type="button"
            aria-label="انتخاب رنگ دلخواه"
            className={cn(
              'size-9 rounded-full border-2 cursor-pointer',
              'flex items-center justify-center transition-transform',
              custom
                ? 'border-foreground scale-110'
                : 'border-transparent hover:scale-105',
            )}
            style={
              custom
                ? { backgroundColor: value }
                : {
                    // Rainbow hint so the affordance reads as "any colour"
                    background:
                      'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                  }
            }
          >
            {custom ? (
              <Check
                className={cn(
                  'h-4 w-4',
                  isLightColor(value) ? 'text-black/70' : 'text-white',
                )}
              />
            ) : (
              <Pipette className="h-4 w-4 text-white drop-shadow" />
            )}
          </PopoverTrigger>

          <PopoverContent className="w-auto gap-3">
            {/* react-colorful sizes itself through its root element */}
            <HexColorPicker
              color={value}
              onChange={onChange}
              style={{ width: 208, height: 168 }}
            />

            <div className="space-y-1.5">
              <label htmlFor={hexInputId} className="text-xs text-muted-foreground">
                کد رنگ
              </label>
              <HexColorInput
                id={hexInputId}
                color={value}
                onChange={onChange}
                prefixed
                dir="ltr"
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-sm uppercase transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* <p className="text-xs text-muted-foreground">
        {custom ? 'رنگ دلخواه' : 'از پالت'}:{' '}
        <span className="font-mono" dir="ltr">
          {value.toUpperCase()}
        </span>
      </p> */}
    </div>
  );
}
