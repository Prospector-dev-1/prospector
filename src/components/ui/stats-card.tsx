import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'success' | 'warning' | 'info'
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, label, value, icon: Icon, variant = 'default', ...props }, ref) => {
    const colorClasses = {
      default: 'text-primary',
      success: 'text-green-500',
      warning: 'text-yellow-500', 
      info: 'text-blue-500'
    }[variant];

    return (
      <Card
        ref={ref}
        className={cn(
          "glass-card hover:shadow-elevated transition-all duration-200 hover:scale-[1.02]",
          className
        )}
        {...props}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <Icon className={cn("h-6 w-6", colorClasses)} />
          </div>
        </CardContent>
      </Card>
    )
  }
)
StatsCard.displayName = "StatsCard"

export { StatsCard }