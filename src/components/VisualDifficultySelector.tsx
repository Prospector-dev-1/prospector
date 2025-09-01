import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smile, Meh, Frown, Angry, Skull } from 'lucide-react';

interface DifficultyLevel {
  level: number;
  range: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
  prospects: string[];
}

interface VisualDifficultySelectorProps {
  selectedLevel: number;
  onLevelChange: (level: number) => void;
}

const difficultyLevels: DifficultyLevel[] = [
  {
    level: 2,
    range: '1-3',
    title: 'Beginner',
    description: 'Friendly and receptive prospects',
    icon: Smile,
    color: 'text-green-600',
    bgGradient: 'from-green-500/10 to-green-600/20',
    prospects: ['Interested buyers', 'Polite responses', 'Minimal objections']
  },
  {
    level: 5,
    range: '4-6',
    title: 'Intermediate',
    description: 'Standard business interactions',
    icon: Meh,
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-500/10 to-yellow-600/20',
    prospects: ['Busy decision makers', 'Some objections', 'Professional tone']
  },
  {
    level: 7,
    range: '7-8',
    title: 'Advanced',
    description: 'Skeptical and challenging prospects',
    icon: Frown,
    color: 'text-orange-600',
    bgGradient: 'from-orange-500/10 to-orange-600/20',
    prospects: ['Strong objections', 'Time pressure', 'Skeptical attitude']
  },
  {
    level: 10,
    range: '9-10',
    title: 'Expert',
    description: 'Hostile and extremely difficult',
    icon: Skull,
    color: 'text-red-600',
    bgGradient: 'from-red-500/10 to-red-600/20',
    prospects: ['Hostile responses', 'Multiple objections', 'Maximum difficulty']
  }
];

const VisualDifficultySelector: React.FC<VisualDifficultySelectorProps> = ({
  selectedLevel,
  onLevelChange
}) => {
  const getSelectedDifficulty = () => {
    if (selectedLevel <= 3) return difficultyLevels[0];
    if (selectedLevel <= 6) return difficultyLevels[1];
    if (selectedLevel <= 8) return difficultyLevels[2];
    return difficultyLevels[3];
  };

  const selectedDifficulty = getSelectedDifficulty();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Choose Your Challenge</h3>
        <p className="text-sm text-muted-foreground">
          Select how challenging you want your prospect to be
        </p>
      </div>

      {/* Difficulty Cards */}
      <div className="grid grid-cols-2 gap-3">
        {difficultyLevels.map((difficulty) => {
          const Icon = difficulty.icon;
          const isSelected = selectedDifficulty.level === difficulty.level;
          
          return (
            <Card
              key={difficulty.level}
              className={`cursor-pointer transition-all duration-300 hover:shadow-elevated hover:scale-[1.02] border-2 ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-glow' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onLevelChange(difficulty.level)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${difficulty.bgGradient}`}>
                      <Icon className={`h-5 w-5 ${difficulty.color}`} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Level {difficulty.range}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {difficulty.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {difficulty.description}
                    </p>

                    {/* Prospect characteristics */}
                    <div className="space-y-1">
                      {difficulty.prospects.map((prospect, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          {prospect}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fine-tune section */}
      {selectedDifficulty && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Fine-tune Difficulty</h4>
                <Badge className="bg-primary text-primary-foreground">
                  Level {selectedLevel}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Easier</span>
                  <span>Harder</span>
                </div>
                <input
                  type="range"
                  min={selectedDifficulty.range.split('-')[0]}
                  max={selectedDifficulty.range.split('-')[1] || selectedDifficulty.level}
                  value={selectedLevel}
                  onChange={(e) => onLevelChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VisualDifficultySelector;