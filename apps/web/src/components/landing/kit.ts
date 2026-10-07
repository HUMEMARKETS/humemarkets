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
    const material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, transparent: true });
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
        fade(amount: number) {
            material.opacity = amount;
        },
        dispose() {
            geometry!.dispose();
            material.dispose();
            mesh.dispose();
        },
    };
}

/// A solid mesh in one tone, for single objects (a gauge needle, the leader node).
export function solid(geometry: THREE.BufferGeometry, palette: Palette, tone: Tone) {
    const material = new THREE.MeshStandardMaterial({ color: palette[tone], roughness: 0.5, metalness: 0.08, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    return {
        mesh,
        recolor() {
            material.color.copy(palette[tone]);
        },
        fade(amount: number) {
            material.opacity = amount;
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
        fade(amount: number) {
            material.opacity = opacity * amount;
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
        fade: paint.fade,
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
        fade(amount: number) {
            material.opacity = opacity * amount;
        },
        dispose() {
            geometry.dispose();
            material.dispose();
        },
    };
}

interface PassLook {
    face: number;
    edge: number;
    spec: number;
}

/// Seconds a wire surface takes to sweep in around its long way.
const REVEAL = 1.6;

/// A closed parametric surface drawn after the wireframe study in `UI_REFERENCES/hume-3d-illustration.jpeg`,
/// in four passes: a depth-only body so the far side's grid is hidden, a soft glow just outside the
/// silhouette (an inverted hull), a faint body darker in the middle and brighter at the rim, and hairline
/// grid lines lit from the top left with a specular streak. `at(u, v, out)` writes and returns the point for
/// u and v in [0, 1]; the grid has `around` cells along u, `across` along v, and the reveal sweeps along u.
/// `look` sets each pass's opacity facing the camera (`face`) and at the rim (`edge`), its specular
/// strength, and how far out the glow's hull stands.
export function wireSurface(
    at: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3,
    around: number,
    across: number,
    palette: Palette,
    tone: Tone,
    look: { line: PassLook; fill: PassLook; glow: { edge: number; push: number } },
) {
    const columns = across + 1;
    const count = (around + 1) * columns;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const sweep = new Float32Array(count);
    const point = new THREE.Vector3();
    const du = new THREE.Vector3();
    const dv = new THREE.Vector3();
    const centre = new THREE.Vector3();
    const EPS = 1e-4;
    for (let i = 0; i <= around; i += 1) {
        for (let j = 0; j <= across; j += 1) {
            const u = i / around;
            const v = j / across;
            const k = i * columns + j;
            at(u, v, point);
            at(u + EPS, v, du).sub(point);
            at(u, v + EPS, dv).sub(point);
            du.cross(dv).normalize();
            point.toArray(positions, 3 * k);
            du.toArray(normals, 3 * k);
            sweep[k] = u;
            centre.add(point);
        }
    }
    // The cross product's sign depends on how `at` is laid out. At the point farthest from the centre the
    // outward normal must point away from it, so that one point decides the sign for the whole surface.
    centre.divideScalar(count);
    let far = 0;
    let farthest = -1;
    for (let k = 0; k < count; k += 1) {
        const distance = point.fromArray(positions, 3 * k).distanceToSquared(centre);
        if (distance > farthest) {
            far = k;
            farthest = distance;
        }
    }
    if (du.fromArray(normals, 3 * far).dot(point.fromArray(positions, 3 * far).sub(centre)) < 0) {
        for (let k = 0; k < normals.length; k += 1) normals[k] = -normals[k]!;
    }

    const lineIndex: number[] = [];
    const fillIndex: number[] = [];
    for (let i = 0; i < around; i += 1) {
        for (let j = 0; j < across; j += 1) {
            const a = i * columns + j;
            const b = a + columns;
            lineIndex.push(a, b, a, a + 1);
            fillIndex.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    const shape = (index: number[]) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('sweep', new THREE.BufferAttribute(sweep, 1));
        geometry.setIndex(index);
        return geometry;
    };

    const shared = {
        uColor: { value: palette[tone].clone() },
        uMuted: { value: palette.muted.clone() },
        uFade: { value: 1 },
        uReveal: { value: 0 },
        // The pointer in view space (x, y), the ripple's phase and its strength.
        uPointer: { value: new THREE.Vector4() },
    };
    // Every pass is in the transparent list with a high render order, so the depth body hides only this
    // surface's own later passes, never another station or a ring drawn before it.
    const paint = (
        pass: 'DEPTH' | 'HULL' | 'FILL' | 'LINE',
        { face = 0, edge = 0, spec = 0, push = 0 }: Partial<PassLook> & { push?: number },
        options: THREE.ShaderMaterialParameters = {},
    ) =>
        new THREE.ShaderMaterial({
            uniforms: { ...shared, uFace: { value: face }, uEdge: { value: edge }, uSpec: { value: spec }, uPush: { value: push } },
            defines: { [pass]: '' },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            ...options,
            vertexShader: /* glsl */ `
                attribute float sweep;
                uniform float uPush;
                uniform vec4 uPointer;
                varying vec3 vNormal;
                varying vec3 vView;
                varying float vSweep;
                varying float vRipple;
                void main() {
                    vec4 view = modelViewMatrix * vec4(position + normal * uPush, 1.0);
                    vNormal = normalMatrix * normal;
                    // Rings that spread from under the pointer, measured across the screen, lift the skin a little.
                    float d = distance(view.xy, uPointer.xy);
                    vRipple = uPointer.w * exp(-d * d * 2.0) * (0.5 + 0.5 * sin(d * 14.0 - uPointer.z));
                    view.xyz += normalize(vNormal) * vRipple * 0.05;
                    vView = -view.xyz;
                    vSweep = sweep;
                    gl_Position = projectionMatrix * view;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor;
                uniform vec3 uMuted;
                uniform float uFade;
                uniform float uReveal;
                uniform float uFace;
                uniform float uEdge;
                uniform float uSpec;
                varying vec3 vNormal;
                varying vec3 vView;
                varying float vSweep;
                varying float vRipple;
                // The key light, in view space: from the top left, a little toward the camera.
                const vec3 KEY = vec3(-0.53, 0.72, 0.45);
                void main() {
                    if (vSweep > uReveal) discard;
                    #ifdef DEPTH
                        gl_FragColor = vec4(0.0);
                    #else
                        vec3 n = normalize(vNormal);
                        vec3 eye = normalize(vView);
                        float facing = dot(n, eye);
                        float shown = (1.0 - smoothstep(uReveal - 0.05, uReveal, vSweep)) * uFade;
                        #ifdef HULL
                            // Only the hull's far faces, and only where they peek out past the body: brightest at
                            // the body's edge, gone at the hull's.
                            if (facing > 0.0) discard;
                            gl_FragColor = vec4(uColor, uEdge * smoothstep(0.0, 0.5, -facing) * shown);
                        #else
                            float rim = 1.0 - abs(facing);
                            rim *= rim;
                            float light = 0.35 + 0.65 * max(dot(n, KEY), 0.0);
                            float spec = uSpec * pow(max(dot(n, normalize(KEY + eye)), 0.0), 40.0);
                            float alpha = mix(uFace, uEdge, rim) * light + spec + vRipple * 0.35;
                            #ifdef FILL
                                gl_FragColor = vec4(mix(uMuted, uColor, rim), alpha * shown);
                            #else
                                gl_FragColor = vec4(uColor, alpha * shown);
                            #endif
                        #endif
                    #endif
                }
            `,
        });

    const lineGeometry = shape(lineIndex);
    const fillGeometry = shape(fillIndex);
    const materials = [
        paint('DEPTH', {}, { colorWrite: false, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        paint('HULL', look.glow),
        paint('FILL', look.fill),
        paint('LINE', look.line),
    ];
    const object = new THREE.Group();
    materials.forEach((material, index) => {
        const part = material.defines.LINE === undefined ? new THREE.Mesh(fillGeometry, material) : new THREE.LineSegments(lineGeometry, material);
        part.renderOrder = 10 + index;
        object.add(part);
    });
    let started = -1;

    return {
        object,
        begin(now: number) {
            if (started < 0) started = now;
        },
        /// Moves the reveal sweep until the surface is whole.
        tick(now: number) {
            if (started < 0 || shared.uReveal.value > 1.05) return;
            const progress = clamp01((now - started) / REVEAL);
            shared.uReveal.value = (1 - (1 - progress) ** 3) * 1.06;
        },
        /// The ripple: `view` is the pointer in view space, `strength` 0 for none.
        point(view: THREE.Vector3, phase: number, strength: number) {
            shared.uPointer.value.set(view.x, view.y, phase, strength);
        },
        recolor() {
            shared.uColor.value.copy(palette[tone]);
            shared.uMuted.value.copy(palette.muted);
        },
        fade(amount: number) {
            shared.uFade.value = amount;
        },
        dispose() {
            lineGeometry.dispose();
            fillGeometry.dispose();
            for (const material of materials) material.dispose();
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
        fade(amount: number) {
            material.opacity = amount;
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
/// text tokens. `recolor` redraws it after a theme change; `set` redraws it with new text.
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
        set(next: string) {
            if (next === text) return;
            text = next;
            draw();
        },
        fade(amount: number) {
            material.opacity = amount;
        },
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
