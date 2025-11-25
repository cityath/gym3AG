import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

const colors = [
  '#FFD1DC', // Pastel Pink
  '#A2D2FF', // Pastel Blue
  '#C8E6C9', // Pastel Green
  '#FFF59D', // Pastel Yellow
  '#D7BDE2', // Pastel Purple
  '#FFCCBC', // Pastel Orange
  '#B2DFDB', // Pastel Teal
  '#E0E0E0', // Pastel Gray
];

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {value ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: value }} />
              <span>{value}</span>
            </div>
          ) : (
            <span>Seleccionar color</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-4 grid grid-cols-4 gap-2">
          {colors.map((color) => (
            <Button
              key={color}
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => {
                onChange(color);
                setIsOpen(false);
              }}
            >
              <div className={cn("h-8 w-8 rounded-full border", value === color && "ring-2 ring-ring ring-offset-2")} style={{ backgroundColor: color }} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};