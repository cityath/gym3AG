import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import DynamicIcon from '@/components/ui/dynamic-icon';

interface IconPickerProps {
  value?: string;
  onChange: (icon: string) => void;
}

const iconList = [
  'Activity', 'Award', 'Bike', 'Dumbbell', 'Flame', 'HeartPulse',
  'PersonStanding', 'Waves', 'Weight', 'Zap', 'Sunrise', 'Sunset',
  'Footprints', 'Leaf', 'Sprout', 'Target', 'Trophy', 'Wind', 'Star'
];

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {value ? (
            <div className="flex items-center gap-2">
              <DynamicIcon name={value} className="h-5 w-5" />
              <span>{value}</span>
            </div>
          ) : (
            <span>Select icon</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <ScrollArea className="h-72">
          <div className="p-4 grid grid-cols-4 gap-2">
            {iconList.map((iconName) => (
              <Button
                key={iconName}
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={() => {
                  onChange(iconName);
                  setIsOpen(false);
                }}
              >
                <DynamicIcon name={iconName} className="h-6 w-6" />
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};