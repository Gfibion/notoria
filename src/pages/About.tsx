import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Shield, WifiOff, Database, Sparkles, Coffee, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoImage from "@/assets/logo.png";

const APP_VERSION = "1.0.0";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="font-display text-lg font-semibold">About</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <section className="text-center space-y-4">
          <img
            src={logoImage}
            alt="Notoria logo"
            className="w-20 h-20 mx-auto object-contain"
          />
          <div>
            <h2 className="text-3xl font-display font-bold">Notoria</h2>
            <p className="text-sm text-muted-foreground mt-1">Version {APP_VERSION}</p>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A calm, private space for your notes and tasks — offline-first, beautifully crafted, and built to respect your time and your data.
          </p>
        </section>

        {/* Story */}
        <Card className="p-6 space-y-3">
          <h3 className="font-display text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Our story
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Notoria was born from a simple frustration: most note apps try to do too much, push you to sign up, and quietly send your thoughts to the cloud. We wanted something different — a quiet, focused tool that lives on your device, respects your privacy, and feels good to use every day.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Whether you're capturing a fleeting idea, planning a project, or building a personal knowledge base, Notoria is here to make it simple, fast, and yours.
          </p>
        </Card>

        {/* What makes it different */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5 space-y-2">
            <Database className="w-6 h-6 text-primary" />
            <h4 className="font-semibold">Local-first</h4>
            <p className="text-sm text-muted-foreground">
              Everything stays on your device. No servers, no syncing, no surprises.
            </p>
          </Card>
          <Card className="p-5 space-y-2">
            <WifiOff className="w-6 h-6 text-primary" />
            <h4 className="font-semibold">Works offline</h4>
            <p className="text-sm text-muted-foreground">
              Once installed, Notoria works anywhere — on a plane, off-grid, anytime.
            </p>
          </Card>
          <Card className="p-5 space-y-2">
            <Shield className="w-6 h-6 text-primary" />
            <h4 className="font-semibold">Private by design</h4>
            <p className="text-sm text-muted-foreground">
              No accounts, no analytics, no tracking. Your notes are yours alone.
            </p>
          </Card>
          <Card className="p-5 space-y-2">
            <Heart className="w-6 h-6 text-primary" />
            <h4 className="font-semibold">Made with care</h4>
            <p className="text-sm text-muted-foreground">
              Every interaction is designed to feel calm, fast, and human.
            </p>
          </Card>
        </section>

        {/* Support */}
        <Card className="p-6 text-center space-y-4 bg-amber-500/5 border-amber-500/30">
          <Coffee className="w-8 h-8 text-amber-600 mx-auto" />
          <div>
            <h3 className="font-display text-xl font-semibold">Support Notoria</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Notoria is built with love. If it makes your life a little easier, consider buying us a coffee.
            </p>
          </div>
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
            <Link to="/coffee">
              <Heart className="w-4 h-4 mr-2" /> Buy Me Coffee
            </Link>
          </Button>
        </Card>

        {/* Credits */}
        <section className="text-center text-sm text-muted-foreground space-y-2 pb-6">
          <p>Made with ❤️ by Gfibion</p>
          <p>
            <a
              href="https://github.com/Gfibion/notoria"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
