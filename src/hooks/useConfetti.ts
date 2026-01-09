import confetti from 'canvas-confetti';

export const useConfetti = () => {
  const fireConfetti = (options?: {
    x?: number;
    y?: number;
    particleCount?: number;
  }) => {
    confetti({
      particleCount: options?.particleCount ?? 50,
      spread: 60,
      origin: { 
        x: options?.x ?? 0.5, 
        y: options?.y ?? 0.5 
      },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5', '#FAFAD2'],
      ticks: 100,
      gravity: 1.2,
      scalar: 0.9,
    });
  };

  const fireStarConfetti = (x: number, y: number) => {
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { x, y },
      colors: ['#FFD700', '#FFC107', '#FFEB3B'],
      shapes: ['star'],
      ticks: 60,
      scalar: 0.8,
    });
  };

  return { fireConfetti, fireStarConfetti };
};
