'use client';

import type { MarketConfig } from '@hume/types';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { dampFactor } from '@/lib/landingScroll';
import type { Theme } from '@/lib/theme';
import { THEME_GROUND, THEME_MUTED, THEME_TEXT } from '@/lib/theme-colors';
import { buildGround, buildPath, buildStations, type Palette, type Pointer } from './scenes';

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

const smooth = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
};

/// Where the light stands relative to the point the camera looks at, so every station is lit alike.
const SUN = new THREE.Vector3(6, 10, 8);
/// How far the eye moves with the pointer at the screen's edge, in world units: about 3° at the stand-off.
const PARALLAX = { x: 0.6, y: 0.4 };

/// The one WebGL canvas behind the landing page: lit solid stations (after robinid.vercel.app) in one world,
/// with a camera that travels a path through them, so moving between sections is a journey, never a cut. Each station's
/// voxels assemble the first time it comes into view. The canvas never remounts while the page scrolls; a
/// theme change recolours it in place. A fine pointer moves the eye a few degrees and every station reacts
/// to it; a touch screen keeps the idle motion only. With reduced motion this canvas is not mounted at all.
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
        const fog = new THREE.Fog(ground, 12, 30);
        scene.fog = fog;
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
        scene.add(new THREE.AmbientLight(undefined, 1.5));
        const sun = new THREE.DirectionalLight(undefined, 2.2);
        scene.add(sun, sun.target);

        // A phone draws about half the instances.
        const detail = hostEl.clientWidth < 768 ? 0.6 : 1;
        const { stations, captions, setMarkets } = buildStations(palette, detail, blocks.current);
        for (const station of stations) scene.add(station.group);
        const floor = buildGround(palette);
        scene.add(floor.object);
        const path = buildPath(stations.length);
        const eye = new THREE.Vector3();
        const look = new THREE.Vector3();

        // One pointer for the whole world: `target` is set by the event, `pointer` eases after it each frame.
        // A hit test runs on the frame after a move, once, on the active station only.
        const target = { x: 0, y: 0, hover: 0 };
        const pointer: Pointer = { x: 0, y: 0, hover: 0, world: new THREE.Vector3(), view: new THREE.Vector3() };
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const plane = new THREE.Plane();
        const normal = new THREE.Vector3();
        const centre = new THREE.Vector3();
        let bounds = hostEl.getBoundingClientRect();
        let moved = false;
        let active = 0;
        const onMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            target.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
            target.y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
            target.hover = 1;
            moved = true;
        };
        const onOut = (event: PointerEvent) => {
            if (event.relatedTarget) return;
            target.x = target.y = target.hover = 0;
            moved = true;
        };
        const onClick = () => stations[active]?.poke?.(performance.now() / 1000);
        const fine = window.matchMedia('(pointer: fine)').matches;
        if (fine) {
            window.addEventListener('pointermove', onMove, { passive: true });
            document.addEventListener('pointerout', onOut, { passive: true });
        }
        window.addEventListener('click', onClick, { passive: true });

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
            bounds = hostEl!.getBoundingClientRect();
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.4 : 1.75));
            renderer.setSize(width, height, false);
            const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
            floor.setSize(buffer.x, buffer.y);
            // Landscape, as CSS `orientation` sees it, so the camera and the copy agree on the layout.
            const wide = width > height;
            camera.aspect = width / height;
            camera.fov = wide ? 38 : 52;
            // Landscape: the station sits right of the copy column; from a 1024 px tablet to a 1440 px desktop it
            // grows and moves in from the right edge, so it never covers the copy. Portrait: in the top of the
            // screen, above the copy, and smaller on a tablet, where the copy column is wider.
            const grow = THREE.MathUtils.clamp((width - 1024) / 416, 0, 1);
            const tablet = width >= 768;
            camera.zoom = wide ? 0.5 + 0.5 * grow : tablet ? 0.62 : 1;
            camera.setViewOffset(
                width,
                height,
                wide ? -width * (0.37 - 0.13 * grow) : 0,
                wide ? 0 : height * (tablet ? 0.27 : 0.17),
                width,
                height,
            );
            // Captions need room: a landscape screen wide enough that the drawing keeps most of its size. On
            // a short or narrow one they grow with the square root of what the drawing shrank, to stay legible.
            // ponytail: hidden on phones and tablets; a smaller caption per layout if they need them.
            const boost = THREE.MathUtils.clamp(1 / Math.sqrt(camera.zoom * Math.min(1, height / 900)), 1, 1.4);
            for (const caption of captions) {
                caption.visible = wide && camera.zoom >= 0.8;
                caption.scale.copy(caption.userData.base).multiplyScalar(boost);
            }
        }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(hostEl);

        let time = 0;
        const begun = stations.map(() => false);
        const sizes = stations.map((station) => station.group.scale.x);
        world.current = {
            frame(progress, dt) {
                time += dt;
                const now = performance.now() / 1000;
                const t = THREE.MathUtils.clamp(progress / (stations.length - 1), 0, 1);
                path.eye.getPoint(t, eye);
                path.look.getPoint(t, look);
                const k = dampFactor(dt);
                pointer.x += (target.x - pointer.x) * k;
                pointer.y += (target.y - pointer.y) * k;
                pointer.hover += (target.hover - pointer.hover) * k;
                camera.position.copy(eye);
                camera.position.x += pointer.x * PARALLAX.x;
                camera.position.y += pointer.y * PARALLAX.y;
                camera.lookAt(look);
                camera.updateMatrixWorld();

                const current = THREE.MathUtils.clamp(Math.round(progress), 0, stations.length - 1);
                if (current !== active) {
                    stations[active]?.pick?.(null);
                    active = current;
                    moved = true;
                }
                if (moved) {
                    moved = false;
                    raycaster.setFromCamera(ndc.set(target.x, target.y), camera);
                    stations[active]?.pick?.(target.hover > 0 ? raycaster : null);
                }
                // The eased pointer on the plane through the active station, facing the camera.
                raycaster.setFromCamera(ndc.set(pointer.x, pointer.y), camera);
                camera.getWorldDirection(normal);
                stations[active]!.group.getWorldPosition(centre);
                plane.setFromNormalAndCoplanarPoint(normal, centre);
                if (!raycaster.ray.intersectPlane(plane, pointer.world)) pointer.world.copy(centre);
                pointer.view.copy(pointer.world).applyMatrix4(camera.matrixWorldInverse);
                sun.position.copy(look).add(SUN);
                sun.target.position.copy(look);
                floor.follow(eye);
                stations.forEach((station, index) => {
                    // Neighbouring stations blend across the whole distance between them, never at a threshold.
                    const fade = smooth(1 - Math.abs(index - progress) * 0.8);
                    station.group.visible = fade > 0.01;
                    if (!station.group.visible) return;
                    station.setFade(fade);
                    station.group.scale.setScalar((sizes[index] ?? 1) * (0.86 + 0.14 * fade));
                    if (!begun[index]) {
                        begun[index] = true;
                        station.begin(now);
                    }
                    station.update(time, now, pointer, fade);
                });
                renderer.render(scene, camera);
            },
        };

        return () => {
            world.current = null;
            api.current = null;
            observer.disconnect();
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerout', onOut);
            window.removeEventListener('click', onClick);
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
