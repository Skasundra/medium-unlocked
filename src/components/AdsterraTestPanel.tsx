import { useState, useEffect } from 'react';
import { useAdsterraPopunder } from '@/hooks/useAdsterraPopunder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { ADSTERRA_CONFIG } from '@/config/adsterra';
import { adsterraPopunder } from '@/services/adsterraPopunder';

/**
 * Test panel for Adsterra popunder functionality
 * Remove this component in production
 */
export function AdsterraTestPanel() {
  const { triggerPopunder, canTriggerPopunder, getTimeUntilNext } = useAdsterraPopunder();
  const [timeUntilNext, setTimeUntilNext] = useState(0);
  const [lastTriggerTime, setLastTriggerTime] = useState<Date | null>(null);
  const [status, setStatus] = useState(adsterraPopunder.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilNext(getTimeUntilNext());
      setStatus(adsterraPopunder.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [getTimeUntilNext]);

  const handleTestTrigger = () => {
    const success = triggerPopunder();
    if (success) {
      setLastTriggerTime(new Date());
    }
  };

  const handleForceTrigger = () => {
    const success = adsterraPopunder.forceTrigger();
    if (success) {
      setLastTriggerTime(new Date());
    }
  };

  const handleRetryInit = () => {
    adsterraPopunder.initialize();
    setStatus(adsterraPopunder.getStatus());
  };

  const testScriptUrl = () => {
    window.open(ADSTERRA_CONFIG.scriptUrl, '_blank');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const isConfigured = ADSTERRA_CONFIG.scriptUrl && ADSTERRA_CONFIG.scriptUrl !== '';

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Adsterra Test Panel
        </CardTitle>
        <CardDescription>
          Test popunder functionality (remove in production)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Script Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Script Status:</span>
          <Badge variant={status.initialized ? "default" : "destructive"}>
            {status.initialized ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Loaded
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Failed to Load
              </>
            )}
          </Badge>
        </div>

        {/* Configuration Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Configuration:</span>
          <Badge variant={isConfigured ? "default" : "destructive"}>
            {isConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </>
            )}
          </Badge>
        </div>

        {/* Enabled Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={ADSTERRA_CONFIG.enabled ? "default" : "secondary"}>
            {ADSTERRA_CONFIG.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {/* Rate Limiting */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Can Trigger:</span>
          <Badge variant={canTriggerPopunder() ? "default" : "secondary"}>
            {canTriggerPopunder() ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Wait {formatTime(timeUntilNext)}
              </>
            )}
          </Badge>
        </div>

        {/* Last Trigger Time */}
        {lastTriggerTime && (
          <div className="text-xs text-muted-foreground">
            Last triggered: {lastTriggerTime.toLocaleTimeString()}
          </div>
        )}

        {/* Test Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={handleTestTrigger}
            disabled={!canTriggerPopunder() || !ADSTERRA_CONFIG.enabled || !isConfigured}
            className="w-full"
          >
            Test Popunder (Rate Limited)
          </Button>
          
          <Button 
            onClick={handleForceTrigger}
            disabled={!ADSTERRA_CONFIG.enabled || !isConfigured}
            variant="outline"
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Force Trigger (Bypass Rate Limit)
          </Button>

          {!status.initialized && (
            <Button 
              onClick={handleRetryInit}
              variant="secondary"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Script Loading
            </Button>
          )}

          <Button 
            onClick={testScriptUrl}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Test Script URL in Browser
          </Button>
        </div>

        {/* Configuration Warning */}
        {!isConfigured && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            ⚠️ Update your Adsterra script URL in <code>src/config/adsterra.ts</code>
          </div>
        )}

        {/* Script Loading Error */}
        {!status.initialized && isConfigured && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            ❌ Script failed to load. Possible causes:
            <ul className="mt-1 ml-4 list-disc">
              <li>Ad blocker is blocking the script</li>
              <li>Network connectivity issues</li>
              <li>Script URL is not accessible</li>
              <li>CORS or security restrictions</li>
            </ul>
            <div className="mt-2">
              <strong>Solutions:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Disable ad blocker temporarily</li>
                <li>Check browser console for errors</li>
                <li>Test script URL in new tab</li>
                <li>Try force trigger (uses fallback method)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Settings Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Interval: {ADSTERRA_CONFIG.minInterval / 1000}s</div>
          <div>Key: {ADSTERRA_CONFIG.key}</div>
          <div className="break-all">Script: {ADSTERRA_CONFIG.scriptUrl}</div>
        </div>
      </CardContent>
    </Card>
  );
}