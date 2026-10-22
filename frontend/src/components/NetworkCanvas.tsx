"use client";
import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  label: string;
  type: 'validator' | 'storage' | 'relay' | 'edge';
  pulse: number;
}

interface PulsePacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
}

export const NetworkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates for interactive repulsion/glow
    const mouse = { x: -1000, y: -1000, radius: 150 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize Network Nodes
    const nodeCount = Math.min(Math.floor((width * height) / 32000), 38);
    const nodeTypes: ('validator' | 'storage' | 'relay' | 'edge')[] = [
      'validator', 'storage', 'storage', 'relay', 'relay', 'edge'
    ];

    const nodes: Node[] = Array.from({ length: nodeCount }, (_, i) => {
      const type = nodeTypes[i % nodeTypes.length];
      const baseRadius = type === 'validator' ? 5 : type === 'storage' ? 4 : 3;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: baseRadius,
        baseRadius,
        label: type === 'validator' ? `VAL-0x${(i * 7 + 11).toString(16).toUpperCase()}` : 
               type === 'storage' ? `IPFS-SHARD-${i}` : `PEER-NODE-${i}`,
        type,
        pulse: Math.random() * Math.PI * 2,
      };
    });

    // In-flight pulse packets traveling along network edges
    const activePackets: PulsePacket[] = [];
    const maxPackets = 14;

    const getNodeColor = (type: Node['type'], alpha = 1) => {
      switch (type) {
        case 'validator':
          return `rgba(56, 189, 248, ${alpha})`; // Cyan
        case 'storage':
          return `rgba(168, 85, 247, ${alpha})`; // Purple
        case 'relay':
          return `rgba(16, 185, 129, ${alpha})`; // Emerald
        case 'edge':
          return `rgba(244, 114, 182, ${alpha})`; // Pink
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep cybernetic vignette gradient
      const bgGradient = ctx.createRadialGradient(
        width / 2, height / 2, 100,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      bgGradient.addColorStop(0, 'rgba(10, 15, 29, 0.4)');
      bgGradient.addColorStop(1, 'rgba(5, 8, 16, 0.9)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and connect nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Bounce on boundary
        if (node.x < 30 || node.x > width - 30) node.vx *= -1;
        if (node.y < 30 || node.y > height - 30) node.vy *= -1;

        // Mouse interaction
        const dxMouse = mouse.x - node.x;
        const dyMouse = mouse.y - node.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < mouse.radius) {
          node.radius = node.baseRadius * 1.8;
        } else {
          node.radius = node.baseRadius;
        }

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 180;

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.35;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Spawn pulse packets occasionally
            if (activePackets.length < maxPackets && Math.random() < 0.003) {
              activePackets.push({
                fromNode: i,
                toNode: j,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02,
                color: getNodeColor(node.type, 0.9),
              });
            }
          }
        }
      }

      // Render in-flight packets
      for (let p = activePackets.length - 1; p >= 0; p--) {
        const pkt = activePackets[p];
        pkt.progress += pkt.speed;

        const n1 = nodes[pkt.fromNode];
        const n2 = nodes[pkt.toNode];
        if (!n1 || !n2) {
          activePackets.splice(p, 1);
          continue;
        }

        const px = n1.x + (n2.x - n1.x) * pkt.progress;
        const py = n1.y + (n2.y - n1.y) * pkt.progress;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pkt.color;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (pkt.progress >= 1) {
          activePackets.splice(p, 1);
        }
      }

      // Draw Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.pulse += 0.03;

        // Concentric radar ring
        ctx.beginPath();
        const pulseRadius = node.radius + Math.sin(node.pulse) * 4 + 4;
        ctx.arc(node.x, node.y, Math.max(pulseRadius, 1), 0, Math.PI * 2);
        ctx.strokeStyle = getNodeColor(node.type, 0.25);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(node.type, 0.9);
        ctx.shadowColor = getNodeColor(node.type, 0.8);
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Small node ID label
        if (node.type === 'validator' || node.radius > node.baseRadius) {
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillText(node.label, node.x + 8, node.y + 3);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  );
};
