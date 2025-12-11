import { useState, useEffect } from 'react';
import { BookOpen, Download, Check, Smartphone, Monitor, Share, Plus } from 'lucide-react';
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

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

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
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 w-fit">
          <BookOpen className="w-6 h-6 text-gold" />
          <span className="font-display text-xl font-semibold">Notoria</span>
        </a>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-8 animate-fade-in">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gold-soft to-secondary flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">
              Install Notoria
            </h1>
            <p className="text-muted-foreground">
              Add Notoria to your home screen for instant access, offline support, and a native app experience.
            </p>
          </div>

          {/* Status Card */}
          {isInstalled ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Already Installed</h3>
                  <p className="text-sm text-green-700">
                    Notoria is ready to use from your home screen.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isIOS ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Install on iOS</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                    <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button in Safari</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong> <Plus className="w-4 h-4 inline mx-1" /></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                    <span>Tap <strong>"Add"</strong> to confirm</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} size="lg" className="w-full gap-2">
              <Download className="w-5 h-5" />
              Install Notoria
            </Button>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">How to Install</h3>
                <p className="text-sm text-muted-foreground">
                  Look for the install option in your browser's menu or address bar. On Chrome, click the install icon in the address bar.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Smartphone className="w-8 h-8 mx-auto mb-2 text-gold" />
                <h4 className="font-medium text-sm">Native Feel</h4>
                <p className="text-xs text-muted-foreground">Full-screen experience</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Download className="w-8 h-8 mx-auto mb-2 text-gold" />
                <h4 className="font-medium text-sm">Offline Access</h4>
                <p className="text-xs text-muted-foreground">Works without internet</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-gold" />
                <h4 className="font-medium text-sm">Quick Launch</h4>
                <p className="text-xs text-muted-foreground">One-tap access</p>
              </CardContent>
            </Card>
          </div>

          {/* Back Link */}
          <div className="text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Notoria
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Install;
