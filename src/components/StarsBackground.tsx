import React, { useEffect, useState } from 'react';

export default function StarsBackground() {
  const [stars, setStars] = useState<{ id: number, top: string, left: string, size: number, duration: number }[]>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 20,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-900">
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full opacity-70 animate-pulse"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationIterationCount: 'infinite',
            animationName: 'float',
            animationTimingFunction: 'linear'
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-200px) translateX(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
