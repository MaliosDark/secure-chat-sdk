import React, { useEffect, useRef } from 'react';
import type { AudioVisualizerProps } from '../types';

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioStream, 
  isActive, 
  type = 'waveform',
  color = '#3B82F6',
  height = 60,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    if (!audioStream || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(audioStream);
        
        analyser.fftSize = type === 'frequency' ? 256 : 2048;
        analyser.smoothingTimeConstant = 0.8;
        
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        draw();
      } catch (error) {
        console.error('Failed to setup audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, isActive, type]);

  const draw = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    if (type === 'frequency') {
      analyser.getByteFrequencyData(dataArray);
    } else {
      analyser.getByteTimeDomainData(dataArray);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'frequency') {
      drawFrequencyBars(ctx, dataArray, canvas.width, canvas.height);
    } else {
      drawWaveform(ctx, dataArray, canvas.width, canvas.height);
    }

    animationRef.current = requestAnimationFrame(draw);
  };

  const drawFrequencyBars = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) => {
    const barWidth = (width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = (dataArray[i] / 255) * height;

      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '40');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  return (
    <div className={`bg-black/20 backdrop-blur-sm rounded-lg border border-white/10 p-2 ${className}`}>
      <canvas
        ref={canvasRef}
        width={200}
        height={height}
        className="w-full rounded"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};