'use client';

import type { MarketConfig } from '@hume/types';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Theme } from '@/lib/theme';
import { THEME_GROUND, THEME_MUTED, THEME_TEXT } from '@/lib/theme-colors';
import { buildGround, buildStations, cameraAt, type Palette } from './scenes';

/// What the landing stage drives each frame: the scroll position as a fractional section index, already
/// damped, so the camera, the rail and the copy share one value.
export interface World {
    frame(progress: number, dt: number): void;
}

interface Props {
    world: MutableRefObject<World | null>;
    theme: Theme;
    /// The registry's markets: labels around the hero and pillars on the globe.
    markets: readonly MarketConfig[];
    /// One block per contract in the deployment; `false` is a contract with no address here.
    deployed: readonly boolean[];
    onFailed: () => void;
}

function readColor(name: string, fallback: string, into: THREE.Color) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    into.set(value || fallback);
}

/// Where the light stands relative to the point the camera looks at, so every station is lit alike.
const SUN = new THREE.Vector3(6, 10, 8);

/// The one WebGL canvas behind the landing page, after robinid.vercel.app: lit solid stations in one world,
/// a camera that rests on each and arcs between them, and a light parallax on the pointer. Each station's
/// voxels assemble the first time it comes into view. The canvas never remounts while the page scrolls; a
/// theme change recolours it in place.
export function LandingCanvas({ world, theme, markets, deployed, onFailed }: Props) {
    const host = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const api = useRef<{ recolor(): void; setMarkets(list: readonly MarketConfig[]): void } | null>(null);
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
        const fog = new THREE.Fog(ground, 16, 46);
        scene.fog = fog;
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
        scene.add(new THREE.AmbientLight(undefined, 1.5));
        const sun = new THREE.DirectionalLight(undefined, 2.2);
        scene.add(sun, sun.target);

        // A phone draws about half the instances.
        const detail = hostEl.clientWidth < 768 ? 0.6 : 1;
        const { stations, setMarkets } = buildStations(palette, detail, blocks.current);
        for (const station of stations) scene.add(station.group);
        const floor = buildGround(palette);
        scene.add(floor.object);
        const eye = new THREE.Vector3();
        const look = new THREE.Vector3();

        api.current = {
            recolor() {
                readPalette();
                fog.color.copy(ground);
                for (const station of stations) station.recolor();
                floor.recolor();
            },
            setMarkets,
        };

        function resize() {
            const width = hostEl!.clientWidth;
            const height = hostEl!.clientHeight;
            if (width === 0 || height === 0) return;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.4 : 1.75));
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

        // A light parallax on the mouse, eased. Touch does not move the camera.
        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        const onPointer = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse') return;
            pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
            pointer.ty = -(event.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('pointermove', onPointer, { passive: true });

        let time = 0;
        const begun = stations.map(() => false);
        world.current = {
            frame(progress, dt) {
                time += dt;
                const now = performance.now() / 1000;
                const ease = 1 - Math.pow(1 - 0.06, dt * 60);
                pointer.x += (pointer.tx - pointer.x) * ease;
                pointer.y += (pointer.ty - pointer.y) * ease;
                cameraAt(progress, eye, look);
                camera.position.copy(eye);
                camera.position.x += 0.9 * pointer.x;
                camera.position.y += 0.55 * pointer.y + 0.08 * Math.sin(0.4 * time);
                camera.lookAt(look);
                sun.position.copy(look).add(SUN);
                sun.target.position.copy(look);
                floor.follow(eye);
                stations.forEach((station, index) => {
                    // Only the stations beside the camera are drawn; the fog hides the rest.
                    station.group.visible = Math.abs(progress - index) < 1.05;
                    if (!station.group.visible) return;
                    if (!begun[index]) {
                        begun[index] = true;
                        station.begin(now);
                    }
                    station.update(time, now);
                });
                renderer.render(scene, camera);
            },
        };

        return () => {
            world.current = null;
            api.current = null;
            observer.disconnect();
            window.removeEventListener('pointermove', onPointer);
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
            <canvas ref={canvas} className="absolute inset-0 size-full opacity-80 md:opacity-100" />
        </div>
    );
}
