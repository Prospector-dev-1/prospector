import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataMasking } from '@/hooks/useDataMasking';

interface SecureDataDisplayProps {
  data: string;
  type: 'email' | 'phone' | 'name';
  showUnmasked?: boolean;
  onToggleVisibility?: () => void;
  canToggle?: boolean;
}

export const SecureDataDisplay: React.FC<SecureDataDisplayProps> = ({
  data,
  type,
  showUnmasked = false,
  onToggleVisibility,
  canToggle = true
}) => {
  const { maskEmail, maskPhone, isAdmin } = useDataMasking();

  const getMaskedData = () => {
    if (showUnmasked || isAdmin()) {
      return data;
    }

    switch (type) {
      case 'email':
        return maskEmail(data);
      case 'phone':
        return maskPhone(data);
      case 'name':
        if (!data) return '';
        return data.length <= 2 ? data : `${data.substring(0, 1)}***`;
      default:
        return data;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">
        {getMaskedData()}
      </span>
      {canToggle && onToggleVisibility && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className="h-6 w-6 p-0"
        >
          {showUnmasked ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};