import React, { useEffect, useRef } from 'react';
import type { GameResult } from '@/types/game';
import { publicAsset } from '@/lib/assets';

// Маппинг id рыб из FISH_DATA на индекс спрайта (0-6)
const FISH_SPRITE_MAP: Record<string, number> = {
    'carp': 0,
    'perch': 1,
    'bream': 2,
    'pike': 3,
    'catfish': 4,
    'goldfish': 5,
    'mutant': 6,
};

interface MonadFishCanvasProps {
    onCast: () => void;
    gameState: string;
    lastResult?: GameResult | null;
    rodLevel?: number;
}

const MonadFishCanvas: React.FC<MonadFishCanvasProps> = ({ onCast, gameState, lastResult, rodLevel = 0 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<any[]>([]);
    const bubblesRef = useRef<any[]>([]);
    const fishRef = useRef<any[]>([]);
    const bobberPosRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>();
    const pepeImgRef = useRef<HTMLImageElement | null>(null);
    const fishImgsRef = useRef<(HTMLImageElement | null)[]>(new Array(8).fill(null));
    const rodImgsRef = useRef<(HTMLImageElement | null)[]>(new Array(5).fill(null));
    const frameRef = useRef(0);

    // Загрузка картинок
    useEffect(() => {
        const ts = Date.now();
        const p = new Image();
        p.src = publicAsset('assets/pepe_final.png') + '?v=' + ts;
        p.onload = () => { pepeImgRef.current = p; };

        const fishFiles = ['fish_carp.png', 'fish_perch.png', 'fish_bream.png', 'fish_pike.png', 'fish_catfish.png', 'fish_goldfish.png', 'fish_mutant.png', 'fish_leviathan.png'];
        fishFiles.forEach((file, i) => {
            const img = new Image();
            img.src = publicAsset('assets/' + file) + '?v=' + ts + '&fix=nobelly+catfish';
            img.onload = () => { fishImgsRef.current[i] = img; };
        });

        const rodFiles = ['rod_basic.png', 'rod_bamboo.png', 'rod_carbon.png', 'rod_pro.png', 'rod_legendary.png'];
        rodFiles.forEach((file, i) => {
            const img = new Image();
            img.src = publicAsset('assets/' + file) + '?v=' + ts;
            img.onload = () => { rodImgsRef.current[i] = img; };
        });
    }, []);

    // --- Пузырь ---
    class Bubble {
        x: number; y: number; r: number; speed: number; wobble: number;
        constructor(w: number, h: number) {
            this.x = Math.random() * w;
            this.y = h * 0.5 + Math.random() * (h * 0.5);
            this.r = 2 + Math.random() * 4;
            this.speed = 0.3 + Math.random() * 0.7;
            this.wobble = Math.random() * Math.PI * 2;
        }
        update(h: number, waterLevel: number) {
            this.y -= this.speed;
            this.wobble += 0.05;
            this.x += Math.sin(this.wobble) * 0.3;
            if (this.y < waterLevel) { this.y = h; this.x = Math.random() * 1400; }
        }
        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#aaddff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // --- Рыба ---
    // Характеристики каждого вида: [скорость, размер, глубина_мин, глубина_макс, вихляние]
    const FISH_TRAITS: Record<number, { speed: number; size: number; depthMin: number; depthMax: number; wobbleSpeed: number }> = {
        0: { speed: 0.4, size: 28, depthMin: 0.40, depthMax: 0.85, wobbleSpeed: 0.04 },  // Карась - медленный, мелкий
        1: { speed: 0.7, size: 32, depthMin: 0.38, depthMax: 0.75, wobbleSpeed: 0.06 },  // Окунь - средний, любопытный
        2: { speed: 0.5, size: 40, depthMin: 0.50, depthMax: 0.90, wobbleSpeed: 0.04 },  // Лещ - большой, глубоководный
        3: { speed: 1.2, size: 45, depthMin: 0.36, depthMax: 0.70, wobbleSpeed: 0.08 },  // Щука - быстрый хищник
        4: { speed: 0.3, size: 55, depthMin: 0.65, depthMax: 0.95, wobbleSpeed: 0.03 },  // Сом - огромный, у дна
        5: { speed: 0.6, size: 25, depthMin: 0.34, depthMax: 0.55, wobbleSpeed: 0.07 },  // Золотая рыбка - маленькая, у поверхности
        6: { speed: 0.9, size: 35, depthMin: 0.40, depthMax: 0.90, wobbleSpeed: 0.12 },  // Мутант - непредсказуемый
        7: { speed: 0.2, size: 70, depthMin: 0.70, depthMax: 0.95, wobbleSpeed: 0.02 },  // Левиафан - огромный, у дна, медленный
    };

    class FishEntity {
        x: number; y: number; targetX: number; targetY: number;
        speed: number; size: number; angle: number;
        state: 'idle' | 'chasing' | 'booked';
        wobble: number; fishType: number; wobbleSpeed: number;
        depthMin: number; depthMax: number;

        constructor(w: number, h: number, fishType: number) {
            const traits = FISH_TRAITS[fishType] || FISH_TRAITS[0];
            this.fishType = fishType;
            this.speed = traits.speed + Math.random() * 0.3;
            this.size = traits.size + Math.random() * 10;
            this.wobbleSpeed = traits.wobbleSpeed;
            this.depthMin = traits.depthMin;
            this.depthMax = traits.depthMax;
            this.x = Math.random() * w;
            this.y = h * this.depthMin + Math.random() * (h * (this.depthMax - this.depthMin));
            this.targetX = this.x; this.targetY = this.y;
            this.angle = 0; this.state = 'idle';
            this.wobble = Math.random() * Math.PI * 2;
            this.setRandomTarget(w, h);
        }
        setRandomTarget(w: number, h: number) {
            this.targetX = 50 + Math.random() * (w - 100);
            this.targetY = h * this.depthMin + Math.random() * (h * (this.depthMax - this.depthMin));
        }
        update(w: number, h: number, bobber: { x: number; y: number }, gs: string) {
            this.wobble += this.wobbleSpeed;
            if (this.state === 'booked') {
                this.x += (bobber.x - this.x) * 0.15;
                this.y += (bobber.y + 12 - this.y) * 0.15;
                this.angle = -Math.PI / 2 + Math.sin(this.wobble * 4) * 0.35;
                return;
            }
            if (gs === 'waiting' && Math.random() < 0.005) this.state = 'chasing';
            if (gs === 'idle') this.state = 'idle';

            let tx = this.targetX, ty = this.targetY;
            const minY = h * 0.38;
            if (this.state === 'chasing' && gs === 'waiting') {
                tx = bobber.x + Math.cos(this.wobble) * 60;
                ty = Math.max(minY, bobber.y + 30 + Math.sin(this.wobble) * 20);
            } else if (this.state === 'idle') {
                if (Math.hypot(tx - this.x, ty - this.y) < 15) this.setRandomTarget(w, h);
            }
            ty = Math.max(minY, ty);
            const ta = Math.atan2(ty - this.y, tx - this.x);
            let diff = ta - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.06;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            if (this.y < minY) this.y = minY + 10;
            if (this.x < -50) this.x = w + 50;
            if (this.x > w + 50) this.x = -50;
        }
        draw(ctx: CanvasRenderingContext2D, imgs: (HTMLImageElement | null)[]) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (Math.abs(this.angle) > Math.PI / 2) ctx.scale(-1, 1);
            ctx.rotate(Math.sin(this.wobble * 2.5) * 0.04);
            const img = imgs[this.fishType];
            if (img) {
                const aspect = img.width / img.height;
                const dw = this.size * 2, dh = dw / aspect;
                ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            } else {
                const colors = ['#4488ff', '#ff8844', '#44aa44', '#8844cc'];
                ctx.fillStyle = colors[this.fishType] || '#4488ff';
                ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-this.size, 0); ctx.lineTo(-this.size - 14, -12); ctx.lineTo(-this.size - 14, 12); ctx.fill();
                ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(this.size * 0.5, -4, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(this.size * 0.5 + 2, -4, 2.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }

    // --- Частицы ---
    class Particle {
        x: number; y: number; vx: number; vy: number; life: number; color: string; r: number;
        constructor(x: number, y: number, color: string) {
            this.x = x; this.y = y; this.color = color; this.life = 1;
            this.vx = (Math.random() - 0.5) * 5; this.vy = -1 - Math.random() * 4;
            this.r = 2 + Math.random() * 3;
        }
        update() { this.x += this.vx; this.y += this.vy; this.vy += 0.08; this.life -= 0.018; }
        draw(ctx: CanvasRenderingContext2D) {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            const radius = Math.max(0, this.r * this.life);
            ctx.beginPath(); ctx.arc(this.x, this.y, radius, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // === ГЛАВНЫЙ РЕНДЕР ===
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (fishRef.current.length === 0) {
            const w = window.innerWidth, h = window.innerHeight;
            for (let i = 0; i < 8; i++) fishRef.current.push(new FishEntity(w, h, i));
        }
        if (bubblesRef.current.length === 0) {
            for (let i = 0; i < 20; i++) bubblesRef.current.push(new Bubble(window.innerWidth, window.innerHeight));
        }

        const render = () => {
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            frameRef.current++;
            const t = Date.now() * 0.001;
            const waterLevel = h * 0.32;

            // === НЕБО ===
            const sky = ctx.createLinearGradient(0, 0, 0, waterLevel);
            sky.addColorStop(0, '#0a0a2e');
            sky.addColorStop(0.5, '#151545');
            sky.addColorStop(1, '#1e2a5a');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, waterLevel);

            // Звёзды (мерцание)
            for (let i = 0; i < 50; i++) {
                const sx = (i * 137.5 + 50) % w, sy = (i * 73.3 + 10) % (waterLevel - 30);
                ctx.globalAlpha = 0.2 + Math.sin(t * 2 + i * 0.7) * 0.3;
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(sx, sy, 0.8 + (i % 3) * 0.4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Луна
            const moonX = w * 0.8, moonY = waterLevel * 0.3;
            ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#f5e6c8';
            ctx.shadowColor = '#f5e6c8'; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.arc(moonX, moonY, 30, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.15; ctx.fillStyle = '#c9b896';
            ctx.beginPath(); ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(moonX + 10, moonY + 8, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.restore();

            // === ВОДА ===
            const water = ctx.createLinearGradient(0, waterLevel, 0, h);
            water.addColorStop(0, '#006994');
            water.addColorStop(0.15, '#005f87');
            water.addColorStop(0.5, '#003d5c');
            water.addColorStop(1, '#001520');
            ctx.fillStyle = water;
            ctx.fillRect(0, waterLevel, w, h - waterLevel);

            // Лучи света
            ctx.save(); ctx.globalAlpha = 0.04; ctx.fillStyle = '#88bbdd';
            for (let i = 0; i < 8; i++) {
                const lx = w * (0.08 + i * 0.12), sp = 30 + i * 5;
                ctx.beginPath(); ctx.moveTo(lx, waterLevel); ctx.lineTo(lx - sp, h); ctx.lineTo(lx + sp, h); ctx.fill();
            }
            ctx.restore();

            // Волны
            for (let layer = 0; layer < 2; layer++) {
                ctx.strokeStyle = layer === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(200,230,255,0.12)';
                ctx.lineWidth = layer === 0 ? 2 : 1.5;
                ctx.beginPath(); ctx.moveTo(0, waterLevel + layer * 3);
                for (let x = 0; x < w; x += 6) {
                    ctx.lineTo(x, waterLevel + layer * 3 + Math.sin(x * 0.012 + t * (1 + layer * 0.3)) * 4 + Math.sin(x * 0.006 + t * 0.5) * 2);
                }
                ctx.stroke();
            }

            // Водоросли
            ctx.save();
            for (let i = 0; i < 12; i++) {
                const wx = (i * 107 + 30) % w, wh = 30 + (i % 4) * 15;
                const sway = Math.sin(t * 0.8 + i * 1.2) * 8;
                ctx.strokeStyle = i % 2 === 0 ? '#1a6633' : '#0d4422'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(wx, h); ctx.quadraticCurveTo(wx + sway, h - wh * 0.6, wx + sway * 0.5, h - wh); ctx.stroke();
                ctx.fillStyle = i % 2 === 0 ? '#228844' : '#115533';
                ctx.beginPath(); ctx.ellipse(wx + sway * 0.5, h - wh, 4, 8, sway * 0.02, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();

            // === ПЕПЕ В ЛОДКЕ ===
            const pepe = pepeImgRef.current;
            const boatX = w * 0.04;
            const boatDrawH = Math.min(220, h * 0.3);
            let rodTipX = boatX + 200;
            let rodTipY = waterLevel - 80;

            if (pepe) {
                const aspect = pepe.width / pepe.height;
                const boatDrawW = boatDrawH * aspect;
                const boatY = waterLevel - boatDrawH * 0.62;
                const rockAngle = Math.sin(t * 1.5) * 0.015;

                // Кончик удочки — вычисляем с учётом поворота лодки
                const cx = boatX + boatDrawW / 2;
                const cy = boatY + boatDrawH / 2;
                const localRodX = boatDrawW * 0.493;
                const localRodY = -boatDrawH * 0.323;
                const cosR = Math.cos(rockAngle), sinR = Math.sin(rockAngle);
                rodTipX = cx + localRodX * cosR - localRodY * sinR;
                rodTipY = cy + localRodX * sinR + localRodY * cosR;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(rockAngle);
                if (gameState === 'biting' || gameState === 'catching' || gameState === 'result') {
                    ctx.rotate(-0.06 + Math.sin(t * 8) * 0.03);
                }
                // Тень лодки
                ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.ellipse(0, boatDrawH * 0.35, boatDrawW * 0.45, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();

                ctx.drawImage(pepe, -boatDrawW / 2, -boatDrawH / 2, boatDrawW, boatDrawH);
                ctx.restore();
            } else {
                // Фоллбек лодка
                ctx.fillStyle = '#8B4513';
                const bw = 140, bh = 35, by2 = waterLevel - bh * 0.4;
                ctx.beginPath(); ctx.ellipse(boatX + bw / 2, by2, bw / 2, bh / 2, 0, 0, Math.PI); ctx.fill();
                ctx.fillStyle = '#2d8a4e';
                ctx.fillRect(boatX + bw * 0.35, by2 - 45, 25, 40);
                ctx.beginPath(); ctx.arc(boatX + bw * 0.35 + 12, by2 - 55, 14, 0, Math.PI * 2); ctx.fill();
            }

            // === ЛЕСКА И КРЮЧОК ===
            if (gameState !== 'idle') {
                const bx = bobberPosRef.current.x;
                const by = bobberPosRef.current.y;

                // Леска от удочки к поплавку
                ctx.strokeStyle = 'rgba(220,230,255,0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(rodTipX, rodTipY);
                if (gameState === 'casting') {
                    ctx.quadraticCurveTo((rodTipX + bx) / 2, Math.min(rodTipY, by) - 80, bx, by);
                } else {
                    const mx = (rodTipX + bx) / 2, my = (rodTipY + by) / 2 + 15;
                    ctx.quadraticCurveTo(mx, my, bx, by);
                }
                ctx.stroke();

                // Круги на воде
                if (by > waterLevel - 10 && gameState !== 'casting') {
                    ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 0.8;
                    for (let r = 0; r < 3; r++) {
                        const rr = 4 + r * 7 + Math.sin(t * 2 + r) * 2;
                        ctx.beginPath(); ctx.ellipse(bx, waterLevel + Math.sin(t) * 2, rr, rr * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
                    }
                    ctx.restore();
                }

                // Поплавок (стиль зависит от rodLevel)
                if (rodLevel >= 4) {
                    // Легендарный — золотой поплавок с свечением
                    ctx.save(); ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 12;
                    ctx.fillStyle = '#ffcc00';
                    ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff8e0';
                    ctx.beginPath(); ctx.arc(bx - 1, by - 3, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                } else if (rodLevel >= 3) {
                    // Эпический — фиолетовый с полосой
                    ctx.fillStyle = '#9944ff';
                    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#cc88ff';
                    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(bx - 1, by - 2, 2, 0, Math.PI * 2); ctx.fill();
                } else if (rodLevel >= 2) {
                    // Редкий — синий поплавок
                    ctx.fillStyle = '#2255cc';
                    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#4488ff';
                    ctx.beginPath(); ctx.arc(bx - 1, by - 2, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(bx - 2, by - 3, 1.5, 0, Math.PI * 2); ctx.fill();
                } else if (rodLevel >= 1) {
                    // Необычный — зелёный поплавок
                    ctx.fillStyle = '#22aa44';
                    ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#66dd88';
                    ctx.beginPath(); ctx.arc(bx - 1, by - 2, 3, 0, Math.PI * 2); ctx.fill();
                } else {
                    // Базовый — красный поплавок
                    ctx.fillStyle = '#ee1100';
                    ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(bx - 1, by - 2, 3, 0, Math.PI * 2); ctx.fill();
                }

                // Леска вниз от поплавка
                const hookY = by + 50;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.moveTo(bx, by + 6); ctx.lineTo(bx, hookY); ctx.stroke();

                // Крючок
                ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(bx, hookY); ctx.lineTo(bx, hookY + 6);
                ctx.quadraticCurveTo(bx + 8, hookY + 14, bx + 2, hookY + 10);
                ctx.quadraticCurveTo(bx - 3, hookY + 6, bx - 2, hookY + 2);
                ctx.stroke();
                // Остриё
                ctx.fillStyle = '#ccc'; ctx.beginPath();
                ctx.moveTo(bx - 2, hookY + 2); ctx.lineTo(bx - 5, hookY - 1); ctx.lineTo(bx - 1, hookY + 1); ctx.fill();

                // Червяк-наживка (извивающийся)
                const ww = Math.sin(t * 5) * 3;
                ctx.strokeStyle = '#ff6633'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(bx + 2, hookY + 8);
                ctx.quadraticCurveTo(bx + 5 + ww, hookY + 14, bx + 2 + ww * 0.5, hookY + 18);
                ctx.stroke(); ctx.lineCap = 'butt';

                // Пойманная рыба на крючке
                const bookedFish = fishRef.current.find((f: any) => f.state === 'booked');
                if (bookedFish && fishImgsRef.current[bookedFish.fishType]) {
                    const fImg = fishImgsRef.current[bookedFish.fishType]!;
                    const fA = fImg.width / fImg.height;
                    const fW = 60, fH = fW / fA;
                    ctx.save();
                    ctx.translate(bx, hookY + 10);
                    ctx.rotate(Math.sin(t * 3) * 0.2);
                    ctx.drawImage(fImg, -fW / 2, -fH / 2, fW, fH);
                    ctx.restore();
                }
            }

            // === ПУЗЫРЬКИ ===
            bubblesRef.current.forEach(b => { b.update(h, waterLevel); b.draw(ctx); });

            // === РЫБЫ ===
            // При catching — цепляем рыбу правильного типа
            if ((gameState === 'biting' || gameState === 'catching') && lastResult?.success && lastResult.fish) {
                const targetType = FISH_SPRITE_MAP[lastResult.fish.id] ?? 0;
                const alreadyBooked = fishRef.current.some((f: any) => f.state === 'booked');
                if (!alreadyBooked) {
                    // Ищем ближайшую рыбу нужного типа
                    let best: any = null, bestDist = Infinity;
                    fishRef.current.forEach((f: any) => {
                        if (f.fishType === targetType && f.state !== 'booked') {
                            const d = Math.hypot(f.x - bobberPosRef.current.x, f.y - bobberPosRef.current.y);
                            if (d < bestDist) { bestDist = d; best = f; }
                        }
                    });
                    // Если нет нужного типа — берём любую и меняем тип
                    if (!best) {
                        let anyBest: any = null, anyDist = Infinity;
                        fishRef.current.forEach((f: any) => {
                            if (f.state !== 'booked') {
                                const d = Math.hypot(f.x - bobberPosRef.current.x, f.y - bobberPosRef.current.y);
                                if (d < anyDist) { anyDist = d; anyBest = f; }
                            }
                        });
                        if (anyBest) { anyBest.fishType = targetType; best = anyBest; }
                    }
                    if (best) best.state = 'booked';
                }
            }
            // Сброс всех эффектов перед отрисовкой рыб (гарантия непрозрачности)
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;

            fishRef.current.forEach((f: any) => {
                f.update(w, h, bobberPosRef.current, gameState);
                if (gameState === 'idle' && f.state === 'booked') {
                    f.state = 'idle'; f.y = h * 0.6 + Math.random() * (h * 0.3); f.x = Math.random() * w;
                }
                f.draw(ctx, fishImgsRef.current);
            });

            // === ЧАСТИЦЫ ===
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            particlesRef.current.forEach(p => { p.update(); p.draw(ctx); });

            // === DEBUG OVERLAY ===
            if (window.location.search.includes('debug')) {
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(5, h - 180, 350, 175);
                ctx.font = '12px monospace';
                ctx.fillStyle = '#ffff00';
                const dbg = [
                    `gameState: ${gameState}`,
                    `bobber: x=${bobberPosRef.current.x.toFixed(0)} y=${bobberPosRef.current.y.toFixed(0)}`,
                    `rodTip: x=${rodTipX.toFixed(0)} y=${rodTipY.toFixed(0)}`,
                    `waterLevel: ${waterLevel.toFixed(0)}`,
                    `fish count: ${fishRef.current.length}`,
                    `booked fish: ${fishRef.current.filter((f: any) => f.state === 'booked').length}`,
                    `pepe loaded: ${!!pepeImgRef.current}`,
                    `fish imgs: [${fishImgsRef.current.map((img, i) => img ? `${i}:OK` : `${i}:NO`).join(', ')}]`,
                    `bubbles: ${bubblesRef.current.length}`,
                    `particles: ${particlesRef.current.length}`,
                    `screen: ${w}x${h}`,
                ];
                dbg.forEach((line, i) => {
                    ctx.fillText(line, 10, h - 165 + i * 15);
                });
                ctx.restore();
            }

            animationFrameRef.current = requestAnimationFrame(render);
        };

        const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', handleResize);
        handleResize();
        render();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, [gameState]);

    // === ФИЗИКА ЗАБРОСА ===
    useEffect(() => {
        if (gameState === 'casting') {
            const wl = window.innerHeight * 0.32;
            const pepe = pepeImgRef.current;
            const boatDrawH = Math.min(220, window.innerHeight * 0.3);
            const aspect = pepe ? pepe.width / pepe.height : 1.5;
            const boatDrawW = boatDrawH * aspect;
            // Стартовая позиция = кончик удочки (пропорции из анализа спрайта)
            const boatX = window.innerWidth * 0.04;
            const cx = boatX + boatDrawW / 2;
            const cy = (wl - boatDrawH * 0.62) + boatDrawH / 2;
            const startX = cx + boatDrawW * 0.493;
            const startY = cy - boatDrawH * 0.323;
            const targetX = window.innerWidth * 0.5 + Math.random() * (window.innerWidth * 0.3);
            const targetY = wl;

            let progress = 0;
            const timer = setInterval(() => {
                progress += 0.03;
                if (progress >= 1) {
                    clearInterval(timer);
                    bobberPosRef.current = { x: targetX, y: targetY - 2 };
                    for (let i = 0; i < 18; i++) {
                        particlesRef.current.push(new Particle(targetX, targetY, '#88ccff'));
                    }
                } else {
                    bobberPosRef.current.x = startX + (targetX - startX) * progress;
                    bobberPosRef.current.y = startY - 200 * Math.sin(progress * Math.PI) + (targetY - startY) * progress;
                }
            }, 16);
            return () => {
                clearInterval(timer);
                // При cleanup -- сразу ставим поплавок на воду
                bobberPosRef.current = { x: targetX, y: targetY - 2 };
            };
        }
    }, [gameState]);

    // === BOBBER SPLASH DURING BITING ===
    useEffect(() => {
        if (gameState === 'biting') {
            const baseY = bobberPosRef.current.y;
            const baseX = bobberPosRef.current.x;
            let frame = 0;
            const timer = setInterval(() => {
                frame++;
                // Aggressive bobbing
                bobberPosRef.current.y = baseY + Math.sin(frame * 0.6) * 8;
                bobberPosRef.current.x = baseX + Math.sin(frame * 0.3) * 3;
                // Splash particles
                if (frame % 5 === 0) {
                    particlesRef.current.push(new Particle(baseX + (Math.random() - 0.5) * 20, baseY, '#88ccff'));
                }
            }, 16);
            return () => {
                clearInterval(timer);
                bobberPosRef.current.y = baseY;
                bobberPosRef.current.x = baseX;
            };
        }
    }, [gameState]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default MonadFishCanvas;
