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
    if (this.vapi) {
      return; // Already initialized
    }

    try {
      console.log('Fetching VAPI public key...');
      const response = await fetch('https://akcxkwbqeehxvwhmrqbb.supabase.co/functions/v1/get-vapi-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch VAPI key: ${response.status}`);
      }

      const data = await response.json();
      console.log('VAPI key fetched successfully');

      this.publicKey = data.publicKey;
      
      // Initialize VAPI with basic setup to avoid audio processing issues
      this.vapi = new Vapi(this.publicKey);
      
      console.log('VAPI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VAPI:', error);
      throw new Error(`VAPI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    try {
      console.log('Starting VAPI call with assistant:', assistantId);
      
      // Add error handling for the start call
      const result = await this.vapi!.start(assistantId);
      console.log('VAPI call started successfully');
      return result;
    } catch (error) {
      console.error('Error starting VAPI call:', error);
      
      // Check if it's a Krisp processor error and attempt recovery
      if (error instanceof Error && (
        error.message.includes('WASM_OR_WORKER_NOT_READY') ||
        error.message.includes('Krisp') ||
        error.message.includes('processor')
      )) {
        console.log('Detected audio processor issue, attempting recovery...');
        
        try {
          // Reinitialize without the problematic audio settings
          this.vapi = null;
          this.vapi = new Vapi(this.publicKey!);
          console.log('Retrying call start with basic VAPI setup...');
          return await this.vapi.start(assistantId);
        } catch (retryError) {
          console.error('Recovery attempt failed:', retryError);
          throw new Error('Failed to start call due to audio processing issues. Please refresh and try again.');
        }
      }
      
      throw error;
    }
  }

  async stopCall(): Promise<void> {
    if (this.vapi) {
      try {
        await this.vapi.stop();
      } catch (error) {
        // Suppress known Krisp processor errors during cleanup
        if (error instanceof Error && (
          error.message.includes('WASM_OR_WORKER_NOT_READY') ||
          error.message.includes('Krisp') ||
          error.message.includes('processor')
        )) {
          console.warn('Audio processor cleanup warning (expected during shutdown):', error.message);
        } else {
          console.error('Error stopping Vapi call:', error);
          throw error;
        }
      }
    }
  }

  setMuted(muted: boolean): void {
    if (this.vapi) {
      try {
        this.vapi.setMuted(muted);
      } catch (error) {
        console.warn('Error setting mute state:', error);
      }
    }
  }

  on(event: any, callback: (...args: any[]) => void): void {
    if (this.vapi) {
      try {
        this.vapi.on(event as any, callback);
      } catch (error) {
        console.warn('Error setting up VAPI event listener:', error);
      }
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.vapi) {
      try {
        this.vapi.off(event, callback);
      } catch (error) {
        console.warn('Error removing VAPI event listener:', error);
      }
    }
  }
}

export default VapiService;