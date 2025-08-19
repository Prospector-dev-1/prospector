import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

interface SmartBackButtonProps {
  variant?: 'ghost' | 'outline' | 'default' | 'destructive' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  fallbackRoute?: string;
}

const SmartBackButton: React.FC<SmartBackButtonProps> = ({ 
  variant = 'outline', 
  size = 'default',
  className,
  fallbackRoute = '/'
}) => {
  const { goBack, getPreviousPageName } = useSmartNavigation();

  const handleBack = () => {
    goBack(fallbackRoute);
  };

  const previousPageName = getPreviousPageName();

  // Handle size variants for responsive text
  if (size === 'icon') {
    return (
      <Button 
        variant={variant} 
        size={size}
        onClick={handleBack}
        className={className}
        aria-label={`Back to ${previousPageName}`}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleBack}
      className={`flex items-center gap-2 ${className || ''}`}
    >
      <ArrowLeft className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline truncate">Back to {previousPageName}</span>
      <span className="sm:hidden truncate">Back</span>
    </Button>
  );
};

export default SmartBackButton;