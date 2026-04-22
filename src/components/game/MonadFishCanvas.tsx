import React, { useEffect, useRef } from 'react';
import type { GameResult } from '@/types/game';
import { publicAsset } from '@/lib/assets';
import type { MainSceneAssets } from '@/lib/mainSceneAssets';

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

const drawAnimatedSprite = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    phase: number,
    intensity = 1
) => {
    const swim = Math.sin(phase * 2.2);
    const glide = Math.sin(phase * 1.15);
    const skew = Math.sin(phase * 2.8) * 0.018 * intensity;
    const squash = swim * 0.018 * intensity;

    ctx.save();
    ctx.translate(glide * 0.8 * intensity, Math.cos(phase * 1.35) * 0.75 * intensity);
    ctx.transform(1 + squash, skew, 0, 1 - squash * 0.35, 0, 0);
    
    // Тень для пузика
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;
    
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
};

const drawWaterSurface = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    waterLevel: number,
    t: number
) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, waterLevel - 8, w, h - waterLevel + 8);
    ctx.clip();

    const underwaterBase = ctx.createLinearGradient(0, waterLevel - 8, 0, h);
    underwaterBase.addColorStop(0, 'rgba(31, 106, 191, 0.72)');
    underwaterBase.addColorStop(0.12, 'rgba(24, 95, 188, 0.82)');
    underwaterBase.addColorStop(0.58, 'rgba(12, 72, 148, 0.9)');
    underwaterBase.addColorStop(1, 'rgba(5, 28, 72, 0.96)');
    ctx.fillStyle = underwaterBase;
    ctx.fillRect(0, waterLevel - 8, w, h - waterLevel + 8);

    const surfaceGlow = ctx.createLinearGradient(0, waterLevel - 10, 0, waterLevel + h * 0.24);
    surfaceGlow.addColorStop(0, 'rgba(125, 235, 255, 0.28)');
    surfaceGlow.addColorStop(0.28, 'rgba(34, 211, 238, 0.12)');
    surfaceGlow.addColorStop(1, 'rgba(2, 8, 23, 0)');
    ctx.fillStyle = surfaceGlow;
    ctx.fillRect(0, waterLevel - 8, w, h - waterLevel + 8);

    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i++) {
        const y = waterLevel + i * 18 + Math.sin(t * 1.6 + i) * 3;
        const amp = 3 + i * 0.25;
        ctx.beginPath();
        for (let x = -24; x <= w + 24; x += 18) {
            const waveY = y
                + Math.sin(x * 0.012 + t * 1.9 + i * 0.8) * amp
                + Math.sin(x * 0.028 - t * 1.15) * 1.4;
            if (x === -24) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
        }
        ctx.strokeStyle = `rgba(180, 245, 255, ${0.16 - i * 0.012})`;
        ctx.lineWidth = i === 0 ? 2.2 : 1;
        ctx.stroke();
    }

    for (let i = 0; i < 16; i++) {
        const x = ((i * 173 + t * 24) % (w + 160)) - 80;
        const y = waterLevel + 28 + ((i * 47 + Math.sin(t + i) * 22) % Math.max(80, h - waterLevel - 70));
        ctx.globalAlpha = 0.05 + (i % 3) * 0.025;
        ctx.fillStyle = '#dffbff';
        ctx.beginPath();
        ctx.ellipse(x, y, 18 + (i % 4) * 9, 1.2, Math.sin(i) * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
};

const drawBoatReflection = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    boatX: number,
    boatY: number,
    boatDrawW: number,
    boatDrawH: number,
    waterLevel: number,
    t: number
) => {
    const sceneWidth = ctx.canvas.clientWidth || ctx.canvas.width;
    const sceneHeight = ctx.canvas.clientHeight || ctx.canvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, waterLevel - 2, sceneWidth, Math.min(sceneHeight - waterLevel + 2, boatDrawH * 0.55));
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';

    const strip = 5;
    for (let y = 0; y < boatDrawH; y += strip) {
        const originalY = boatY + y;
        if (originalY > waterLevel + boatDrawH * 0.18) continue;

        const distance = Math.max(0, waterLevel - originalY);
        const destY = waterLevel + distance * 0.34 + 8;
        const fade = Math.max(0, 1 - (destY - waterLevel) / (boatDrawH * 0.52));
        const wave = Math.sin(t * 2.2 + y * 0.11) * 5 + Math.sin(t * 1.1 + y * 0.037) * 3;

        ctx.globalAlpha = 0.2 * fade;
        ctx.drawImage(
            img,
            0,
            (y / boatDrawH) * img.height,
            img.width,
            Math.max(1, (strip / boatDrawH) * img.height),
            boatX + wave,
            destY,
            boatDrawW,
            strip * 0.72
        );
    }

    ctx.restore();
};

const drawBoatWaterlineOverlay = (
    ctx: CanvasRenderingContext2D,
    boatX: number,
    boatY: number,
    boatDrawW: number,
    boatDrawH: number,
    waterLevel: number,
    t: number
) => {
    const overlayTop = Math.max(boatY + boatDrawH * 0.78, waterLevel - 3);
    const overlayBottom = Math.min(boatY + boatDrawH * 0.9, waterLevel + boatDrawH * 0.05);

    if (overlayBottom <= overlayTop) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(boatX - 10, overlayTop - 6, boatDrawW + 20, overlayBottom - overlayTop + 12);
    ctx.clip();

    const fill = ctx.createLinearGradient(0, overlayTop - 4, 0, overlayBottom + 18);
    fill.addColorStop(0, 'rgba(170, 244, 255, 0.08)');
    fill.addColorStop(0.32, 'rgba(21, 161, 203, 0.1)');
    fill.addColorStop(1, 'rgba(3, 51, 78, 0.03)');
    ctx.fillStyle = fill;

    ctx.beginPath();
    for (let x = -10; x <= boatDrawW + 10; x += 8) {
        const waveY = waterLevel + Math.sin(t * 2.2 + x * 0.045) * 2 + Math.cos(t * 1.2 + x * 0.018) * 0.9;
        const drawX = boatX + x;
        if (x === -10) ctx.moveTo(drawX, waveY);
        else ctx.lineTo(drawX, waveY);
    }
    ctx.lineTo(boatX + boatDrawW + 10, overlayBottom + 8);
    ctx.lineTo(boatX - 10, overlayBottom + 8);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let x = -8; x <= boatDrawW + 8; x += 10) {
            const waveY = waterLevel + i * 3 + Math.sin(t * (2.4 + i * 0.25) + x * 0.05 + i) * (1.6 - i * 0.3);
            const drawX = boatX + x;
            if (x === -8) ctx.moveTo(drawX, waveY);
            else ctx.lineTo(drawX, waveY);
        }
        ctx.strokeStyle = i === 0 ? 'rgba(224, 252, 255, 0.2)' : 'rgba(150, 233, 247, 0.1)';
        ctx.lineWidth = i === 0 ? 1.2 : 0.9;
        ctx.stroke();
    }

    ctx.restore();
};

const drawBoatWake = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    waterLevel: number,
    boatDrawW: number,
    t: number
) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const wakeGradient = ctx.createRadialGradient(
        centerX,
        waterLevel + 5,
        8,
        centerX,
        waterLevel + 12,
        boatDrawW * 0.24
    );
    wakeGradient.addColorStop(0, 'rgba(210, 248, 255, 0.12)');
    wakeGradient.addColorStop(0.45, 'rgba(97, 218, 251, 0.05)');
    wakeGradient.addColorStop(1, 'rgba(97, 218, 251, 0)');
    ctx.fillStyle = wakeGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, waterLevel + 12, boatDrawW * 0.22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 2; i++) {
        const radiusX = boatDrawW * (0.16 + i * 0.09);
        const radiusY = 3 + i * 1.8;
        const y = waterLevel + 5 + i * 4 + Math.sin(t * 2.1 + i) * 1.2;
        ctx.beginPath();
        ctx.ellipse(centerX, y, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = i === 0 ? 'rgba(225, 253, 255, 0.16)' : 'rgba(155, 234, 247, 0.08)';
        ctx.lineWidth = i === 0 ? 1 : 0.8;
        ctx.stroke();
    }

    ctx.restore();
};

interface BoatMetrics {
    boatX: number;
    boatY: number;
    boatDrawW: number;
    boatDrawH: number;
    centerX: number;
    centerY: number;
    driftOffsetX: number;
    bobOffsetY: number;
    rockAngle: number;
    rodTipX: number;
    rodTipY: number;
}

const BOAT_ROD_TIP_ANCHOR = {
    x: 0.898,
    y: 0.095,
} as const;

const getBoatMetrics = (
    w: number,
    h: number,
    t: number,
    img: HTMLImageElement | null
): BoatMetrics => {
    const waterLevel = h * 0.32;
    const boatX = w * 0.04;
    const boatDrawH = Math.min(220, h * 0.3);
    const aspect = img ? img.width / img.height : 1.5;
    const boatDrawW = boatDrawH * aspect;
    const driftOffsetX = Math.sin(t * 0.75) * 1.6;
    const bobOffsetY = Math.sin(t * 1.35) * 2 + Math.cos(t * 0.72) * 0.7;
    const boatY = waterLevel - boatDrawH * 0.79 + bobOffsetY;
    const centerX = boatX + driftOffsetX + boatDrawW / 2;
    const centerY = boatY + boatDrawH / 2;
    const rockAngle = Math.sin(t * 1.5) * 0.015 + Math.cos(t * 0.9) * 0.006;

    // Tie the line to the actual rod-tip pixel on the Pepe boat sprite so it
    // leaves from the visible peak of the rod instead of a nearby estimate.
    const localRodX = boatDrawW * (BOAT_ROD_TIP_ANCHOR.x - 0.5);
    const localRodY = boatDrawH * (BOAT_ROD_TIP_ANCHOR.y - 0.5);
    const cosR = Math.cos(rockAngle);
    const sinR = Math.sin(rockAngle);

    return {
        boatX,
        boatY,
        boatDrawW,
        boatDrawH,
        centerX,
        centerY,
        driftOffsetX,
        bobOffsetY,
        rockAngle,
        rodTipX: centerX + localRodX * cosR - localRodY * sinR,
        rodTipY: centerY + localRodX * sinR + localRodY * cosR,
    };
};

interface MonadFishCanvasProps {
    onCast: () => void;
    gameState: string;
    lastResult?: GameResult | null;
    rodLevel?: number;
    assets?: MainSceneAssets | null;
}

interface BubbleInstance {
    update: (h: number, waterLevel: number) => void;
    draw: (ctx: CanvasRenderingContext2D) => void;
}

interface MeteorInstance {
    life: number;
    y: number;
    update: () => void;
    draw: (ctx: CanvasRenderingContext2D) => void;
}

interface FishInstance {
    state: 'idle' | 'chasing' | 'booked';
    fishType: number;
    x: number;
    y: number;
    update: (w: number, h: number, bobber: { x: number; y: number }, gs: string) => void;
    draw: (ctx: CanvasRenderingContext2D, imgs: (HTMLImageElement | null)[]) => void;
}

interface ParticleInstance {
    life: number;
    update: () => void;
    draw: (ctx: CanvasRenderingContext2D) => void;
}

const MonadFishCanvas: React.FC<MonadFishCanvasProps> = ({ onCast, gameState, lastResult, rodLevel = 0, assets = null }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<ParticleInstance[]>([]);
    const bubblesRef = useRef<BubbleInstance[]>([]);
    const meteorsRef = useRef<MeteorInstance[]>([]);
    const fishRef = useRef<FishInstance[]>([]);
    const bobberPosRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>();
    const pepeImgRef = useRef<HTMLImageElement | null>(null);
    const bgImgRef = useRef<HTMLImageElement | null>(null);
    const fishImgsRef = useRef<(HTMLImageElement | null)[]>(new Array(8).fill(null));
    const rodImgsRef = useRef<(HTMLImageElement | null)[]>(new Array(5).fill(null));
    const frameRef = useRef(0);

    const getCanvasSize = () => {
        const canvas = canvasRef.current;
        if (!canvas) return { w: window.innerWidth, h: window.innerHeight };

        const rect = canvas.getBoundingClientRect();
        return {
            w: Math.max(1, Math.round(rect.width || window.innerWidth)),
            h: Math.max(1, Math.round(rect.height || window.innerHeight)),
        };
    };

    // Загрузка картинок
    useEffect(() => {
        if (assets) {
            bgImgRef.current = assets.background;
            pepeImgRef.current = assets.pepe;
            fishImgsRef.current = [...assets.fish];
            rodImgsRef.current = [...assets.rods];
            return;
        }

        const loadSceneImage = (src: string, onReady: (img: HTMLImageElement) => void) => {
            const img = new Image();
            img.onload = () => onReady(img);
            img.src = src;
            if (img.complete && img.naturalWidth > 0) onReady(img);
        };

        loadSceneImage(publicAsset('assets/bg_main.jpg'), (img) => { bgImgRef.current = img; });
        loadSceneImage(publicAsset('assets/pepe_boat_v3.webp'), (img) => { pepeImgRef.current = img; });

        const fishFiles = ['fish_carp.png', 'fish_perch.png', 'fish_bream.png', 'fish_pike.png', 'fish_catfish.png', 'fish_goldfish.png', 'fish_mutant.png', 'fish_leviathan.png'];
        fishFiles.forEach((file, i) => {
            loadSceneImage(publicAsset('assets/' + file), (img) => { fishImgsRef.current[i] = img; });
        });

        const rodFiles = ['rod_basic.png', 'rod_bamboo.png', 'rod_carbon.png', 'rod_pro.png', 'rod_legendary.png'];
        rodFiles.forEach((file, i) => {
            loadSceneImage(publicAsset('assets/' + file), (img) => { rodImgsRef.current[i] = img; });
        });
    }, [assets]);

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

    class Meteor {
        x: number; y: number; vx: number; vy: number; life: number; maxLife: number; length: number;
        constructor(w: number, waterLevel: number) {
            this.x = Math.random() * w * 0.75 + w * 0.2;
            this.y = Math.random() * waterLevel * 0.35 + 10;
            this.vx = -5 - Math.random() * 3;
            this.vy = 2.2 + Math.random() * 1.4;
            this.maxLife = 62 + Math.random() * 36;
            this.life = this.maxLife;
            this.length = 90 + Math.random() * 70;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= 1;
        }
        draw(ctx: CanvasRenderingContext2D) {
            const alpha = Math.max(0, this.life / this.maxLife);
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x - this.vx * this.length * 0.08, this.y - this.vy * this.length * 0.08);
            gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
            gradient.addColorStop(0.25, `rgba(180,140,255,${alpha * 0.8})`);
            gradient.addColorStop(1, 'rgba(180,140,255,0)');
            ctx.save();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2.6;
            ctx.lineCap = 'round';
            ctx.shadowColor = 'rgba(214,185,255,0.95)';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * this.length * 0.08, this.y - this.vy * this.length * 0.08);
            ctx.stroke();
            ctx.restore();
        }
    }

    class FishEntity {
        x: number; y: number; targetX: number; targetY: number;
        speed: number; size: number; angle: number; visualAngle: number;
        state: 'idle' | 'chasing' | 'booked';
        wobble: number; fishType: number; wobbleSpeed: number;
        depthMin: number; depthMax: number; facing: 1 | -1; targetCooldown: number; turnLock: number;

        constructor(w: number, h: number, fishType: number) {
            const traits = FISH_TRAITS[fishType] || FISH_TRAITS[0];
            this.fishType = fishType;
            this.speed = traits.speed + Math.random() * 0.18;
            this.size = traits.size + Math.random() * 10;
            this.wobbleSpeed = traits.wobbleSpeed;
            this.depthMin = traits.depthMin;
            this.depthMax = traits.depthMax;
            this.x = Math.random() * w;
            this.y = h * this.depthMin + Math.random() * (h * (this.depthMax - this.depthMin));
            this.targetX = this.x; this.targetY = this.y;
            this.angle = (Math.random() - 0.5) * Math.PI * 0.25;
            this.visualAngle = this.angle;
            this.state = 'idle';
            this.wobble = Math.random() * Math.PI * 2;
            this.facing = Math.random() > 0.5 ? 1 : -1;
            this.targetCooldown = 30 + Math.random() * 90;
            this.turnLock = 0;
            this.setRandomTarget(w, h);
        }
        setRandomTarget(w: number, h: number) {
            const safeW = Math.max(120, w);
            this.targetX = 50 + Math.random() * (safeW - 100);
            this.targetY = h * this.depthMin + Math.random() * (h * (this.depthMax - this.depthMin));
            this.targetCooldown = 160 + Math.random() * 240;
        }
        update(w: number, h: number, bobber: { x: number; y: number }, gs: string) {
            this.wobble += this.wobbleSpeed;
            this.targetCooldown = Math.max(0, this.targetCooldown - 1);
            this.turnLock = Math.max(0, this.turnLock - 1);
            if (this.state === 'booked') {
                this.x += (bobber.x - this.x) * 0.15;
                this.y += (bobber.y + 12 - this.y) * 0.15;
                const hookedAngle = -Math.PI / 2 + Math.sin(this.wobble * 4) * 0.2;
                this.angle += (hookedAngle - this.angle) * 0.12;
                this.visualAngle += (this.angle - this.visualAngle) * 0.18;
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
                if (this.targetCooldown <= 0 || Math.hypot(tx - this.x, ty - this.y) < 45) this.setRandomTarget(w, h);
            }
            ty = Math.max(minY, ty);
            const ta = Math.atan2(ty - this.y, tx - this.x);
            let diff = ta - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const turnEase = this.state === 'chasing' ? 0.045 : 0.026;
            this.angle += diff * turnEase;
            this.visualAngle += (this.angle - this.visualAngle) * 0.12;

            const dx = Math.cos(this.angle);
            const dy = Math.sin(this.angle);
            if (this.turnLock <= 0 && dx > 0.28 && this.facing !== 1) {
                this.facing = 1;
                this.turnLock = 60;
            }
            if (this.turnLock <= 0 && dx < -0.28 && this.facing !== -1) {
                this.facing = -1;
                this.turnLock = 60;
            }
            this.x += dx * this.speed;
            this.y += dy * this.speed;
            if (this.y < minY) this.y = minY + 10;
            if (this.x < -50) {
                this.x = w + 50;
                this.setRandomTarget(w, h);
            }
            if (this.x > w + 50) {
                this.x = -50;
                this.setRandomTarget(w, h);
            }
        }
        draw(ctx: CanvasRenderingContext2D, imgs: (HTMLImageElement | null)[]) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.facing < 0) ctx.scale(-1, 1);
            const swimTilt = Math.max(-0.18, Math.min(0.18, Math.sin(this.visualAngle) * 0.22));
            ctx.rotate(swimTilt + Math.sin(this.wobble * 1.8) * 0.018);
            const img = imgs[this.fishType];
            if (img) {
                const aspect = img.width / img.height;
                const dw = this.size * 2, dh = dw / aspect;
                drawAnimatedSprite(ctx, img, dw, dh, this.wobble, this.state === 'chasing' ? 1.35 : 1);
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

        const initialSize = getCanvasSize();
        const initialDpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(initialSize.w * initialDpr);
        canvas.height = Math.round(initialSize.h * initialDpr);
        ctx.setTransform(initialDpr, 0, 0, initialDpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (fishRef.current.length === 0) {
            for (let i = 0; i < 8; i++) fishRef.current.push(new FishEntity(initialSize.w, initialSize.h, i));
        }
        if (bubblesRef.current.length === 0) {
            for (let i = 0; i < 20; i++) bubblesRef.current.push(new Bubble(initialSize.w, initialSize.h));
        }

        const render = () => {
            const { w, h } = getCanvasSize();
            ctx.clearRect(0, 0, w, h);
            frameRef.current++;
            const t = Date.now() * 0.001;
            const waterLevel = h * 0.32;

            // === ФОН (Заменяем небо и воду) ===
            if (bgImgRef.current) {
                const img = bgImgRef.current;
                const aspect = img.width / img.height;
                const canvasAspect = w / h;
                
                let drawW = w;
                let drawH = h;
                let offsetX = 0;
                let offsetY = 0;
                
                if (canvasAspect > aspect) {
                    drawH = w / aspect;
                    offsetY = 0;
                } else {
                    drawW = h * aspect;
                    offsetX = w - drawW;
                }
                
                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            } else {
                ctx.fillStyle = '#0a0a2e';
                ctx.fillRect(0, 0, w, h);
            }

            const moonX = w * 0.82;
            const moonY = h * 0.11;
            const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, Math.min(w, h) * 0.12);
            moonGlow.addColorStop(0, 'rgba(255, 245, 214, 0.16)');
            moonGlow.addColorStop(0.38, 'rgba(255, 240, 188, 0.11)');
            moonGlow.addColorStop(1, 'rgba(255, 240, 188, 0)');
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(moonX, moonY, Math.min(w, h) * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            drawWaterSurface(ctx, w, h, waterLevel, t);

            if (Math.random() < 0.008 && meteorsRef.current.length < 4) {
                meteorsRef.current.push(new Meteor(w, waterLevel));
            }
            meteorsRef.current = meteorsRef.current.filter(meteor => meteor.life > 0 && meteor.y < waterLevel);
            meteorsRef.current.forEach(meteor => { meteor.update(); meteor.draw(ctx); });

            // === ПЕПЕ В ЛОДКЕ ===
            const pepe = pepeImgRef.current;
            const boatMetrics = getBoatMetrics(w, h, t, pepe);
            const rodTipX = boatMetrics.rodTipX;
            const rodTipY = boatMetrics.rodTipY;

            if (pepe) {
                drawBoatReflection(
                    ctx,
                    pepe,
                    boatMetrics.boatX + boatMetrics.driftOffsetX,
                    boatMetrics.boatY,
                    boatMetrics.boatDrawW,
                    boatMetrics.boatDrawH,
                    waterLevel,
                    t
                );
                drawBoatWake(ctx, boatMetrics.centerX, waterLevel, boatMetrics.boatDrawW, t);

                // Кончик удочки — вычисляем с учётом поворота лодки
                ctx.save();
                ctx.translate(boatMetrics.centerX, boatMetrics.centerY);
                ctx.rotate(boatMetrics.rockAngle);
                if (gameState === 'biting' || gameState === 'catching' || gameState === 'result') {
                    ctx.rotate(-0.06 + Math.sin(t * 8) * 0.03);
                }
                // Тень лодки
                ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.ellipse(0, boatMetrics.boatDrawH * 0.35, boatMetrics.boatDrawW * 0.45, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();

                ctx.drawImage(
                    pepe,
                    -boatMetrics.boatDrawW / 2,
                    -boatMetrics.boatDrawH / 2,
                    boatMetrics.boatDrawW,
                    boatMetrics.boatDrawH
                );
                ctx.restore();
                drawBoatWaterlineOverlay(
                    ctx,
                    boatMetrics.boatX + boatMetrics.driftOffsetX,
                    boatMetrics.boatY,
                    boatMetrics.boatDrawW,
                    boatMetrics.boatDrawH,
                    waterLevel,
                    t
                );
            } else {
                // Фоллбек лодка
                const boatX = w * 0.04;
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
                const bookedFish = fishRef.current.find((f) => f.state === 'booked');
                if (bookedFish && fishImgsRef.current[bookedFish.fishType]) {
                    const fImg = fishImgsRef.current[bookedFish.fishType]!;
                    const fA = fImg.width / fImg.height;
                    const fW = 60, fH = fW / fA;
                    ctx.save();
                    ctx.translate(bx, hookY + 10);
                    ctx.rotate(Math.sin(t * 3) * 0.2);
                    drawAnimatedSprite(ctx, fImg, fW, fH, t * 2.2, 1.4);
                    ctx.restore();
                }
            }

            // === ПУЗЫРЬКИ ===
            bubblesRef.current.forEach(b => { b.update(h, waterLevel); b.draw(ctx); });

            // === РЫБЫ ===
            // При catching — цепляем рыбу правильного типа
            if ((gameState === 'biting' || gameState === 'catching') && lastResult?.success && lastResult.fish) {
                const targetType = FISH_SPRITE_MAP[lastResult.fish.id] ?? 0;
                const alreadyBooked = fishRef.current.some((f) => f.state === 'booked');
                if (!alreadyBooked) {
                    // Ищем ближайшую рыбу нужного типа
                    let best: FishInstance | null = null;
                    let bestDist = Infinity;
                    fishRef.current.forEach((f) => {
                        if (f.fishType === targetType && f.state !== 'booked') {
                            const d = Math.hypot(f.x - bobberPosRef.current.x, f.y - bobberPosRef.current.y);
                            if (d < bestDist) { bestDist = d; best = f; }
                        }
                    });
                    // Если нет нужного типа — берём любую и меняем тип
                    if (!best) {
                        let anyBest: FishInstance | null = null;
                        let anyDist = Infinity;
                        fishRef.current.forEach((f) => {
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

            fishRef.current.forEach((f) => {
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
                    `booked fish: ${fishRef.current.filter((f) => f.state === 'booked').length}`,
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

        const handleResize = () => {
            const { w, h } = getCanvasSize();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const nextWidth = Math.round(w * dpr);
            const nextHeight = Math.round(h * dpr);

            if (canvas.width !== nextWidth) canvas.width = nextWidth;
            if (canvas.height !== nextHeight) canvas.height = nextHeight;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        };
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvas);
        handleResize();
        render();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [gameState]);

    // === ФИЗИКА ЗАБРОСА ===
    useEffect(() => {
        if (gameState === 'casting') {
            const { w, h } = getCanvasSize();
            const wl = h * 0.32;
            const pepe = pepeImgRef.current;
            const castPhase = Date.now() * 0.001;
            const boatMetrics = getBoatMetrics(w, h, castPhase, pepe);
            // Стартовая позиция = кончик удочки (пропорции из анализа спрайта)
            const startX = boatMetrics.rodTipX;
            const startY = boatMetrics.rodTipY;
            const targetX = w * 0.5 + Math.random() * (w * 0.3);
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

    return (
        <canvas
            ref={canvasRef}
            className="absolute left-0 top-0 h-full w-full"
        />
    );
};

export default MonadFishCanvas;
