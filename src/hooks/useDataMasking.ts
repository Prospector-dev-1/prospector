import { useAuth } from "@/contexts/AuthContext";

export const useDataMasking = () => {
  const { user } = useAuth();

  const maskEmail = (email: string): string => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    return `${localPart.substring(0, 2)}***@${domain}`;
  };

  const maskPhone = (phone: string): string => {
    if (!phone) return '';
    if (phone.length <= 5) return phone;
    return `${phone.substring(0, 3)}***${phone.substring(phone.length - 2)}`;
  };

  const isAdmin = () => {
    // This would need to be enhanced to check actual admin role
    // For now, returning false as default
    return false;
  };

  const maskSensitiveData = (data: {
    email?: string;
    phone?: string;
    [key: string]: any;
  }) => {
    if (isAdmin()) {
      return data; // Admins see unmasked data
    }

    return {
      ...data,
      email: data.email ? maskEmail(data.email) : undefined,
      phone: data.phone ? maskPhone(data.phone) : undefined,
    };
  };

  return {
    maskEmail,
    maskPhone,
    maskSensitiveData,
    isAdmin,
  };
};