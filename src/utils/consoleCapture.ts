interface LogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  component?: string;
  route?: string;
}

class ConsoleCapture {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
  };

  constructor() {
    this.originalConsole = {
      error: console.error,
      warn: console.warn,
    };

    this.initializeCapture();
  }

  private initializeCapture() {
    // Only capture in non-production preview builds
    if (import.meta.env.PROD) return;

    // Wrap console methods
    console.error = (...args) => {
      this.captureLog('error', args);
      this.originalConsole.error(...args);
    };

    console.warn = (...args) => {
      this.captureLog('warn', args);
      this.originalConsole.warn(...args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('error', [event.message], {
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [
        'Unhandled Promise Rejection:',
        event.reason
      ], {
        stack: event.reason?.stack,
      });
    });
  }

  private captureLog(
    level: LogEntry['level'], 
    args: any[], 
    additional?: Partial<LogEntry>
  ) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      route: window.location.pathname,
      ...additional,
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  public exportLogs(): string {
    const grouped = this.logs.reduce((acc, log) => {
      const key = `${log.level}:${log.message}`;
      if (!acc[key]) {
        acc[key] = { ...log, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, LogEntry & { count: number }>);

    const timestamp = new Date().toISOString();
    
    let markdown = `# Console Logs Captured at ${timestamp}\n\n`;
    
    markdown += `## Summary\n`;
    markdown += `- Total logs: ${this.logs.length}\n`;
    markdown += `- Errors: ${this.logs.filter(l => l.level === 'error').length}\n`;
    markdown += `- Warnings: ${this.logs.filter(l => l.level === 'warn').length}\n\n`;

    markdown += `## Issues by Frequency\n\n`;
    
    Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .forEach(log => {
        markdown += `### ${log.level.toUpperCase()}: ${log.message} (${log.count}x)\n\n`;
        markdown += `- **Route**: ${log.route || 'unknown'}\n`;
        markdown += `- **Last seen**: ${new Date(log.timestamp).toISOString()}\n`;
        if (log.stack) {
          markdown += `- **Stack trace**:\n\n\`\`\`\n${log.stack}\n\`\`\`\n`;
        }
        if (log.url) {
          markdown += `- **File**: ${log.url}:${log.line}:${log.column}\n`;
        }
        markdown += '\n';
      });

    return markdown;
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public downloadLogs() {
    const content = this.exportLogs();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Global singleton instance
export const consoleCapture = new ConsoleCapture();
