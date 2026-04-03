import React from 'react';

export default function FilmstripBackground() {
  return (
    <>
      <style>
        {`
          .filmstrip-container {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: -2;
            overflow: hidden;
            display: flex;
            justify-content: space-around;
            transform: perspective(800px) rotateX(15deg) scale(1.1);
            opacity: 0.4;
          }

          .film-track {
            position: relative;
            width: 14vw;
            height: 200vh; /* Double height for seamless scroll */
            background: linear-gradient(to right, rgba(10,10,15,0.8), rgba(20,20,30,0.5), rgba(10,10,15,0.8));
            border-left: 2px solid rgba(255, 255, 255, 0.05);
            border-right: 2px solid rgba(255, 255, 255, 0.05);
            /* Simulating the film strip holes along the edges */
            mask-image: 
              linear-gradient(to bottom, black 0%, black 100%),
              repeating-linear-gradient(to bottom, transparent 0px, transparent 15px, black 15px, black 25px);
            -webkit-mask-image: 
              linear-gradient(to right, 
                transparent 10px, 
                black 10px, 
                black calc(100% - 10px), 
                transparent calc(100% - 10px)),
              repeating-linear-gradient(to bottom, transparent 0px, transparent 12px, black 12px, black 20px);
          }

          /* Creating physical sprocket hole squares natively without SVG */
          .film-track::before, .film-track::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            width: 12px;
            background: repeating-linear-gradient(
              to bottom,
              transparent 0,
              transparent 8px,
              rgba(255, 255, 255, 0.15) 8px,
              rgba(255, 255, 255, 0.15) 20px
            );
          }

          .film-track::before { left: 4px; }
          .film-track::after { right: 4px; }

          /* Background moving color tint inside the film frames to represent footage scanning */
          .film-frames {
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
              to bottom,
              transparent 0%,
              transparent 140px,
              rgba(124, 58, 237, 0.08) 140px,
              rgba(124, 58, 237, 0.08) 145px
            );
          }

          /* Infinitely scrolling animation */
          .scroll-down {
            animation: rollFilm 25s linear infinite;
          }

          .scroll-up {
            animation: rollFilm 35s linear infinite reverse;
          }

          .track-1 { animation-duration: 20s; filter: blur(2px); }
          .track-2 { animation-duration: 35s; transform: scaleX(1.3); opacity: 0.7;}
          .track-3 { animation-duration: 28s; filter: blur(1px); }

          @keyframes rollFilm {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50vh); } /* Rolls completely seamlessly */
          }
        `}
      </style>
      
      <div className="filmstrip-container">
        <div className="film-track scroll-down track-1">
          <div className="film-frames"></div>
        </div>
        <div className="film-track scroll-up track-2">
           <div className="film-frames"></div>
        </div>
        <div className="film-track scroll-down track-3">
           <div className="film-frames"></div>
        </div>
      </div>
    </>
  );
}
