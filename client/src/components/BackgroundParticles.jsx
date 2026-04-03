import { useEffect, useState } from 'react';

const PARTICLE_COUNT = 25;

export default function BackgroundParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr.push({
        id: i,
        size: Math.random() * 8 + 3, // 3px to 11px
        x: Math.random() * 100, // 0 to 100vw
        y: Math.random() * 100, // starting position %
        duration: Math.random() * 20 + 15, // 15s to 35s animation
        delay: Math.random() * 10, // 0s to 10s delay
        opacity: Math.random() * 0.4 + 0.1, // 0.1 to 0.5 opacity
      });
    }
    setParticles(arr);
  }, []);

  return (
    <div 
      className="particle-container" 
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden'
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            position: 'absolute',
            left: `${p.x}vw`,
            bottom: `-20px`, // Start just below screen
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.id % 2 === 0 ? 'rgba(124, 58, 237, 0.8)' : 'rgba(236, 72, 153, 0.8)',
            boxShadow: p.id % 2 === 0 ? '0 0 12px rgba(124, 58, 237, 0.6)' : '0 0 12px rgba(236, 72, 153, 0.6)',
            borderRadius: '50%',
            opacity: p.opacity,
            animation: `floatUp ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
