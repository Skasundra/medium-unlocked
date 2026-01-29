/**
 * Adsterra Popunder Ad Service
 * Handles popunder ad functionality using specific Adsterra script URL
 */

import { ADSTERRA_CONFIG } from '@/config/adsterra';

class AdsterraPopunderService {
  private isInitialized: boolean = false;
  private lastTriggerTime: number = 0;
  private minInterval: number = 30000; // 30 seconds minimum between popunders
  private scriptLoadAttempts: number = 0;
  private maxRetries: number = 3;

  /**
   * Initialize Adsterra popunder script with retry logic
   */
  public initialize(): void {
    if (this.isInitialized) return;

    this.loadScript();
  }

  private loadScript(retryCount: number = 0): void {
    try {
      console.log(`Loading Adsterra script (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      // Load the specific Adsterra script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = ADSTERRA_CONFIG.scriptUrl;
      script.async = true;
      
      // Add error handling with retry logic
      script.onerror = () => {
        console.error(`Failed to load Adsterra script (attempt ${retryCount + 1})`);
        
        if (retryCount < this.maxRetries - 1) {
          console.log(`Retrying in 2 seconds...`);
          setTimeout(() => {
            this.loadScript(retryCount + 1);
          }, 2000);
        } else {
          console.error('Max retries reached. Adsterra script could not be loaded.');
          console.log('Possible solutions:');
          console.log('1. Check if the script URL is accessible in your browser');
          console.log('2. Disable ad blockers temporarily');
          console.log('3. Check network connectivity');
          console.log('4. Try using the alternative trigger method');
        }
      };
      
      script.onload = () => {
        console.log('✅ Adsterra popunder script loaded successfully');
        this.isInitialized = true;
      };

      document.head.appendChild(script);
      console.log('Adsterra popunder initialized with script:', ADSTERRA_CONFIG.scriptUrl);
    } catch (error) {
      console.error('Failed to initialize Adsterra popunder:', error);
    }
  }

  /**
   * Alternative trigger method - creates popunder window directly
   */
  private alternativeTrigger(): boolean {
    try {
      // Create a popunder window as fallback
      const popunderUrl = 'about:blank'; // You can replace with a specific URL if needed
      const popunder = window.open(
        popunderUrl,
        '_blank',
        'width=1,height=1,left=-1000,top=-1000,toolbar=no,menubar=no,scrollbars=no,resizable=no'
      );
      
      if (popunder) {
        // Move the current window to front (making the new window go behind)
        window.focus();
        
        // Close the popunder after a short delay (optional)
        setTimeout(() => {
          if (popunder && !popunder.closed) {
            popunder.close();
          }
        }, 1000);
        
        console.log('✅ Alternative popunder triggered');
        return true;
      }
    } catch (error) {
      console.error('Alternative popunder failed:', error);
    }
    return false;
  }

  /**
   * Trigger popunder ad with rate limiting
   */
  public triggerPopunder(): boolean {
    // Check if popunders are globally enabled
    if (!ADSTERRA_CONFIG.enabled) {
      console.log('Adsterra popunders are disabled in config');
      return false;
    }

    const currentTime = Date.now();
    
    // Rate limiting - prevent too frequent popunders
    if (currentTime - this.lastTriggerTime < this.minInterval) {
      console.log('Popunder rate limited');
      return false;
    }

    // Try the main method first
    if (this.isInitialized) {
      try {
        // Create a new script element to trigger the popunder
        const triggerScript = document.createElement('script');
        triggerScript.type = 'text/javascript';
        triggerScript.src = ADSTERRA_CONFIG.scriptUrl;
        triggerScript.async = true;
        
        // Add a unique identifier to avoid conflicts
        triggerScript.setAttribute('data-adsterra-trigger', Date.now().toString());
        
        triggerScript.onerror = () => {
          console.warn('Main trigger failed, trying alternative method');
          this.alternativeTrigger();
        };
        
        document.body.appendChild(triggerScript);
        
        // Clean up the script after a short delay
        setTimeout(() => {
          if (triggerScript.parentNode) {
            triggerScript.parentNode.removeChild(triggerScript);
          }
        }, 2000);

        this.lastTriggerTime = currentTime;
        console.log('✅ Popunder triggered at:', new Date().toLocaleTimeString());
        return true;
      } catch (error) {
        console.error('Main popunder trigger failed:', error);
        // Fallback to alternative method
        return this.alternativeTrigger();
      }
    } else {
      console.warn('Adsterra script not loaded, trying alternative method');
      if (this.alternativeTrigger()) {
        this.lastTriggerTime = currentTime;
        return true;
      }
    }

    return false;
  }

  /**
   * Set minimum interval between popunders (in milliseconds)
   */
  public setMinInterval(interval: number): void {
    this.minInterval = interval;
  }

  /**
   * Check if popunder can be triggered (not rate limited)
   */
  public canTrigger(): boolean {
    const currentTime = Date.now();
    return currentTime - this.lastTriggerTime >= this.minInterval;
  }

  /**
   * Get time until next popunder can be triggered
   */
  public getTimeUntilNext(): number {
    const currentTime = Date.now();
    const timeSinceLastTrigger = currentTime - this.lastTriggerTime;
    return Math.max(0, this.minInterval - timeSinceLastTrigger);
  }

  /**
   * Force trigger popunder (bypasses rate limiting - use carefully)
   */
  public forceTrigger(): boolean {
    if (!ADSTERRA_CONFIG.enabled) {
      console.log('Adsterra popunders are disabled in config');
      return false;
    }

    try {
      const triggerScript = document.createElement('script');
      triggerScript.type = 'text/javascript';
      triggerScript.src = ADSTERRA_CONFIG.scriptUrl;
      triggerScript.async = true;
      triggerScript.setAttribute('data-adsterra-force-trigger', Date.now().toString());
      
      triggerScript.onerror = () => {
        console.warn('Force trigger failed, trying alternative method');
        this.alternativeTrigger();
      };
      
      document.body.appendChild(triggerScript);
      
      setTimeout(() => {
        if (triggerScript.parentNode) {
          triggerScript.parentNode.removeChild(triggerScript);
        }
      }, 2000);

      this.lastTriggerTime = Date.now();
      console.log('✅ Popunder force triggered at:', new Date().toLocaleTimeString());
      return true;
    } catch (error) {
      console.error('Failed to force trigger popunder:', error);
      return this.alternativeTrigger();
    }
  }

  /**
   * Get initialization status
   */
  public getStatus(): { initialized: boolean; scriptUrl: string; attempts: number } {
    return {
      initialized: this.isInitialized,
      scriptUrl: ADSTERRA_CONFIG.scriptUrl,
      attempts: this.scriptLoadAttempts
    };
  }
}

// Export singleton instance
export const adsterraPopunder = new AdsterraPopunderService();

// Set the minimum interval from config
adsterraPopunder.setMinInterval(ADSTERRA_CONFIG.minInterval);

// Export the service class for custom configurations
export { AdsterraPopunderService };