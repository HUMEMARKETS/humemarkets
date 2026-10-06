import * as THREE from 'three';

/// The landing world: one wireframe station per section, laid along a path the camera travels as the
/// page scrolls. Every colour is a token read from the page (`Palette`), so the world follows the theme.

export interface Palette {
    text: THREE.Color;
    muted: THREE.Color;
}

type Tone = keyof Palette;

export interface Station {
    group: THREE.Group;
    /// Radians per second of the slow turn the station makes while motion is on.
    spin: number;
    setFade(fade: number): void;
    idle(time: number): void;
    recolor(): void;
    dispose(): void;
}

/// Distance between two stations along the path, in world units.
const SPACING = 13;
/// How far the camera stands back from the station it is looking at.
const STAND_OFF = 10.5;
const EYE_HEIGHT = 2;

export const stationPosition = (index: number) =>
    new THREE.Vector3(Math.sin(index * 1.3) * 3.2, 0, -index * SPACING);

/// The camera's path and the path of the point it looks at, through every station. The camera swings
/// from one side to the other between stations, so the travel reads as moving through a place.
export function buildPath(count: number) {
    const look: THREE.Vector3[] = [];
    const eye: THREE.Vector3[] = [];
    for (let index = 0; index < count; index += 1) {
        const station = stationPosition(index);
        const angle = index % 2 === 0 ? -0.34 : 0.34;
        look.push(station.clone().add(new THREE.Vector3(0, 0.1, 0)));
        eye.push(
            station
                .clone()
                .add(
                    new THREE.Vector3(
                        Math.sin(angle) * STAND_OFF,
                        EYE_HEIGHT,
                        Math.cos(angle) * STAND_OFF,
                    ),
                ),
        );
    }
    return {
        eye: new THREE.CatmullRomCurve3(eye, false, 'centripetal'),
        look: new THREE.CatmullRomCurve3(look, false, 'centripetal'),
    };
}

/// Line segments and their materials for one station, so fading, recolouring and disposing are one loop.
function kit(palette: Palette) {
    const group = new THREE.Group();
    const parts: { material: THREE.LineBasicMaterial; base: number; tone: Tone }[] = [];
    const geometries: THREE.BufferGeometry[] = [];

    function lines(
        positions: number[],
        base: number,
        tone: Tone = 'text',
        parent: THREE.Object3D = group,
    ): THREE.LineSegments {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(positions), 3),
        );
        const material = new THREE.LineBasicMaterial({
            color: palette[tone],
            transparent: true,
            opacity: base,
            depthWrite: false,
        });
        const segments = new THREE.LineSegments(geometry, material);
        segments.frustumCulled = false;
        parent.add(segments);
        geometries.push(geometry);
        parts.push({ material, base, tone });
        return segments;
    }

    function station(spin: number, idle: (time: number) => void = () => undefined): Station {
        return {
            group,
            spin,
            idle,
            setFade(fade) {
                for (const part of parts) part.material.opacity = part.base * fade;
            },
            recolor() {
                for (const part of parts) part.material.color.copy(palette[part.tone]);
            },
            dispose() {
                for (const geometry of geometries) geometry.dispose();
                for (const part of parts) part.material.dispose();
            },
        };
    }

    return { group, lines, station };
}

function circle(radius: number, segments: number, y = 0): number[] {
    const out: number[] = [];
    for (let index = 0; index < segments; index += 1) {
        const a = (index / segments) * Math.PI * 2;
        const b = ((index + 1) / segments) * Math.PI * 2;
        out.push(Math.cos(a) * radius, y, Math.sin(a) * radius, Math.cos(b) * radius, y, Math.sin(b) * radius);
    }
    return out;
}

/// A deterministic random sequence, so the trader network is the same on every visit.
function seeded(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/// The HUME mark, a Möbius ring, as a wire band. `turn` is how much of the loop is drawn: the hero
/// opens on an unfinished loop and the closing section resolves it.
function mobius(palette: Palette, detail: number, turn: number, rows: number): Station {
    const { group, lines, station } = kit(palette);
    const radius = 1.5;
    const width = 0.55;
    const end = Math.PI * 2 * turn;
    const at = (u: number, v: number) => [
        (radius + v * Math.cos(u / 2)) * Math.cos(u),
        v * Math.sin(u / 2),
        (radius + v * Math.cos(u / 2)) * Math.sin(u),
    ];
    const along: number[] = [];
    const steps = Math.round(150 * detail * turn);
    for (let row = 0; row <= rows; row += 1) {
        const v = -width + (2 * width * row) / rows;
        for (let step = 0; step < steps; step += 1) {
            along.push(...at((end * step) / steps, v), ...at((end * (step + 1)) / steps, v));
        }
    }
    const across: number[] = [];
    const ribs = Math.round(56 * detail * turn);
    for (let rib = 0; rib <= ribs; rib += 1) {
        const u = (end * rib) / ribs;
        across.push(...at(u, -width), ...at(u, width));
    }
    // The tilt sits on an inner group, so the station's spin turns the ring about its own upright axis.
    const tilt = new THREE.Group();
    tilt.rotation.set(0.95, 0, 0.18);
    group.add(tilt);
    lines(along, 0.75, 'text', tilt);
    lines(across, 0.35, 'muted', tilt);
    return station(0.14);
}

/// Markets: a wire globe with one tick for each listed market, so the globe is as full as the registry.
function globe(palette: Palette, detail: number) {
    const { group, lines, station } = kit(palette);
    const radius = 1.9;
    const segments = Math.round(72 * detail);
    const shell: number[] = [];
    for (let lat = 1; lat < 8; lat += 1) {
        const phi = (Math.PI * lat) / 8;
        const ring = circle(Math.sin(phi) * radius, segments, Math.cos(phi) * radius);
        shell.push(...ring);
    }
    for (let lon = 0; lon < 12; lon += 1) {
        const theta = (Math.PI * 2 * lon) / 12;
        for (let step = 0; step < segments / 2; step += 1) {
            const a = (Math.PI * step) / (segments / 2);
            const b = (Math.PI * (step + 1)) / (segments / 2);
            shell.push(
                Math.sin(a) * Math.cos(theta) * radius, Math.cos(a) * radius, Math.sin(a) * Math.sin(theta) * radius,
                Math.sin(b) * Math.cos(theta) * radius, Math.cos(b) * radius, Math.sin(b) * Math.sin(theta) * radius,
            );
        }
    }
    lines(shell, 0.32, 'muted');
    let ticks: THREE.LineSegments | null = null;
    const base = station(0.12);
    return {
        ...base,
        /// One tick per market, spread evenly over the sphere (a Fibonacci lattice).
        setCount(count: number) {
            const positions: number[] = [];
            const golden = Math.PI * (3 - Math.sqrt(5));
            for (let index = 0; index < count; index += 1) {
                const y = 1 - (2 * (index + 0.5)) / count;
                const ring = Math.sqrt(1 - y * y);
                const theta = index * golden;
                const x = Math.cos(theta) * ring;
                const z = Math.sin(theta) * ring;
                positions.push(x * radius, y * radius, z * radius, x * radius * 1.16, y * radius * 1.16, z * radius * 1.16);
            }
            if (!ticks) {
                ticks = lines(positions, 0.9);
                return;
            }
            ticks.geometry.dispose();
            ticks.geometry.setAttribute(
                'position',
                new THREE.BufferAttribute(new Float32Array(positions), 3),
            );
        },
        group,
    };
}

/// Trade: an option's value over price (across) and time to expiry (into the screen). At expiry, the
/// front edge, it is the familiar hockey stick; further out it is smooth.
function payoffSurface(palette: Palette, detail: number): Station {
    const { group, lines, station } = kit(palette);
    const columns = Math.round(40 * detail);
    const rows = Math.round(16 * detail);
    const height = (x: number, t: number) => {
        const softness = 0.06 + t * 0.85;
        return softness * Math.log1p(Math.exp(x / softness)) * 0.8;
    };
    const point = (col: number, row: number) => {
        const x = -2 + (4 * col) / columns;
        const t = row / rows;
        return [x, height(x, t) - 0.9, 1.2 - t * 2.4];
    };
    const mesh: number[] = [];
    for (let row = 1; row <= rows; row += 1) {
        for (let col = 0; col < columns; col += 1) mesh.push(...point(col, row), ...point(col + 1, row));
    }
    for (let col = 0; col <= columns; col += 1) {
        for (let row = 0; row < rows; row += 1) mesh.push(...point(col, row), ...point(col, row + 1));
    }
    const expiry: number[] = [];
    for (let col = 0; col < columns; col += 1) expiry.push(...point(col, 0), ...point(col + 1, 0));
    lines(mesh, 0.32, 'muted');
    lines(expiry, 0.95);
    lines([-2.2, -0.9, 1.2, 2.2, -0.9, 1.2, -2.2, -0.9, 1.2, -2.2, -0.9, -1.2], 0.5, 'muted');
    group.rotation.y = -0.25;
    return station(0);
}

/// Capital: a health gauge standing on a vault. The needle breathes inside the safe band.
function vaultGauge(palette: Palette, detail: number): Station {
    const { group, lines, station } = kit(palette);
    const segments = Math.round(48 * detail);
    const vault: number[] = [...circle(1.5, segments, -2), ...circle(1.5, segments, -1.1)];
    for (let index = 0; index < 12; index += 1) {
        const a = (index / 12) * Math.PI * 2;
        vault.push(Math.cos(a) * 1.5, -2, Math.sin(a) * 1.5, Math.cos(a) * 1.5, -1.1, Math.sin(a) * 1.5);
    }
    lines(vault, 0.4, 'muted');
    const gauge = new THREE.Group();
    gauge.position.y = -0.7;
    group.add(gauge);
    const arc: number[] = [];
    const ticks: number[] = [];
    const from = Math.PI * 1.1;
    const to = -Math.PI * 0.1;
    const radius = 2;
    for (let step = 0; step < segments; step += 1) {
        const a = from + ((to - from) * step) / segments;
        const b = from + ((to - from) * (step + 1)) / segments;
        arc.push(Math.cos(a) * radius, Math.sin(a) * radius, 0, Math.cos(b) * radius, Math.sin(b) * radius, 0);
    }
    for (let index = 0; index <= 40; index += 1) {
        const a = from + ((to - from) * index) / 40;
        const inner = index % 5 === 0 ? radius - 0.32 : radius - 0.16;
        ticks.push(Math.cos(a) * inner, Math.sin(a) * inner, 0, Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
    lines(arc, 0.8, 'text', gauge);
    lines(ticks, 0.55, 'muted', gauge);
    const needle = new THREE.Group();
    gauge.add(needle);
    lines([0, 0, 0, 1.7, 0, 0, 0, -0.08, 0, 0, 0.08, 0], 0.95, 'text', needle);
    return station(0.08, (time) => {
        needle.rotation.z = Math.PI * 0.42 + Math.sin(time * 0.6) * 0.32;
    });
}

/// Social: a network of traders around one leader, with followers linked to it.
function network(palette: Palette, detail: number): Station {
    const { group, lines, station } = kit(palette);
    const random = seeded(4663);
    const count = Math.round(30 * detail) + 6;
    const nodes: THREE.Vector3[] = [];
    for (let index = 0; index < count; index += 1) {
        const direction = new THREE.Vector3(random() * 2 - 1, (random() * 2 - 1) * 0.7, random() * 2 - 1).normalize();
        nodes.push(direction.multiplyScalar(1.3 + random() * 1.1));
    }
    const glyphs: number[] = [];
    const size = 0.07;
    for (const node of nodes) {
        glyphs.push(node.x - size, node.y, node.z, node.x + size, node.y, node.z);
        glyphs.push(node.x, node.y - size, node.z, node.x, node.y + size, node.z);
        glyphs.push(node.x, node.y, node.z - size, node.x, node.y, node.z + size);
    }
    const peers: number[] = [];
    nodes.forEach((node, index) => {
        const nearest = nodes
            .map((other, position) => ({ position, distance: node.distanceTo(other) }))
            .filter((entry) => entry.position !== index)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 2);
        for (const { position } of nearest) {
            const other = nodes[position]!;
            peers.push(node.x, node.y, node.z, other.x, other.y, other.z);
        }
    });
    const follows: number[] = [];
    nodes.slice(0, Math.ceil(count / 3)).forEach((node) => follows.push(0, 0, 0, node.x, node.y, node.z));
    const leader = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.3));
    lines(Array.from(leader.getAttribute('position').array), 0.95);
    leader.dispose();
    lines(glyphs, 0.85);
    lines(peers, 0.22, 'muted');
    lines(follows, 0.5);
    return station(0.1);
}

/// Verify: one block per contract in the deployment, chained in order. A contract with no address on
/// this network is drawn faint.
function contractBlocks(palette: Palette, deployed: readonly boolean[]): Station {
    const { group, lines, station } = kit(palette);
    const columns = 5;
    const rows = Math.ceil(deployed.length / columns);
    const gap = 0.72;
    const half = 0.22;
    const centre = (index: number) =>
        new THREE.Vector3(
            ((index % columns) - (columns - 1) / 2) * gap,
            ((rows - 1) / 2 - Math.floor(index / columns)) * gap,
            Math.sin(index * 1.7) * 0.25,
        );
    const box = (c: THREE.Vector3, out: number[]) => {
        const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [c.x + x * half, c.y + y * half, c.z + z * half])));
        for (let a = 0; a < 8; a += 1) {
            for (let b = a + 1; b < 8; b += 1) {
                // Corners that differ in exactly one axis share an edge.
                const differ = (a ^ b) === 1 || (a ^ b) === 2 || (a ^ b) === 4;
                if (differ) out.push(...corners[a]!, ...corners[b]!);
            }
        }
    };
    const live: number[] = [];
    const missing: number[] = [];
    const chain: number[] = [];
    deployed.forEach((isLive, index) => {
        const c = centre(index);
        box(c, isLive ? live : missing);
        if (index > 0) {
            const previous = centre(index - 1);
            chain.push(previous.x, previous.y, previous.z, c.x, c.y, c.z);
        }
    });
    lines(live, 0.8);
    if (missing.length > 0) lines(missing, 0.28, 'muted');
    lines(chain, 0.3, 'muted');
    group.rotation.y = 0.2;
    return station(0.06);
}

/// Vision: the mark again, closed, inside a ring of ticks that faces the camera.
function resolved(palette: Palette, detail: number): Station {
    const mark = mobius(palette, detail, 1, 6);
    const { group, lines, station } = kit(palette);
    const ring: number[] = [];
    const segments = Math.round(160 * detail);
    for (let index = 0; index < segments; index += 1) {
        const a = (index / segments) * Math.PI * 2;
        const b = ((index + 1) / segments) * Math.PI * 2;
        ring.push(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0, Math.cos(b) * 2.6, Math.sin(b) * 2.6, 0);
    }
    const ticks: number[] = [];
    for (let index = 0; index < 120; index += 1) {
        const a = (index / 120) * Math.PI * 2;
        const inner = index % 10 === 0 ? 2.32 : 2.46;
        ticks.push(Math.cos(a) * inner, Math.sin(a) * inner, 0, Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0);
    }
    lines(ring, 0.4, 'muted');
    lines(ticks, 0.5, 'muted');
    group.add(mark.group);
    const halo = station(0, (time) => {
        mark.group.rotation.y = time * mark.spin;
    });
    return {
        ...halo,
        setFade(fade) {
            halo.setFade(fade);
            mark.setFade(fade);
        },
        recolor() {
            halo.recolor();
            mark.recolor();
        },
        dispose() {
            halo.dispose();
            mark.dispose();
        },
    };
}

/// The seven stations in section order, each placed on the path. `detail` scales the segment counts
/// down on a phone.
export function buildStations(palette: Palette, detail: number, deployed: readonly boolean[]) {
    const markets = globe(palette, detail);
    const stations: Station[] = [
        mobius(palette, detail, 0.8, 4),
        markets,
        payoffSurface(palette, detail),
        vaultGauge(palette, detail),
        network(palette, detail),
        contractBlocks(palette, deployed),
        resolved(palette, detail),
    ];
    stations.forEach((item, index) => item.group.position.copy(stationPosition(index)));
    return { stations, setMarketCount: markets.setCount };
}

/// The ground under the whole path: a grid drawn as one `LineSegments` that follows the camera in whole
/// cells, so it reads as endless and still. A small shader fades each line with distance, and fades it
/// out under the header.
export function buildGround(palette: Palette) {
    const STEP = 1.5;
    const REACH = 48;
    const positions: number[] = [];
    for (let x = -REACH; x <= REACH + 1e-6; x += STEP) positions.push(x, 0, -REACH, x, 0, REACH);
    for (let z = -REACH; z <= REACH + 1e-6; z += STEP) positions.push(-REACH, 0, z, REACH, 0, z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const uniforms = {
        uColor: { value: palette.muted.clone() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uOpacity: { value: 0.3 },
    };
    const material = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
            varying float vDistance;
            void main() {
                vec4 view = modelViewMatrix * vec4(position, 1.0);
                vDistance = -view.z;
                gl_Position = projectionMatrix * view;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform vec2 uResolution;
            uniform float uOpacity;
            varying float vDistance;
            void main() {
                float v = gl_FragCoord.y / uResolution.y;
                float distanceFade = 1.0 - smoothstep(6.0, 32.0, vDistance);
                float nearFade = smoothstep(1.0, 3.5, vDistance);
                float topFade = 1.0 - smoothstep(0.78, 0.88, v);
                gl_FragColor = vec4(uColor, uOpacity * distanceFade * nearFade * topFade);
            }
        `,
    });
    const grid = new THREE.LineSegments(geometry, material);
    grid.frustumCulled = false;
    grid.position.y = -2.2;
    return {
        object: grid,
        follow(eye: THREE.Vector3) {
            grid.position.x = Math.round(eye.x / STEP) * STEP;
            grid.position.z = Math.round(eye.z / STEP) * STEP;
        },
        setSize(width: number, height: number) {
            uniforms.uResolution.value.set(width, height);
        },
        recolor() {
            uniforms.uColor.value.copy(palette.muted);
        },
        dispose() {
            geometry.dispose();
            material.dispose();
        },
    };
}
