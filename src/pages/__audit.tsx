import React from 'react';
import { consoleCapture } from '@/utils/consoleCapture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2 } from 'lucide-react';

const AuditPage = () => {
  const [logs, setLogs] = React.useState(() => consoleCapture.getLogs());
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refreshLogs = () => {
    setLogs(consoleCapture.getLogs());
    setRefreshKey(prev => prev + 1);
  };

  const clearLogs = () => {
    consoleCapture.clearLogs();
    refreshLogs();
  };

  const downloadLogs = () => {
    consoleCapture.downloadLogs();
  };

  React.useEffect(() => {
    const interval = setInterval(refreshLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  // Group logs by message for frequency analysis
  const grouped = logs.reduce((acc, log) => {
    const key = `${log.level}:${log.message}`;
    if (!acc[key]) {
      acc[key] = { ...log, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, any>);

  const sortedGroups = Object.values(grouped).sort((a: any, b: any) => b.count - a.count);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Console</h1>
        <p className="text-muted-foreground mt-2">
          Real-time console monitoring and error tracking
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warnCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={downloadLogs} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Logs
        </Button>
        <Button onClick={clearLogs} variant="outline">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Logs
        </Button>
        <Button onClick={refreshLogs} variant="outline">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issues by Frequency</CardTitle>
          <CardDescription>
            Most common console messages (auto-refreshes every 2 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No console logs captured yet. Navigate the app to see issues appear here.
              </div>
            ) : (
              sortedGroups.slice(0, 20).map((group: any, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={group.level === 'error' ? 'destructive' : 'secondary'}
                      >
                        {group.level.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {group.count}x
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(group.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="font-mono text-sm mb-2 break-words">
                    {group.message}
                  </div>
                  
                  {group.route && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Route: {group.route}
                    </div>
                  )}
                  
                  {group.stack && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Stack trace
                      </summary>
                      <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                        {group.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditPage;