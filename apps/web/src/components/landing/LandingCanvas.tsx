'use client';

import { cn } from '@hume/ui';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import {
    THEME_GROUND,
    THEME_ACCENT,
    THEME_MUTED,
    THEME_TEXT,
} from '@/lib/theme-colors';
import { SPACED_CAPS } from '@/lib/frame';
import { buildFloor, buildScenes, type Palette } from './scenes';

interface Props {
    /// The scroll position in sections, fractional: 1.5 is halfway between section 1 and 2.
    progress: MutableRefObject<number>;
    active: number;
    tab: number;
    hover: number | null;
    motion: boolean;
    hotspotLabels: string[];
    pointerTarget: HTMLElement | null;
    onHover: (tab: number | null) => void;
    onSelect: (tab: number) => void;
    onFailed: () => void;
}

const FOV = 38;
const DISTANCE = 8.4;

function cssColor(name: string, fallback: string): THREE.Color {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return new THREE.Color(value || fallback);
}

const smooth = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
};

/// The one WebGL canvas behind the landing page. Every section's scene lives in it; scrolling
/// crossfades between them and the pointer tilts and turns the active one. The hotspots are DOM
/// buttons that follow their anchors, so they stay focusable and readable.
export function LandingCanvas(props: Props) {
    const live = useRef(props);
    live.current = props;
    const host = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const hotspotEls = useRef<(HTMLDivElement | null)[]>([]);
    const { pointerTarget } = props;

    useEffect(() => {
        const hostEl = host.current;
        const canvasEl = canvas.current;
        if (!hostEl || !canvasEl || !pointerTarget) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: canvasEl,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
            });
        } catch {
            live.current.onFailed();
            return;
        }
        renderer.setClearColor(0x000000, 0);

        const palette: Palette = {
            text: cssColor('--color-text', THEME_TEXT),
            muted: cssColor('--color-muted', THEME_MUTED),
            accent: cssColor('--color-accent-hover', THEME_ACCENT),
        };
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(cssColor('--color-ground', THEME_GROUND), 7, 17);
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
        camera.position.set(0, 1.7, DISTANCE);
        camera.lookAt(0, -0.15, 0);

        const rig = new THREE.Group();
        scene.add(rig);
        const floor = buildFloor(palette);
        rig.add(floor.group);
        const scenes = buildScenes(palette);
        for (const item of scenes) rig.add(item.group);

        const size = { width: 1, height: 1 };
        function resize() {
            const width = hostEl!.clientWidth;
            const height = hostEl!.clientHeight;
            if (width === 0 || height === 0) return;
            size.width = width;
            size.height = height;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            const wide = camera.aspect >= 1.1;
            const halfWidth =
                Math.tan((FOV / 2) * (Math.PI / 180)) * DISTANCE * camera.aspect;
            rig.position.set(wide ? halfWidth * 0.46 : 0, wide ? 0.05 : -1.3, 0);
            rig.scale.setScalar(wide ? Math.min(1, camera.aspect / 1.7 + 0.35) : 0.6);
        }
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(hostEl);

        const pointer = { x: 0, y: 0, tx: 0, ty: 0, inside: false, dirty: false };
        const ndc = new THREE.Vector2();
        const drag = { active: false, lastX: 0, moved: 0, yaw: 0, velocity: 0 };
        let rayTab: number | null = null;
        const raycaster = new THREE.Raycaster();
        raycaster.params.Line = { threshold: 0.1 };
        const projected = new THREE.Vector3();

        const overUi = (event: Event) =>
            event.target instanceof Element &&
            event.target.closest('[data-ui]') !== null;

        function onMove(event: PointerEvent) {
            if (event.pointerType !== 'mouse') return;
            const rect = hostEl!.getBoundingClientRect();
            pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.ty = ((event.clientY - rect.top) / rect.height) * 2 - 1;
            ndc.set(pointer.tx, -pointer.ty);
            pointer.inside = !overUi(event);
            pointer.dirty = true;
            if (drag.active) {
                const delta = event.clientX - drag.lastX;
                drag.lastX = event.clientX;
                drag.moved += Math.abs(delta);
                drag.yaw += delta * 0.008;
                drag.velocity = delta * 0.008 * 60;
            }
        }
        function onDown(event: PointerEvent) {
            if (event.pointerType !== 'mouse' || overUi(event)) return;
            drag.active = true;
            drag.lastX = event.clientX;
            drag.moved = 0;
        }
        function onUp() {
            if (!drag.active) return;
            drag.active = false;
            if (drag.moved < 4 && rayTab !== null) live.current.onSelect(rayTab);
        }
        function onLeave() {
            pointer.inside = false;
            pointer.tx = 0;
            pointer.ty = 0;
            if (rayTab !== null) {
                rayTab = null;
                live.current.onHover(null);
            }
        }
        pointerTarget.addEventListener('pointermove', onMove);
        pointerTarget.addEventListener('pointerdown', onDown);
        pointerTarget.addEventListener('pointerleave', onLeave);
        window.addEventListener('pointerup', onUp);

        const spinAngles: number[] = scenes.map(() => 0);
        let motionFactor = 0;
        let animTime = 0;
        const clock = new THREE.Clock();
        let frameId = 0;
        function frame() {
            frameId = requestAnimationFrame(frame);
            const dt = Math.min(clock.getDelta(), 0.05);
            const state = live.current;
            // Motion eases to a stop while something is hovered, so a hotspot holds still under the pointer.
            const motionTarget = state.motion && state.hover === null && !drag.active ? 1 : 0;
            motionFactor += (motionTarget - motionFactor) * Math.min(1, dt * 5);
            animTime += dt * motionFactor;
            const time = animTime;
            const motion = 1;
            const progress = state.progress.current;
            const activeIndex = Math.max(
                0,
                Math.min(scenes.length - 1, Math.round(progress)),
            );

            const ease = Math.min(1, dt * 4);
            pointer.x += (pointer.tx - pointer.x) * ease;
            pointer.y += (pointer.ty - pointer.y) * ease;
            if (!drag.active) {
                drag.yaw += drag.velocity * dt;
                drag.velocity *= Math.pow(0.04, dt);
            }
            rig.rotation.y = pointer.x * 0.22;
            rig.rotation.x = pointer.y * 0.07;
            floor.update(time, motion);

            if (pointer.dirty && pointer.inside && !drag.active) {
                pointer.dirty = false;
                const target = scenes[activeIndex];
                let next: number | null = null;
                if (target && target.pickables.length > 0) {
                    raycaster.setFromCamera(ndc, camera);
                    const hit = raycaster.intersectObjects(target.pickables, false)[0];
                    const tab = hit?.object.userData.tab;
                    next = typeof tab === 'number' ? tab : null;
                }
                if (next !== rayTab) {
                    rayTab = next;
                    state.onHover(next);
                }
            } else if (!pointer.inside && rayTab !== null) {
                rayTab = null;
                state.onHover(null);
            }

            scenes.forEach((item, index) => {
                const distance = index - progress;
                const fade = smooth(1 - Math.abs(distance) * 1.3);
                item.group.visible = fade > 0.01;
                if (!item.group.visible) return;
                item.group.position.set(distance * 1.8, 0, -Math.abs(distance) * 1.2);
                spinAngles[index] =
                    (spinAngles[index] ?? 0) +
                    item.spin * motionFactor * dt * (index === activeIndex ? 1 : 0.4);
                item.idle(time, motion);
                item.group.rotation.y =
                    (spinAngles[index] ?? 0) + drag.yaw + distance * 0.8;
                item.group.scale.setScalar(item.size * (0.86 + 0.14 * fade));
                const current = index === activeIndex;
                item.look(
                    fade,
                    current ? state.tab : -1,
                    current ? state.hover : null,
                );
            });

            const currentScene = scenes[activeIndex];
            const fadeActive = smooth(1 - Math.abs(activeIndex - progress) * 1.3);
            for (let tab = 0; tab < 3; tab += 1) {
                const element = hotspotEls.current[tab];
                if (!element) continue;
                const anchor = currentScene?.anchors[tab];
                if (!anchor) {
                    element.style.opacity = '0';
                    continue;
                }
                anchor.getWorldPosition(projected);
                projected.project(camera);
                const x = (projected.x * 0.5 + 0.5) * size.width;
                const y = (-projected.y * 0.5 + 0.5) * size.height;
                element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
                element.style.opacity = fadeActive.toFixed(2);
                element.dataset.flip = String(x > size.width - 190);
                element.style.pointerEvents = fadeActive > 0.7 ? 'auto' : 'none';
            }

            renderer.render(scene, camera);
        }
        frame();

        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
            pointerTarget.removeEventListener('pointermove', onMove);
            pointerTarget.removeEventListener('pointerdown', onDown);
            pointerTarget.removeEventListener('pointerleave', onLeave);
            window.removeEventListener('pointerup', onUp);
            for (const item of scenes) item.dispose();
            floor.dispose();
            renderer.dispose();
        };
    }, [pointerTarget]);

    return (
        <div ref={host} className="absolute inset-0 overflow-hidden">
            <canvas
                ref={canvas}
                aria-hidden="true"
                className="absolute inset-0 size-full opacity-40 md:opacity-100"
            />
            <div className="pointer-events-none absolute inset-0 z-20 hidden md:block">
                {[0, 1, 2].map((tab) => {
                    const label = props.hotspotLabels[tab];
                    if (!label) return null;
                    const selected = props.tab === tab;
                    return (
                        <div
                            key={tab}
                            ref={(element) => {
                                hotspotEls.current[tab] = element;
                            }}
                            className="group/spot absolute left-0 top-0 opacity-0"
                            data-ui
                        >
                            <button
                                type="button"
                                aria-pressed={selected}
                                aria-label={label}
                                onPointerEnter={() => props.onHover(tab)}
                                onPointerLeave={() => props.onHover(null)}
                                onFocus={() => props.onHover(tab)}
                                onBlur={() => props.onHover(null)}
                                onClick={() => props.onSelect(tab)}
                                className={cn(
                                    'group -ml-4 -mt-4 flex items-center gap-3 rounded-pill transition-colors duration-150 group-data-[flip=true]/spot:translate-x-[calc(-100%+2rem)] group-data-[flip=true]/spot:flex-row-reverse',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-pill border text-base leading-none transition-colors duration-150',
                                        selected
                                            ? 'border-text bg-text text-ground'
                                            : 'border-text/40 bg-ground/70 text-text group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink',
                                    )}
                                >
                                    +
                                </span>
                                <span
                                    className={cn(
                                        SPACED_CAPS,
                                        'rounded-sharp bg-ground/80 px-2 py-1 text-[10px] tracking-[0.2em]',
                                        selected ? 'text-text' : 'text-muted',
                                    )}
                                >
                                    {label}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
