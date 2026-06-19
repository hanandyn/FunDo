/**
 * VoicePrompt — voice toggle button component for Tier 1 (ages 3-5).
 *
 * Big, colorful, no text — just a toggle for voice guidance.
 * Uses the useVoicePrompt hook and speak function from useVoicePrompt.ts.
 */
export function VoicePromptButton({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl
                 transition-all duration-300 shadow-lg
                 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-300"
      style={{
        background: enabled
          ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
          : 'linear-gradient(135deg, #9ca3af, #6b7280)',
      }}
      aria-label={enabled ? 'Voice on' : 'Voice off'}
      title={enabled ? 'Voice on' : 'Voice off'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}

export default VoicePromptButton;
