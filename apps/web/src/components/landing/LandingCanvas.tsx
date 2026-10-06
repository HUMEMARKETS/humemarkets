'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Theme } from '@/lib/theme';
import { THEME_GROUND, THEME_MUTED, THEME_TEXT } from '@/lib/theme-colors';
import { buildGround, buildPath, buildStations, type Palette } from './scenes';

/// What the landing stage drives each frame: the scroll position as a fractional section index, already
/// damped, so the camera, the rail and the copy share one value.
export interface World {
    frame(progress: number, dt: number): void;
}

interface Props {
    world: MutableRefObject<World | null>;
    theme: Theme;
    /// Ticks on the markets globe: one per market on the registry.
    markets: number;
    /// One block per contract in the deployment; `false` is a contract with no address here.
    deployed: readonly boolean[];
    onFailed: () => void;
}

function readColor(name: string, fallback: string, into: THREE.Color) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    into.set(value || fallback);
}

const smooth = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
};

/// The one WebGL canvas behind the landing page. Every section's station lives in one world and the
/// camera travels a path through them, so moving between sections is a journey, never a cut. The
/// canvas never remounts while the page scrolls; a theme change recolours it in place.
export function LandingCanvas({ world, theme, markets, deployed, onFailed }: Props) {
    const host = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const api = useRef<{ recolor(): void; setMarkets(count: number): void } | null>(null);
    const failed = useRef(onFailed);
    failed.current = onFailed;
    const blocks = useRef(deployed);

    useEffect(() => {
        const hostEl = host.current;
        const canvasEl = canvas.current;
        if (!hostEl || !canvasEl) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: canvasEl,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
            });
        } catch {
            failed.current();
            return;
        }
        renderer.setClearColor(0x000000, 0);

        const palette: Palette = { text: new THREE.Color(), muted: new THREE.Color() };
        const ground = new THREE.Color();
        const readPalette = () => {
            readColor('--color-text', THEME_TEXT, palette.text);
            readColor('--color-muted', THEME_MUTED, palette.muted);
            readColor('--color-ground', THEME_GROUND, ground);
        };
        readPalette();

        const scene = new THREE.Scene();
        const fog = new THREE.Fog(ground, 12, 30);
        scene.fog = fog;
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

        // A phone draws about half the segments.
        const detail = hostEl.clientWidth < 768 ? 0.5 : 1;
        const { stations, setMarketCount } = buildStations(palette, detail, blocks.current);
        for (const station of stations) scene.add(station.group);
        const floor = buildGround(palette);
        scene.add(floor.object);
        const path = buildPath(stations.length);
        const eye = new THREE.Vector3();
        const look = new THREE.Vector3();

        api.current = {
            recolor() {
                readPalette();
                fog.color.copy(ground);
                for (const station of stations) station.recolor();
                floor.recolor();
            },
            setMarkets: setMarketCount,
        };

        function resize() {
            const width = hostEl!.clientWidth;
            const height = hostEl!.clientHeight;
            if (width === 0 || height === 0) return;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2));
            renderer.setSize(width, height, false);
            const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
            floor.setSize(buffer.x, buffer.y);
            const wide = width / height >= 1.1;
            camera.aspect = width / height;
            camera.fov = wide ? 38 : 52;
            // Wide: the station sits right of the copy column. Phone: in the top third, above the copy.
            camera.setViewOffset(width, height, wide ? -width * 0.24 : 0, wide ? 0 : height * 0.17, width, height);
        }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(hostEl);

        let time = 0;
        world.current = {
            frame(progress, dt) {
                const t = THREE.MathUtils.clamp(progress / (stations.length - 1), 0, 1);
                path.eye.getPoint(t, eye);
                path.look.getPoint(t, look);
                camera.position.copy(eye);
                camera.lookAt(look);
                floor.follow(eye);
                time += dt;
                stations.forEach((station, index) => {
                    // Neighbouring stations blend across the whole distance between them, never at a threshold.
                    const fade = smooth(1 - Math.abs(index - progress) * 0.8);
                    station.group.visible = fade > 0.01;
                    if (!station.group.visible) return;
                    station.setFade(fade);
                    station.group.rotation.y += station.spin * dt;
                    station.idle(time);
                });
                renderer.render(scene, camera);
            },
        };

        return () => {
            world.current = null;
            api.current = null;
            observer.disconnect();
            for (const station of stations) station.dispose();
            floor.dispose();
            renderer.dispose();
        };
    }, [world]);

    useEffect(() => {
        api.current?.recolor();
    }, [theme]);

    useEffect(() => {
        api.current?.setMarkets(markets);
    }, [markets]);

    return (
        <div ref={host} aria-hidden="true" className="absolute inset-0 overflow-hidden">
            <canvas ref={canvas} className="absolute inset-0 size-full opacity-70 md:opacity-100" />
        </div>
    );
}
