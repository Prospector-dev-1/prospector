import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  buttonText: string
  variant?: 'default' | 'upload' | 'progress' | 'challenges'
  onAction?: () => void
  badge?: React.ReactNode
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ className, icon: Icon, title, description, buttonText, variant = 'default', onAction, badge, ...props }, ref) => {
    const gradientClass = {
      default: 'gradient-primary',
      upload: 'gradient-upload', 
      progress: 'gradient-progress',
      challenges: 'gradient-challenges'
    }[variant];

    return (
      <Card
        ref={ref}
        className={cn(
          "glass-card hover:shadow-elevated transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden",
          className
        )}
        onClick={onAction}
        {...props}
      >
        <div className={`h-2 w-full ${gradientClass}`} />
        <CardHeader className="text-center pb-3 relative">
          {badge && (
            <div className="absolute top-4 right-4">
              {badge}
            </div>
          )}
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${gradientClass} p-0.5 group-hover:scale-110 transition-transform duration-300`}>
            <div className="w-full h-full bg-card rounded-2xl flex items-center justify-center">
              <Icon className="h-8 w-8 text-foreground" />
            </div>
          </div>
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button 
            className="w-full h-12 font-semibold group-hover:shadow-glow transition-all duration-300" 
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
          >
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    )
  }
)
FeatureCard.displayName = "FeatureCard"

export { FeatureCard }