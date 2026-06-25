import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import * as audio from '../../lib/audio';
import type { Tier1Task, PetState } from '../../lib/types';
import { useVoicePrompt } from './useVoicePrompt';
import { VoiceSettings } from './VoiceSettings';
import { FamilyMessageBoard } from '../shared/FamilyMessageBoard';
import { TaskVisual } from '../shared/TaskVisual';
import { RewardShop } from './RewardShop';

/**
 * Little Explorers Dashboard — for ages 3-5
 * 
 * Design principles:
 * - Zero text — everything is icon + audio + animation
 * - Huge touch targets (min 64pt)
 * - Virtual pet metaphor: doing tasks makes a pet grow and thrive
 * - Voice guidance for every action
 * - Visual progress (fill a jar, grow a tree)
 */

// World scene colors based on brightness
function worldColors(brightness: number) {
  const skyBlue = `hsl(${200 + brightness * 20}, 80%, ${60 + brightness * 15}%)`;
  const grassGreen = `hsl(${120 + brightness * 20}, 60%, ${35 + brightness * 10}%)`;
  return { sky: skyBlue, grass: grassGreen };
}

// Deterministic pseudo-random for useMemo
function pseudo(seed: number, idx: number): number {
  return ((seed * (idx + 1) * 7919) % 1000) / 1000;
}

export function LittleExplorerDashboard() {
  const { user, logout } = useAuth();
  const { speak, speakGreeting } = useVoicePrompt();
  const [tasks, setTasks] = useState<Tier1Task[]>([]);
  const [petState, setPetState] = useState<PetState | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showRewardShop, setShowRewardShop] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tasksData, petData] = await Promise.all([
        api.getTier1Tasks(),
        api.getPetState(),
      ]);
      setTasks((tasksData as unknown as { tasks: Tier1Task[] }).tasks || []);
      const pet = petData as unknown as PetState;
      setPetState(pet);

      // Voice greeting on first load (handled by useVoicePrompt)
      if (pet) {
        const msg = pet.pet.mood === 'waiting'
          ? "Hi there! Let's do some fun tasks together!"
          : `Welcome back! Your ${pet.pet.stage} is ${pet.pet.mood}! Let's play!`;
        setTimeout(() => speakGreeting(msg), 800);
      }
    } catch { /* ignore */ }
  }, [speakGreeting]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async (task: Tier1Task) => {
    if (completingId) return;
    setCompletingId(task.id);
    audio.playTaskComplete();

    try {
      await api.completeTier1Task(task.id);
      audio.playPointsEarned();

      // Celebrate
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 3000);

      // Voice praise
      const praises = [
        'Amazing job! Your pet is so happy!',
        'Woo hoo! You did it! Look at your pet dance!',
        'Great work! The flowers are blooming!',
      ];
      const idx = (new Date().getTime()) % praises.length;
      speak(praises[Math.abs(idx)], 'celebration');

      // Reload
      setTimeout(() => {
        loadData();
        setCompletingId(null);
      }, 1200);
    } catch {
      setCompletingId(null);
    }
  };

  const brightness = petState?.world_brightness || 0;
  const colors = worldColors(brightness);
  const pet = petState?.pet;

  // Stars positions pre-computed with useMemo to avoid impure render calls
  const stars = useMemo(() => {
    const result = [];
    const seed = brightness * 100;
    for (let i = 0; i < 8; i++) {
      result.push({
        id: i,
        x: 10 + pseudo(seed + 1, i) * 80,
        y: 5 + pseudo(seed + 2, i) * 35,
        size: 3 + pseudo(seed + 3, i) * 8,
        delay: pseudo(seed + 4, i) * 3,
        opacity: 0.3 + pseudo(seed + 5, i) * 0.7 * (brightness + 0.3),
      });
    }
    return result;
  }, [brightness]);

  return (
    <div
      className="little-explorer-screen relative min-h-screen min-h-[100dvh] overflow-x-clip select-none"
      style={{
        background: `linear-gradient(180deg, ${colors.sky} 0%, ${colors.sky} 55%, ${colors.grass} 55%, ${colors.grass} 100%)`,
      }}
    >
      {/* Animated stars in sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[58dvh] max-h-[420px] overflow-hidden">
        {stars.map(s => (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-yellow-200"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
            }}
            animate={{ opacity: [s.opacity, s.opacity * 0.3, s.opacity] }}
            transition={{ duration: 2, delay: s.delay, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Clouds */}
      <motion.div
        className="pointer-events-none absolute top-12 left-0 text-5xl opacity-40 sm:top-8 sm:text-6xl"
        animate={{ x: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="pointer-events-none absolute top-24 right-2 text-4xl opacity-30 sm:right-12 sm:text-5xl"
        animate={{ x: [0, -15, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☁️
      </motion.div>

      {/* Ground elements — flowers that bloom based on tasks */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-[45%] overflow-hidden">
        {/* Grass blades */}
        {Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={`grass-${i}`}
            className="absolute bottom-0 text-2xl"
            style={{
              left: `calc(${5 + i * 8}% - 12px)`,
              transformOrigin: 'bottom center',
            }}
            animate={{
              rotate: [-3, 3, -3],
              scale: [1, 1 + brightness * 0.3, 1],
            }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, repeatType: 'reverse' }}
          >
            🌿
          </motion.div>
        ))}
        {/* Flowers — more visible as brightness increases */}
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={`flower-${i}`}
            className="absolute bottom-0 text-3xl"
            style={{
              left: `${8 + i * 15}%`,
              opacity: brightness * 0.9,
              transform: `scale(${0.3 + brightness * 0.7})`,
            }}
            animate={{
              y: [0, -3, 0],
              rotate: [-5, 5, -5],
            }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, repeatType: 'reverse' }}
          >
            {['🌸', '🌼', '🌺', '🌻', '💐', '🌷'][i]}
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="safe-top relative z-10 mx-auto flex w-full max-w-[480px] flex-col gap-3 px-3 py-3 sm:max-w-[520px] sm:px-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <motion.div
              className="shrink-0 text-4xl sm:text-5xl"
              animate={{ y: [0, -5, 0], rotate: [0, 3, 0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {pet?.emoji || '🥚'}
            </motion.div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate whitespace-nowrap text-xl font-bold text-white drop-shadow-md sm:text-2xl">
                {user?.display_name}
              </span>
              {pet && (
                <span className="truncate whitespace-nowrap text-xs text-white/80 drop-shadow sm:text-sm">
                  {pet.emoji} Level {petState?.stats.level} • {pet.stage}
                </span>
              )}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { speak('Bye bye!', 'greeting'); logout(); }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl text-white shadow-lg backdrop-blur hover:bg-white/25"
            aria-label="Log out"
          >
            🚪
          </motion.button>
        </div>
        <div className="grid min-w-0 grid-cols-[44px_minmax(72px,1fr)_auto] items-center gap-2">
          <VoiceSettings compact panelAlign="left" />
          {/* Stars Jar visual */}
          <motion.div
            className="flex h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white/20 px-3 py-2 backdrop-blur"
            whileTap={{ scale: 0.95 }}
            onClick={() => speak(`You have ${user?.stars || 0} stars and ${user?.gems || 0} gems!`, 'encouragement')}
          >
            <span className="text-xl">⭐</span>
            <span className="text-lg font-bold text-white">{user?.stars}</span>
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              audio.playButtonClick();
              setShowRewardShop(true);
            }}
            className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-white/25 px-3 py-2 text-white shadow-lg backdrop-blur hover:bg-white/35 sm:gap-2 sm:px-4"
            aria-label="Open reward shop"
          >
            <span className="text-xl">🎁</span>
            <span className="text-lg font-bold drop-shadow">Shop</span>
          </motion.button>
        </div>
      </header>

      {/* Pet area — center */}
      <div className="relative z-10 mx-auto flex w-full max-w-[480px] flex-col items-center px-3 pt-2 pb-6 sm:max-w-[520px] sm:px-4 sm:pt-6 sm:pb-8">
        {/* Pet character */}
        <motion.div
          className="relative cursor-pointer"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (pet) {
              const msgs: Record<string, string> = {
                ecstatic: "I'm so happy! You're the best!",
                happy: "I love doing tasks with you!",
                content: "Let's do more fun things!",
                waiting: "I can't wait to play! Tap a task to start!",
              };
              speak(msgs[pet.mood] || "Hello friend!", 'encouragement');
            }
          }}
        >
          {/* Pet emoji */}
          <motion.div
            className="text-7xl sm:text-8xl"
            animate={{
              scale: [1, 1.05, 1],
              y: [0, -8, 0],
              rotate: pet?.mood === 'ecstatic' ? [0, -10, 10, -10, 0] : [0, -3, 0],
            }}
            transition={{
              duration: pet?.mood === 'ecstatic' ? 0.6 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {pet?.emoji || '🥚'}
          </motion.div>
          {/* Mood expression */}
          <motion.div
            className="absolute -top-2 -right-2 text-3xl"
            animate={{
              scale: [1, 1.2, 1],
              y: [0, -4, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {pet?.expression || '😴'}
          </motion.div>
          {/* Sparkles around happy pet */}
          {(pet?.mood === 'happy' || pet?.mood === 'ecstatic') && (
            <>
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute text-base sm:text-lg"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${angle}deg) translateY(-52px)`,
                  }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                >
                  ✨
                </motion.div>
              ))}
            </>
          )}
        </motion.div>

        {/* Pet name/mood */}
        <motion.div
          className="mt-3 max-w-full rounded-2xl bg-white/20 px-5 py-2 text-center text-white backdrop-blur"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="truncate whitespace-nowrap text-lg font-bold capitalize">{pet?.mood || 'sleeping'} {pet?.stage || 'egg'}</div>
        </motion.div>

        {/* Progress tree */}
        <div className="mt-4 flex items-end gap-2">
          {[1, 2, 3, 4, 5].map(level => (
            <motion.div
              key={level}
              className={`text-2xl transition-all`}
              style={{
                opacity: (petState?.stats.level || 0) >= level * 4 ? 1 : 0.3,
                transform: `scale(${(petState?.stats.level || 0) >= level * 4 ? 1.1 : 0.8})`,
              }}
            >
              {level === 1 ? '🌱' : level === 2 ? '🪴' : level === 3 ? '🌳' : level === 4 ? '🌲' : '🏆'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tasks area — character bubbles */}
      <div className="relative z-10 mx-auto w-full max-w-[480px] px-3 pb-6 sm:max-w-[520px] sm:px-4 sm:pb-8">
        <AnimatePresence mode="wait">
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                className="text-6xl"
                animate={{ y: [0, -10, 0], rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🌟
              </motion.div>
              <p className="text-white/70 text-lg mt-3 font-medium drop-shadow">
                All done! Come back later!
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-3 sm:grid-cols-2 sm:gap-4">
              {tasks.map((task, i) => (
                <motion.button
                  key={task.id}
                  initial={{ opacity: 0, y: 50, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5, y: 100 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    speak(task.audio_prompt || 'Time for this task!', 'task-name');
                    handleComplete(task);
                  }}
                  disabled={completingId !== null}
                  className={`
                    relative flex min-h-[144px] min-w-0 flex-col items-center justify-center gap-2 rounded-3xl p-3 sm:min-h-[156px] sm:gap-3 sm:p-4
                    bg-white/25 backdrop-blur border-2 border-white/30
                    transition-all shadow-lg
                    ${completingId === task.id ? 'animate-pulse border-yellow-300' : 'hover:bg-white/35 hover:border-white/50'}
                    ${completingId !== null && completingId !== task.id ? 'opacity-50' : ''}
                  `}
                  aria-label={`Complete ${task.audio_prompt}`}
                >
                  {/* Task picture — huge for little fingers */}
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      rotate: [0, 5, 0, -5, 0],
                    }}
                    transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                  >
                    <TaskVisual
                      icon={task.icon}
                      imageUrl={task.image_url}
                      visualClassName="h-20 w-20 rounded-3xl p-2 text-5xl sm:h-24 sm:w-24 sm:p-2.5 sm:text-6xl"
                      className="bg-white/90"
                    />
                  </motion.div>

                  {/* Points badge */}
                  <span className="whitespace-nowrap rounded-full bg-yellow-400/40 px-3 py-1 text-base font-bold text-white sm:text-lg">
                    ⭐{task.points}
                  </span>

                  {/* Completing animation */}
                  {completingId === task.id && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="text-5xl"
                        animate={{ scale: [0, 1.5, 1], rotate: [0, 360] }}
                        transition={{ duration: 0.8 }}
                      >
                        ⭐
                      </motion.div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticker book preview */}
      {petState && petState.stickers.length > 0 && (
        <div className="relative z-10 mx-auto w-full max-w-[480px] px-3 pb-6 sm:max-w-[520px] sm:px-4 sm:pb-8">
          <div className="bg-white/15 backdrop-blur rounded-3xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">📖</span>
              <span className="text-xl font-bold text-white drop-shadow">Today&apos;s Stickers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {petState.stickers.map((sticker, i) => (
                <motion.div
                  key={i}
                  initial={{ rotate: -10, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  className="text-3xl bg-white/20 rounded-2xl p-3"
                >
                  {sticker.image_url ? (
                    <img src={sticker.image_url} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    sticker.icon
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stars jar visualization */}
      <div className="relative z-10 mx-auto w-full max-w-[480px] px-3 pb-6 sm:max-w-[520px] sm:px-4 sm:pb-8">
        <motion.div
          className="bg-white/15 backdrop-blur rounded-3xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-4xl">🏺</span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 truncate whitespace-nowrap text-lg font-bold text-white">Star Jar</div>
              <div className="h-6 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-400 rounded-full"
                  animate={{ width: `${Math.min(100, ((petState?.stats.stars || 0) / 500) * 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xl font-bold text-white">{(petState?.stats.stars || 0)}⭐</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              audio.playButtonClick();
              setShowRewardShop(true);
            }}
            className="mt-4 min-h-[64px] w-full rounded-3xl border-2 border-white/30 bg-white/25 text-xl font-bold text-white shadow-lg hover:bg-white/35 sm:text-2xl"
            aria-label="Open reward shop"
          >
            🎁 Reward Shop
          </motion.button>
        </motion.div>
      </div>

      {/* Fireworks overlay */}
      <AnimatePresence>
        {showFireworks && (
          <motion.div
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 20 }, (_, i) => {
              const angle = (i / 20) * 360;
              const distance = 100 + ((i * 137) % 150);
              return (
                <motion.div
                  key={i}
                  className="absolute text-3xl"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ x: 0, y: 0, scale: 1 }}
                  animate={{
                    x: Math.cos((angle * Math.PI) / 180) * distance,
                    y: Math.sin((angle * Math.PI) / 180) * distance,
                    scale: [1, 2, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                  {['🎉', '✨', '⭐', '🌟', '💫', '🎊'][i % 6]}
                </motion.div>
              );
            })}
            <motion.div
              className="text-8xl"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ duration: 0.5 }}
            >
              🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Family Message Board */}
      <div className="safe-bottom relative z-10 mx-auto w-full max-w-[480px] px-3 pb-6 sm:max-w-[520px] sm:px-4">
        <FamilyMessageBoard compact />
      </div>

      <AnimatePresence>
        {showRewardShop && (
          <motion.div
            className="fixed inset-0 z-[60] bg-white overflow-y-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
          >
            <RewardShop onClose={() => setShowRewardShop(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
