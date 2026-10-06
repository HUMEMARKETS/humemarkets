import * as THREE from 'three';

/// The building blocks of the landing world, after robinid.vercel.app: lit solid voxels drawn as one
/// instanced mesh each, thin orbit rings, round particles and mono-type label pills. Every colour is a
/// page token read at runtime, so nothing here holds a colour literal and the world follows the theme.

export interface Palette {
    text: THREE.Color;
    muted: THREE.Color;
}

export type Tone = keyof Palette;

/// Seconds one voxel takes to fly in, and how far out it starts, as a share of its distance from the centre.
const ASSEMBLE = 0.55;
const SPREAD = 0.8;

export interface VoxelSpec {
    x: number;
    y: number;
    z: number;
    tone: Tone;
    /// Seconds after the station starts assembling.
    delay: number;
    sx?: number;
    sy?: number;
    sz?: number;
    q?: THREE.Quaternion;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const NO_TURN = new THREE.Quaternion();

/// Voxels in one draw call. They converge on their places with a staggered ease-out the first time the
/// station is seen, then stay still unless `live` is set (a station that animates them every frame).
export function voxelField(
    specs: VoxelSpec[],
    palette: Palette,
    { size = 0.1, live = false, geometry }: { size?: number; live?: boolean; geometry?: THREE.BufferGeometry } = {},
) {
    geometry ??= new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, specs.length));
    mesh.count = specs.length;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const dummy = new THREE.Object3D();
    let started = -1;
    let settled = false;

    const paint = () => {
        specs.forEach((spec, index) => mesh.setColorAt(index, palette[spec.tone]));
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    paint();

    function write(now: number) {
        let moving = false;
        specs.forEach((spec, index) => {
            const progress = started < 0 ? 0 : clamp01((now - started - spec.delay) / ASSEMBLE);
            if (progress < 1) moving = true;
            const eased = 1 - (1 - progress) ** 3;
            const out = 1 + (1 - eased) * SPREAD;
            dummy.position.set(spec.x * out, spec.y * out, spec.z * out + (1 - eased) * 1.6);
            dummy.quaternion.copy(spec.q ?? NO_TURN);
            const grow = Math.max(1e-4, eased * size);
            dummy.scale.set(grow * (spec.sx ?? 1), grow * (spec.sy ?? 1), grow * (spec.sz ?? 1));
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        settled = !moving;
    }
    write(0);

    return {
        mesh,
        specs,
        begin(now: number) {
            if (started < 0) started = now;
        },
        /// Updates the matrices while voxels are still arriving, or every frame for a live field.
        tick(now: number) {
            if (started < 0 || (settled && !live)) return;
            write(now);
        },
        /// Paints one voxel in a tone without touching the rest, for a scan that walks the field.
        tint(index: number, tone: Tone) {
            mesh.setColorAt(index, palette[tone]);
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        },
        recolor: paint,
        dispose() {
            geometry!.dispose();
            material.dispose();
            mesh.dispose();
        },
    };
}

/// A solid mesh in one tone, for single objects (a gauge needle, the leader node).
export function solid(geometry: THREE.BufferGeometry, palette: Palette, tone: Tone) {
    const material = new THREE.MeshStandardMaterial({ color: palette[tone], roughness: 0.5, metalness: 0.08 });
    const mesh = new THREE.Mesh(geometry, material);
    return {
        mesh,
        recolor() {
            material.color.copy(palette[tone]);
        },
        dispose() {
            geometry.dispose();
            material.dispose();
        },
    };
}

/// Thin rings and line work: unlit, in a tone at an opacity.
export function lineMaterial(palette: Palette, tone: Tone, opacity: number) {
    const material = new THREE.MeshBasicMaterial({ color: palette[tone], transparent: true, opacity, depthWrite: false });
    return {
        material,
        recolor() {
            material.color.copy(palette[tone]);
        },
    };
}

export function orbitRing(radius: number, palette: Palette, tone: Tone = 'muted', opacity = 0.45) {
    const geometry = new THREE.TorusGeometry(radius, 0.012, 4, 160);
    const paint = lineMaterial(palette, tone, opacity);
    const mesh = new THREE.Mesh(geometry, paint.material);
    return {
        mesh,
        recolor: paint.recolor,
        dispose() {
            geometry.dispose();
            paint.material.dispose();
        },
    };
}

/// Line segments in a tone. `positions` can be rewritten in place and `commit`ted, for edges that follow
/// moving nodes.
export function segments(points: number[], palette: Palette, tone: Tone, opacity: number) {
    const positions = new Float32Array(points);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: palette[tone], transparent: true, opacity, depthWrite: false });
    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;
    return {
        lines,
        positions,
        commit() {
            geometry.attributes.position!.needsUpdate = true;
        },
        recolor() {
            material.color.copy(palette[tone]);
        },
        dispose() {
            geometry.dispose();
            material.dispose();
        },
    };
}

let dotTexture: THREE.DataTexture | null = null;

/// A soft round dot, computed into a small data texture (white with a falling alpha), so no colour literal
/// is needed: the points material tints it with a token.
function dot() {
    if (dotTexture) return dotTexture;
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
            const i = (y * size + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = 255;
            data[i + 3] = Math.round(clamp01((1 - d) * 3) * 255);
        }
    }
    dotTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    dotTexture.needsUpdate = true;
    return dotTexture;
}

/// Points whose positions a station rewrites every frame (orbits, pulses along edges).
export function particles(count: number, palette: Palette, tone: Tone = 'text', size = 0.09) {
    const positions = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: palette[tone],
        size,
        sizeAttenuation: true,
        map: dot(),
        alphaTest: 0.3,
        transparent: true,
        depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return {
        points,
        positions,
        commit() {
            geometry.attributes.position!.needsUpdate = true;
        },
        recolor() {
            material.color.copy(palette[tone]);
        },
        dispose() {
            geometry.dispose();
            material.dispose();
        },
    };
}

const cssVar = (name: string, fallback: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/// A pill of mono text that always faces the camera, drawn on a canvas in the page's surface, line and
/// text tokens. `recolor` redraws it after a theme change.
export function label(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
        const context = canvas.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = cssVar('--color-surface', 'white');
        context.strokeStyle = cssVar('--color-line', 'gray');
        context.lineWidth = 3;
        context.beginPath();
        context.roundRect(3, 3, 250, 74, 37);
        context.fill();
        context.stroke();
        context.fillStyle = cssVar('--color-text', 'black');
        context.font = `500 30px ${cssVar('--font-mono', 'monospace')}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 42);
        texture.needsUpdate = true;
    };
    draw();
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.28, 0.4, 1);
    return {
        sprite,
        recolor: draw,
        dispose() {
            texture.dispose();
            material.dispose();
        },
    };
}

/// A deterministic random sequence, so a scene is the same on every visit.
export function seeded(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
