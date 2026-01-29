import { Minus, Plus, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';

interface TextSizeControlProps {
  size: TextSize;
  onSizeChange: (size: TextSize) => void;
}

const sizes: TextSize[] = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'];
const sizeLabels: Record<TextSize, string> = {
  xs: 'XS',
  sm: 'S',
  base: 'M',
  lg: 'L',
  xl: 'XL',
  '2xl': 'XXL',
};

export const TextSizeControl = ({ size, onSizeChange }: TextSizeControlProps) => {
  const currentIndex = sizes.indexOf(size);

  const decrease = () => {
    if (currentIndex > 0) {
      onSizeChange(sizes[currentIndex - 1]);
    }
  };

  const increase = () => {
    if (currentIndex < sizes.length - 1) {
      onSizeChange(sizes[currentIndex + 1]);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={decrease}
        disabled={currentIndex === 0}
        className="h-8 w-8 p-0 hover:bg-accent"
        aria-label="Decrease text size"
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1 px-2 min-w-[70px] justify-center">
        <Type className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{sizeLabels[size]}</span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={increase}
        disabled={currentIndex === sizes.length - 1}
        className="h-8 w-8 p-0 hover:bg-accent"
        aria-label="Increase text size"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
