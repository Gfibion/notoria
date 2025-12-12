import { useState, useEffect } from 'react';
import { BookOpen, Download, Check, Smartphone, Monitor, Share, Plus, X, Zap, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/notoria/ThemeToggle';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 w-fit">
          <BookOpen className="w-6 h-6 text-gold" />
          <span className="font-display text-xl font-semibold">Notoria</span>
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <a href="/">
              <X className="w-5 h-5" />
            </a>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="max-w-lg w-full space-y-6 md:space-y-8 animate-fade-in">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gold/20 to-secondary flex items-center justify-center shadow-card">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              Install Notoria
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Add Notoria to your home screen for instant access, offline support, and a native app experience.
            </p>
          </div>

          {/* Status / Install Section */}
          {isInstalled ? (
            <Card className="border-green-500/30 bg-green-500/10">
              <CardContent className="p-4 md:p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Already Installed</h3>
                  <p className="text-sm text-muted-foreground">
                    Notoria is ready to use from your home screen.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isIOS ? (
            <Card>
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">Install on iPhone / iPad</h3>
                </div>
                <ol className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-sm font-semibold">1</span>
                    <div>
                      <p className="text-foreground font-medium">Tap the Share button</p>
                      <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                        Look for <Share className="w-4 h-4 inline" /> at the bottom of Safari
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-sm font-semibold">2</span>
                    <div>
                      <p className="text-foreground font-medium">Select "Add to Home Screen"</p>
                      <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                        Scroll down in the menu and tap <Plus className="w-4 h-4 inline" /> Add to Home Screen
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-sm font-semibold">3</span>
                    <div>
                      <p className="text-foreground font-medium">Tap "Add" to confirm</p>
                      <p className="text-muted-foreground mt-0.5">
                        Notoria will appear on your home screen
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <Button 
                onClick={handleInstall} 
                size="lg" 
                className="w-full gap-2 h-14 text-lg"
                disabled={installing}
              >
                <Download className="w-5 h-5" />
                {installing ? 'Installing...' : 'Install Notoria'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Free • No app store required • Works offline
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    {isAndroid ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {isAndroid ? 'Install on Android' : 'Install on Desktop'}
                  </h3>
                </div>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-sm font-semibold">1</span>
                    <div>
                      <p className="text-foreground font-medium">
                        {isAndroid ? 'Open browser menu' : 'Look for the install icon'}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {isAndroid 
                          ? 'Tap the three dots (⋮) in Chrome' 
                          : 'Click the install icon in your browser\'s address bar'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-sm font-semibold">2</span>
                    <div>
                      <p className="text-foreground font-medium">
                        {isAndroid ? 'Tap "Add to Home screen"' : 'Click "Install"'}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Follow the prompts to complete installation
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-3 md:p-4 text-center">
                <Zap className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gold" />
                <h4 className="font-medium text-xs md:text-sm">Instant Launch</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">One-tap access</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 md:p-4 text-center">
                <WifiOff className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gold" />
                <h4 className="font-medium text-xs md:text-sm">Works Offline</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">No internet needed</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 md:p-4 text-center">
                <Smartphone className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gold" />
                <h4 className="font-medium text-xs md:text-sm">Full Screen</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Native app feel</p>
              </CardContent>
            </Card>
          </div>

          {/* Back Link */}
          <div className="text-center pt-2">
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
              ← Back to Notoria
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Install;
