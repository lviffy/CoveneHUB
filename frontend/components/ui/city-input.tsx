'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CityInputProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  label?: string
  placeholder?: string
  className?: string
  id?: string
}

export function CityInput({
  value,
  onChange,
  required = false,
  disabled = false,
  label = 'City',
  placeholder = 'Enter your city',
  className = '',
  id = 'city',
}: CityInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Capitalize first letter of each word as user types
    const formattedValue = e.target.value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    onChange(formattedValue)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-[#010101]">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className="h-11 border-2 border-slate-200 focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20 transition-all duration-200"
        minLength={2}
        maxLength={50}
        pattern="[A-Za-z\s]{2,50}"
        title="Please enter a valid city name (2-50 characters, letters and spaces only)"
      />
    </div>
  )
}
