import * as React from "react";
import { Button } from "@/components/ui/button";

interface NumberInputProps {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function NumberInput({
  name,
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  placeholder,
  className,
  required,
}: NumberInputProps) {
  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input for user to type
    if (inputValue === '') {
      onChange(min);
      return;
    }
    
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
    }
  };

  const handleBlur = () => {
    // Ensure value is within bounds when user leaves the field
    if (value < min) {
      onChange(min);
    } else if (value > max) {
      onChange(max);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </Button>
        
        <input
          id={name}
          name={name}
          type="number"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}
