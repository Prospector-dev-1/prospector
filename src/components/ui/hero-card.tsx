import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface HeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle: string
  userName: string
  credits: number
  subscriptionType?: string
  onCreditsClick?: () => void
}

const HeroCard = React.forwardRef<HTMLDivElement, HeroCardProps>(
  ({ className, title, subtitle, userName, credits, subscriptionType, onCreditsClick, ...props }, ref) => {
    const getPlanBadge = () => {
      switch (subscriptionType) {
        case 'premium':
          return <Badge className="bg-primary text-primary-foreground">Premium</Badge>;
        case 'beginner':
          return <Badge className="bg-secondary text-secondary-foreground">Beginner</Badge>;
        default:
          return <Badge variant="outline" className="cursor-pointer hover:bg-secondary/80" onClick={onCreditsClick}>Free</Badge>;
      }
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "glass-card gradient-card border-2 border-primary/20 hover:border-primary/40 transition-all duration-300",
          className
        )}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full gradient-primary p-0.5">
                <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {getPlanBadge()}
              </div>
            </div>
            <div 
              className="text-right cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={onCreditsClick}
            >
              <p className="text-2xl font-bold text-primary">{credits}</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </CardContent>
      </Card>
    )
  }
)
HeroCard.displayName = "HeroCard"

export { HeroCard }