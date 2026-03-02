import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';

interface SplashLoaderProps {
  isLoading: boolean;
}

const SplashLoader = ({ isLoading }: SplashLoaderProps) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full opacity-[0.07]"
              style={{
                background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
                top: '10%',
                left: '15%',
              }}
              animate={{
                scale: [1, 1.3, 1],
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05]"
              style={{
                background: 'radial-gradient(circle, hsl(160 60% 45%) 0%, transparent 70%)',
                bottom: '15%',
                right: '10%',
              }}
              animate={{
                scale: [1.2, 1, 1.2],
                x: [0, -25, 0],
                y: [0, 15, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-[300px] h-[300px] rounded-full opacity-[0.04]"
              style={{
                background: 'radial-gradient(circle, hsl(280 50% 55%) 0%, transparent 70%)',
                top: '50%',
                right: '30%',
              }}
              animate={{
                scale: [1, 1.4, 1],
                x: [0, 40, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Center content */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Logo with entrance animation */}
            <motion.div
              className="relative"
              initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              {/* Glow ring behind logo */}
              <motion.div
                className="absolute inset-[-12px] rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, hsl(var(--accent)), hsl(160 60% 45%), hsl(280 50% 55%), hsl(38 70% 60%), hsl(var(--accent)))',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-[-10px] rounded-full bg-background"
              />
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-[-16px] rounded-full border-2 border-accent/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src={logo}
                alt="Notoria"
                className="relative w-20 h-20 rounded-full object-contain z-10"
              />
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                Notoria
              </h1>
              <p className="text-sm text-muted-foreground tracking-[0.2em] uppercase">
                Business Class Notebook
              </p>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="w-48 h-1 rounded-full bg-secondary overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--accent)), hsl(160 60% 45%), hsl(280 50% 55%), hsl(38 70% 60%))',
                  backgroundSize: '200% 100%',
                }}
                initial={{ width: '0%' }}
                animate={{
                  width: '100%',
                  backgroundPosition: ['0% 0%', '100% 0%'],
                }}
                transition={{
                  width: { duration: 1.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] },
                  backgroundPosition: { duration: 1.5, delay: 0.9, repeat: Infinity, ease: 'linear' },
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashLoader;
