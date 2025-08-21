import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileX, 
  Copy, 
  Radio, 
  Cloud, 
  Route, 
  Package, 
  Archive,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Download
} from 'lucide-react';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';

interface FindingItem {
  file?: string;
  function?: string;
  type?: string;
  files?: string[];
  description?: string;
  method?: string;
  types?: string[];
  export?: string;
  severity: '✅' | '⚠️' | '❓';
  referenced?: boolean;
}

interface CleanupData {
  duplicateTranscriptLogic: FindingItem[];
  transcriptListeners: FindingItem[];
  unreferencedEdgeFunctions: FindingItem[];
  deadRoutes: FindingItem[];
  unusedExports: FindingItem[];
  oldBackupFiles: FindingItem[];
  unusedFiles: FindingItem[];
}

const cleanupData: CleanupData = {
  duplicateTranscriptLogic: [
    {
      type: "transcript-processing",
      files: [
        "src/hooks/useTranscriptProcessor.ts",
        "src/hooks/useTranscriptManager.ts",
        "src/utils/transcriptPersistence.ts"
      ],
      description: "Multiple transcript processing systems with overlapping deduplication and management logic. useTranscriptProcessor has advanced deduplication, useTranscriptManager wraps it for legacy compatibility, and transcriptPersistence handles database storage.",
      severity: "⚠️"
    },
    {
      type: "transcript-display",
      files: [
        "src/components/TranscriptDisplay.tsx",
        "src/components/EnhancedTranscriptDisplay.tsx"
      ],
      description: "Two similar transcript display components. TranscriptDisplay handles live/final view switching, EnhancedTranscriptDisplay shows timestamped entries with highlighting. Consider consolidating.",
      severity: "⚠️"
    }
  ],
  transcriptListeners: [
    {
      file: "src/hooks/useTranscriptManager.ts",
      method: "handleVapiMessage",
      types: ["transcript", "conversation-update", "speech-update"],
      description: "Primary transcript processing hub with comprehensive message handling",
      severity: "⚠️"
    },
    {
      file: "src/hooks/useCallEventManager.ts", 
      method: "extractTranscriptFromMessage",
      types: ["transcript"],
      description: "Alternative transcript extraction with different parsing logic",
      severity: "⚠️"
    },
    {
      file: "src/hooks/useRealtimeAIChat.ts",
      method: "vapi.on('message')",
      types: ["transcript"],
      description: "Legacy transcript listener that explicitly avoids processing (comment says useTranscriptManager handles it)",
      severity: "❓"
    }
  ],
  unreferencedEdgeFunctions: [
    {
      function: "analyze-call-coaching-enhanced",
      description: "Enhanced version of call coaching analysis. Never invoked in client code.",
      severity: "✅"
    },
    {
      function: "analyze-enhanced-conversation", 
      description: "Enhanced conversation analysis. No client references found.",
      severity: "✅"
    },
    {
      function: "analyze-replay-conversation",
      description: "Replay conversation analysis. No client invocations found.", 
      severity: "✅"
    },
    {
      function: "check-subscription",
      description: "Subscription checking logic. Not invoked by client code.",
      severity: "✅"
    },
    {
      function: "create-call-replay",
      description: "Call replay creation. No client references found.",
      severity: "✅"
    },
    {
      function: "generate-custom-script-enhanced",
      description: "Enhanced script generation. Not invoked in client.",
      severity: "✅"
    },
    {
      function: "start-enhanced-ai-conversation",
      description: "Enhanced AI conversation starter. No client usage found.",
      severity: "✅"
    },
    {
      function: "start-replay-conversation",
      description: "Replay conversation starter. Not invoked by client.",
      severity: "✅"
    }
  ],
  deadRoutes: [],
  unusedExports: [
    {
      file: "src/utils/consoleCapture.ts",
      export: "ConsoleCapture class - only used as singleton",
      description: "The ConsoleCapture class is exported but only the singleton instance is used",
      severity: "❓"
    },
    {
      file: "src/hooks/useTranscriptProcessor.ts",
      export: "TranscriptProcessor class",
      description: "Class is exported but only used internally by the hook",
      severity: "❓"
    }
  ],
  oldBackupFiles: [],
  unusedFiles: []
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case '✅': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case '⚠️': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case '❓': return <HelpCircle className="w-4 h-4 text-blue-500" />;
    default: return null;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case '✅': return 'bg-green-100 text-green-800';
    case '⚠️': return 'bg-yellow-100 text-yellow-800';
    case '❓': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const FindingCard: React.FC<{ title: string; items: FindingItem[]; icon: React.ReactNode }> = ({ 
  title, 
  items, 
  icon 
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
        <Badge variant="outline" className="ml-auto">
          {items.length}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-4">
          No issues found ✨
        </div>
      ) : (
        items.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              {getSeverityIcon(item.severity)}
              <Badge className={getSeverityColor(item.severity)}>
                {item.severity}
              </Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {item.file || item.function || item.type || 'Unknown'}
              </code>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            {item.files && (
              <div className="text-xs space-y-1">
                <div className="font-medium">Files involved:</div>
                {item.files.map((file, i) => (
                  <code key={i} className="block bg-muted px-2 py-1 rounded text-xs">
                    {file}
                  </code>
                ))}
              </div>
            )}
            {item.method && (
              <div className="text-xs">
                <span className="font-medium">Method:</span> <code>{item.method}</code>
              </div>
            )}
            {item.types && (
              <div className="text-xs">
                <span className="font-medium">Handles:</span> {item.types.join(', ')}
              </div>
            )}
          </div>
        ))
      )}
    </CardContent>
  </Card>
);

const CleanupReport = () => {
  const [copiedReport, setCopiedReport] = useState(false);

  const totalIssues = Object.values(cleanupData).flat().length;
  const safeToRemove = Object.values(cleanupData).flat().filter(item => item.severity === '✅').length;
  const needsReview = Object.values(cleanupData).flat().filter(item => item.severity === '⚠️').length;
  const uncertain = Object.values(cleanupData).flat().filter(item => item.severity === '❓').length;

  const copyReport = async () => {
    const reportText = `# Lovable Project Cleanup Report (Read-Only)

## Summary
- Total Issues: ${totalIssues}
- Safe to Remove: ${safeToRemove} ✅
- Needs Review: ${needsReview} ⚠️ 
- Uncertain: ${uncertain} ❓

## Key Findings

### Duplicate Transcript Logic
${cleanupData.duplicateTranscriptLogic.map(item => 
  `- ${item.type}: ${item.files?.join(', ')} ${item.severity}`
).join('\\n')}

### Multiple Transcript Listeners  
${cleanupData.transcriptListeners.map(item =>
  `- ${item.file}: ${item.method} ${item.severity}`
).join('\\n')}

### Unreferenced Edge Functions
${cleanupData.unreferencedEdgeFunctions.map(item =>
  `- ${item.function} ${item.severity}`
).join('\\n')}

Copy this report and review with your developer before making any changes.`;

    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  const downloadReport = () => {
    const reportData = {
      generated: new Date().toISOString(),
      summary: { totalIssues, safeToRemove, needsReview, uncertain },
      findings: cleanupData
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleanup-report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <MobileLayout>
      <SEO 
        title="Cleanup Report (Read-Only) | Code Analysis"
        description="Comprehensive codebase analysis showing unused files, duplicate logic, and optimization opportunities"
        canonicalPath="/cleanup-report"
      />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Cleanup Report (Read-Only)</h1>
          <p className="text-muted-foreground">
            Comprehensive scan of your codebase to identify potential cleanup opportunities
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalIssues}</div>
              <div className="text-sm text-muted-foreground">Total Issues</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{safeToRemove}</div>
              <div className="text-sm text-muted-foreground">Safe ✅</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{needsReview}</div>
              <div className="text-sm text-muted-foreground">Review ⚠️</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{uncertain}</div>
              <div className="text-sm text-muted-foreground">Uncertain ❓</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button onClick={copyReport} variant="outline" className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            {copiedReport ? 'Copied!' : 'Copy Report'}
          </Button>
          <Button onClick={downloadReport} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download JSON
          </Button>
        </div>

        <Tabs defaultValue="duplicates" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
            <TabsTrigger value="listeners">Listeners</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="duplicates">
            <FindingCard 
              title="Duplicate/Near-Duplicate Transcript Logic"
              items={cleanupData.duplicateTranscriptLogic}
              icon={<Copy className="w-4 h-4" />}
            />
          </TabsContent>

          <TabsContent value="listeners">
            <FindingCard 
              title="Multiple Transcript Listeners"
              items={cleanupData.transcriptListeners}
              icon={<Radio className="w-4 h-4" />}
            />
          </TabsContent>

          <TabsContent value="functions">
            <FindingCard 
              title="Unreferenced Edge Functions"
              items={cleanupData.unreferencedEdgeFunctions}
              icon={<Cloud className="w-4 h-4" />}
            />
          </TabsContent>

          <TabsContent value="routes">
            <FindingCard 
              title="Dead Routes/Pages"
              items={cleanupData.deadRoutes}
              icon={<Route className="w-4 h-4" />}
            />
          </TabsContent>

          <TabsContent value="exports">
            <FindingCard 
              title="Unused Exports"
              items={cleanupData.unusedExports}
              icon={<Package className="w-4 h-4" />}
            />
          </TabsContent>

          <TabsContent value="files">
            <FindingCard 
              title="Unused/Unreachable Files"
              items={cleanupData.unusedFiles}
              icon={<FileX className="w-4 h-4" />}
            />
          </TabsContent>
        </Tabs>

        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This is a read-only analysis. Copy this report and review with your developer before making any changes. Some items marked as "safe" may still be used indirectly or be required for future functionality.
          </AlertDescription>
        </Alert>
      </div>
    </MobileLayout>
  );
};

export default CleanupReport;