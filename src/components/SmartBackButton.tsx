import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';

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
  const navigate = useNavigate();
  const { getPreviousPageName, hasPreviousPage } = useNavigationHistory();

  const handleBack = () => {
    if (hasPreviousPage) {
      navigate(-1);
    } else {
      navigate(fallbackRoute);
    }
  };

  const previousPageName = getPreviousPageName();

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleBack}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to {previousPageName}
    </Button>
  );
};

export default SmartBackButton;