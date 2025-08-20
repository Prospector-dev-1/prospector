import Vapi from '@vapi-ai/web';

class VapiService {
  private static instance: VapiService;
  private vapi: Vapi | null = null;
  private publicKey: string | null = null;

  private constructor() {}

  static getInstance(): VapiService {
    if (!VapiService.instance) {
      VapiService.instance = new VapiService();
    }
    return VapiService.instance;
  }

  async initialize(): Promise<void> {
    if (this.vapi) return;

    try {
      // Get Vapi public key from edge function using Supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('get-vapi-key');
      
      if (error || !data?.publicKey) {
        throw new Error('Failed to get Vapi public key from Supabase');
      }

      this.publicKey = data.publicKey;
      this.vapi = new Vapi(this.publicKey);
    } catch (error) {
      console.error('Error initializing Vapi:', error);
      throw error;
    }
  }

  getVapi(): Vapi {
    if (!this.vapi) {
      throw new Error('Vapi not initialized. Call initialize() first.');
    }
    return this.vapi;
  }

  async startCall(assistantId: string): Promise<any> {
    if (!this.vapi) {
      await this.initialize();
    }
    return this.vapi!.start(assistantId);
  }

  async stopCall(): Promise<void> {
    if (this.vapi) {
      try {
        await this.vapi.stop();
      } catch (error) {
        // Suppress Krisp processor errors during cleanup
        if (error instanceof Error && error.message.includes('WASM_OR_WORKER_NOT_READY')) {
          console.warn('Krisp processor cleanup warning (expected):', error.message);
        } else {
          console.error('Error stopping Vapi call:', error);
          throw error;
        }
      }
    }
  }

  setMuted(muted: boolean): void {
    if (this.vapi) {
      this.vapi.setMuted(muted);
    }
  }

  on(event: any, callback: (...args: any[]) => void): void {
    if (this.vapi) {
      this.vapi.on(event as any, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.vapi) {
      this.vapi.off(event, callback);
    }
  }
}

export default VapiService;