import type { MarketConfig } from '@hume/types';
import * as THREE from 'three';
import { symbolOf } from '@/lib/market';
import { label, orbitRing, particles, seeded, segments, solid, voxelField, type Palette, type VoxelSpec } from './kit';

/// The landing world, after robinid.vercel.app: one lit, solid station per section, laid along the x axis,
/// with a camera that rests on each and arcs between them. Every colour is a page token (`Palette`).

export type { Palette } from './kit';

export interface Station {
    group: THREE.Group;
    /// Starts the voxel assembly; called the first time the station comes into view.
    begin(now: number): void;
    update(time: number, now: number): void;
    recolor(): void;
    dispose(): void;
}

/// Distance between two stations along x.
const SPACING = 17;

/// Where the camera stands and looks for each station, relative to it. A negative x pushes the station right,
/// clear of the copy column. Between two stations the camera
/// holds for the first and last fifth of the scroll, glides in between, and rises in an arc.
const KEYFRAMES: { pos: THREE.Vector3; look: THREE.Vector3 }[] = [
    { pos: new THREE.Vector3(-0.4, 1.3, 13.5), look: new THREE.Vector3(-0.4, 0.2, 0) },
    { pos: new THREE.Vector3(-0.2, 1.8, 12), look: new THREE.Vector3(-0.8, 0.3, 0) },
    { pos: new THREE.Vector3(0, 3.4, 12.5), look: new THREE.Vector3(0, -0.4, 0) },
    { pos: new THREE.Vector3(-0.8, 2.4, 12.5), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(0, 2.2, 12.5), look: new THREE.Vector3(0, 0.4, 0) },
    { pos: new THREE.Vector3(0.4, 2.4, 12.5), look: new THREE.Vector3(0, 0.3, 0) },
    { pos: new THREE.Vector3(-0.2, 1.6, 15), look: new THREE.Vector3(-0.4, 0, 0) },
];

const smoothstep = (from: number, to: number, value: number) => {
    const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
    return t * t * (3 - 2 * t);
};

const scratch = new THREE.Vector3();

/// The camera for a fractional section index.
export function cameraAt(progress: number, pos: THREE.Vector3, look: THREE.Vector3) {
    const last = KEYFRAMES.length - 1;
    const from = Math.min(last, Math.max(0, Math.floor(progress)));
    const to = Math.min(from + 1, last);
    const blend = smoothstep(0.2, 0.8, progress - from);
    const a = KEYFRAMES[from]!;
    const b = KEYFRAMES[to]!;
    pos.set(SPACING * from, 0, 0).add(a.pos).lerp(scratch.set(SPACING * to, 0, 0).add(b.pos), blend);
    look.set(SPACING * from, 0, 0).add(a.look).lerp(scratch.set(SPACING * to, 0, 0).add(b.look), blend);
    if (from !== to) pos.y += 1.4 * Math.sin(Math.PI * blend);
}

/// Everything a station owns, so recolouring and disposing are one loop.
function bag() {
    const items: { recolor(): void; dispose(): void }[] = [];
    return {
        add<T extends { recolor(): void; dispose(): void }>(item: T): T {
            items.push(item);
            return item;
        },
        recolor() {
            for (const item of items) item.recolor();
        },
        dispose() {
            for (const item of items) item.dispose();
        },
    };
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const facing = (direction: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(Z_AXIS, direction.clone().normalize());

/// The HUME mark, a Möbius band, as a lattice of voxels. The band sweeps in around the loop as it
/// assembles. `accent` picks which voxels take the text tone.
function mobiusVoxels(detail: number, accent: (row: number, rows: number) => boolean) {
    const radius = 2.3;
    const width = 0.85;
    const around = Math.round(170 * detail);
    const step = (2 * Math.PI * radius) / around;
    const rows = Math.max(6, Math.round((2 * width) / step));
    const random = seeded(17);
    const specs: VoxelSpec[] = [];
    for (let a = 0; a < around; a += 1) {
        const u = (2 * Math.PI * a) / around;
        for (let b = 0; b <= rows; b += 1) {
            const v = -width + (2 * width * b) / rows;
            specs.push({
                x: (radius + v * Math.cos(u / 2)) * Math.cos(u),
                y: v * Math.sin(u / 2),
                z: (radius + v * Math.cos(u / 2)) * Math.sin(u),
                tone: accent(b, rows) ? 'text' : 'muted',
                delay: (a / around) * 1.1 + random() * 0.15,
            });
        }
    }
    return { specs, size: step * 0.82 };
}

/// Up to `limit` registry markets as "NVDA · 5x" pills.
function marketLabels(markets: readonly MarketConfig[], limit: number) {
    return markets
        .filter((market) => market.active)
        .slice(0, limit)
        .map((market) => label(`${symbolOf(market.marketId)} · ${market.maxLeverage}x`));
}

/// Start: the voxel mark, turning inside three tilted rings, with particles in orbit and live market labels
/// riding around it.
function hero(palette: Palette, detail: number) {
    const own = bag();
    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.set(0.6, 0, 0.35);
    const spin = new THREE.Group();
    tilt.add(spin);
    group.add(tilt);
    const mark = mobiusVoxels(detail, (row, rows) => row === 0 || row === rows);
    const band = own.add(voxelField(mark.specs, palette, { size: mark.size }));
    spin.add(band.mesh);
    const rings = [3.1, 3.45, 3.8].map((radius, index) => {
        const ring = own.add(orbitRing(radius, palette, index === 1 ? 'text' : 'muted', index === 1 ? 0.35 : 0.3));
        ring.mesh.rotation.set(Math.PI / 2 + (index - 1) * 0.2, 0.7 * index, 0);
        group.add(ring.mesh);
        return ring.mesh;
    });
    const count = Math.round(90 * detail);
    const dots = own.add(particles(count, palette));
    group.add(dots.points);
    group.scale.setScalar(0.74);
    const labels = new THREE.Group();
    labels.rotation.x = 0.18;
    group.add(labels);
    let tags: ReturnType<typeof label>[] = [];
    const setMarkets = (markets: readonly MarketConfig[]) => {
        for (const tag of tags) {
            labels.remove(tag.sprite);
            tag.dispose();
        }
        tags = marketLabels(markets, detail < 1 ? 4 : 8);
        tags.forEach((tag, index) => {
            const angle = (2 * Math.PI * index) / tags.length;
            tag.sprite.position.set(Math.cos(angle) * 3.5, Math.sin(angle * 2) * 0.5, Math.sin(angle) * 3.5 * 0.6);
            labels.add(tag.sprite);
        });
    };
    const station: Station = {
        group,
        begin: band.begin,
        update(time, now) {
            band.tick(now);
            spin.rotation.y = time * 0.12;
            rings.forEach((ring, index) => {
                ring.rotation.z = time * (0.08 + 0.03 * index) * (index % 2 ? -1 : 1);
            });
            for (let index = 0; index < count; index += 1) {
                const t = time * (0.18 + (index % 7) * 0.02) + 2.399 * index;
                const radius = 3.9 + (index % 5) * 0.25;
                dots.positions[3 * index] = Math.cos(t) * radius;
                dots.positions[3 * index + 1] = 1.3 * Math.sin(0.7 * t + index);
                dots.positions[3 * index + 2] = Math.sin(t) * radius * 0.5;
            }
            dots.commit();
            labels.rotation.y = time * 0.06;
        },
        recolor() {
            own.recolor();
            for (const tag of tags) tag.recolor();
        },
        dispose() {
            own.dispose();
            for (const tag of tags) tag.dispose();
        },
    };
    return { station, setMarkets };
}

/// Markets: a globe of tiles, with one pillar per registry market standing out of it, as tall as its
/// leverage cap. A paused market is a short pillar in the muted tone.
function globe(palette: Palette, detail: number) {
    const own = bag();
    const group = new THREE.Group();
    const radius = 1.95;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const lattice = (count: number, index: number) => {
        const y = 1 - (2 * (index + 0.5)) / count;
        const ring = Math.sqrt(1 - y * y);
        return new THREE.Vector3(Math.cos(index * golden) * ring, y, Math.sin(index * golden) * ring);
    };
    const tileCount = Math.round(520 * detail);
    const random = seeded(23);
    const tiles = own.add(
        voxelField(
            Array.from({ length: tileCount }, (_, index) => {
                const direction = lattice(tileCount, index);
                return {
                    x: direction.x * radius,
                    y: direction.y * radius,
                    z: direction.z * radius,
                    tone: 'muted' as const,
                    sz: 0.35,
                    q: facing(direction),
                    delay: ((1 - direction.y) / 2) * 0.9 + random() * 0.1,
                };
            }),
            palette,
            { size: 0.16 },
        ),
    );
    const spin = new THREE.Group();
    spin.rotation.z = 0.25;
    spin.add(tiles.mesh);
    group.add(spin);
    const equator = own.add(orbitRing(2.8, palette, 'muted', 0.35));
    equator.mesh.rotation.x = Math.PI / 2 + 0.25;
    group.add(equator.mesh);
    let pillars: ReturnType<typeof voxelField> | null = null;
    let startedAt = -1;
    const setMarkets = (markets: readonly MarketConfig[]) => {
        if (pillars) {
            spin.remove(pillars.mesh);
            pillars.dispose();
        }
        pillars = voxelField(
            markets.map((market, index) => {
                const direction = lattice(markets.length, index);
                const length = market.active ? 0.2 + 0.06 * Number(market.maxLeverage) : 0.12;
                const centre = direction.clone().multiplyScalar(radius + length / 2);
                return {
                    x: centre.x,
                    y: centre.y,
                    z: centre.z,
                    tone: market.active ? ('text' as const) : ('muted' as const),
                    sz: length / 0.1,
                    q: facing(direction),
                    delay: 0.6 + index * 0.025,
                };
            }),
            palette,
            { size: 0.1 },
        );
        spin.add(pillars.mesh);
        if (startedAt >= 0) pillars.begin(startedAt);
    };
    const station: Station = {
        group,
        begin(now) {
            if (startedAt < 0) startedAt = now;
            tiles.begin(now);
            pillars?.begin(now);
        },
        update(time, now) {
            tiles.tick(now);
            pillars?.tick(now);
            spin.rotation.y = time * 0.1;
        },
        recolor() {
            own.recolor();
            pillars?.recolor();
        },
        dispose() {
            own.dispose();
            pillars?.dispose();
        },
    };
    return { station, setMarkets };
}

/// Trade: an option's value over price (across) and time to expiry (into the screen), as a field of bars.
/// The front row, at expiry, is the familiar hockey stick, in the text tone. The field breathes.
function payoffField(palette: Palette, detail: number): Station {
    const own = bag();
    const group = new THREE.Group();
    const columns = Math.round(26 * detail);
    const rows = Math.round(11 * detail);
    const gap = 4.6 / columns;
    const size = gap * 0.8;
    const height = (x: number, t: number) => {
        const softness = 0.06 + t * 0.85;
        return 0.08 + softness * Math.log1p(Math.exp(x / softness)) * 1.15;
    };
    const base: number[] = [];
    const specs: VoxelSpec[] = [];
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
            const h = height(-2 + (4 * col) / (columns - 1), row / Math.max(1, rows - 1));
            base.push(h);
            specs.push({
                x: (col - (columns - 1) / 2) * gap,
                y: -1.6 + h / 2,
                z: 1.4 - row * gap,
                tone: row === 0 ? 'text' : 'muted',
                sy: h / size,
                delay: col * 0.03 + row * 0.04,
            });
        }
    }
    const bars = own.add(voxelField(specs, palette, { size, live: true }));
    group.add(bars.mesh);
    const frame = own.add(segments([-2.5, -1.6, 1.4 + gap, 2.5, -1.6, 1.4 + gap, -2.5, -1.6, 1.4 + gap, -2.5, 2.2, 1.4 + gap], palette, 'muted', 0.5));
    group.add(frame.lines);
    group.rotation.y = -0.35;
    // Station groups are placed along x by `buildStations`; the field's own offset keeps it clear of the copy.
    bars.mesh.position.x = frame.lines.position.x = 0.6;
    return {
        group,
        begin: bars.begin,
        update(time, now) {
            specs.forEach((spec, index) => {
                const col = index % columns;
                const row = Math.floor(index / columns);
                const h = base[index]! * (1 + 0.07 * Math.sin(1.1 * time + col * 0.35 + row * 0.25));
                spec.sy = h / size;
                spec.y = -1.6 + h / 2;
            });
            bars.tick(now);
        },
        recolor: own.recolor,
        dispose: own.dispose,
    };
}

/// Capital: a vault of stacked rings of blocks, and a health gauge over it whose needle sweeps the safe band.
function vaultGauge(palette: Palette, detail: number): Station {
    const own = bag();
    const group = new THREE.Group();
    const perRing = Math.round(40 * detail);
    const layers = 5;
    const vaultSpecs: VoxelSpec[] = [];
    for (let layer = 0; layer < layers; layer += 1) {
        for (let index = 0; index < perRing; index += 1) {
            const angle = (2 * Math.PI * index) / perRing;
            vaultSpecs.push({
                x: Math.cos(angle) * 2,
                y: -2.4 + layer * 0.3,
                z: Math.sin(angle) * 2,
                tone: layer === layers - 1 ? 'text' : 'muted',
                sx: 1.6,
                sz: 0.7,
                q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle),
                delay: layer * 0.12 + (index / perRing) * 0.3,
            });
        }
    }
    const vault = own.add(voxelField(vaultSpecs, palette, { size: 0.2 }));
    group.add(vault.mesh);
    const gauge = new THREE.Group();
    gauge.position.y = 0.2;
    group.add(gauge);
    const ticks = 41;
    const from = Math.PI * 1.1;
    const to = -Math.PI * 0.1;
    const tickSpecs: VoxelSpec[] = Array.from({ length: ticks }, (_, index) => {
        const angle = from + ((to - from) * index) / (ticks - 1);
        const long = index % 5 === 0;
        const r = long ? 2.35 : 2.45;
        return {
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
            z: 0,
            tone: long ? 'text' : 'muted',
            sx: 0.35,
            sy: long ? 2.4 : 1.2,
            q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - Math.PI / 2),
            delay: 0.4 + index * 0.02,
        };
    });
    const dial = own.add(voxelField(tickSpecs, palette, { size: 0.12 }));
    gauge.add(dial.mesh);
    const needle = own.add(solid(new THREE.BoxGeometry(0.07, 2, 0.07), palette, 'text'));
    needle.mesh.position.y = 1;
    const pivot = new THREE.Group();
    pivot.add(needle.mesh);
    gauge.add(pivot);
    const hub = own.add(solid(new THREE.SphereGeometry(0.14, 20, 12), palette, 'text'));
    gauge.add(hub.mesh);
    return {
        group,
        begin(now) {
            vault.begin(now);
            dial.begin(now);
        },
        update(time, now) {
            vault.tick(now);
            dial.tick(now);
            pivot.rotation.z = -0.55 + Math.sin(time * 0.6) * 0.3;
            group.rotation.y = Math.sin(time * 0.25) * 0.25;
        },
        recolor: own.recolor,
        dispose: own.dispose,
    };
}

/// Social: a solid leader with traders around it. A third of them follow the leader, and pulses travel
/// along those links.
function network(palette: Palette, detail: number): Station {
    const own = bag();
    const group = new THREE.Group();
    const random = seeded(4663);
    const count = Math.round(30 * detail) + 6;
    const followers = Math.ceil(count / 3);
    const nodes: THREE.Vector3[] = [];
    for (let index = 0; index < count; index += 1) {
        const direction = new THREE.Vector3(random() * 2 - 1, (random() * 2 - 1) * 0.7, random() * 2 - 1).normalize();
        nodes.push(direction.multiplyScalar(1.5 + random() * 1.3));
    }
    const phases = nodes.map(() => random() * Math.PI * 2);
    const specs: VoxelSpec[] = nodes.map((node, index) => ({
        x: node.x,
        y: node.y,
        z: node.z,
        tone: index < followers ? 'text' : 'muted',
        delay: 0.2 + index * 0.03,
    }));
    const traders = own.add(voxelField(specs, palette, { size: 0.17, live: true, geometry: new THREE.IcosahedronGeometry(1, 0) }));
    group.add(traders.mesh);
    const leader = own.add(solid(new THREE.OctahedronGeometry(0.42), palette, 'text'));
    group.add(leader.mesh);
    const pairs: [number, number][] = [];
    nodes.forEach((node, index) => {
        nodes
            .map((other, position) => ({ position, distance: node.distanceTo(other) }))
            .filter((entry) => entry.position !== index)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 2)
            .forEach(({ position }) => pairs.push([index, position]));
    });
    const peers = own.add(segments(new Array(pairs.length * 6).fill(0), palette, 'muted', 0.3));
    const follows = own.add(segments(new Array(followers * 6).fill(0), palette, 'text', 0.35));
    const pulses = own.add(particles(followers, palette, 'text', 0.13));
    group.add(peers.lines, follows.lines, pulses.points);
    return {
        group,
        begin: traders.begin,
        update(time, now) {
            specs.forEach((spec, index) => {
                spec.y = nodes[index]!.y + 0.18 * Math.sin(0.9 * time + phases[index]!);
            });
            traders.tick(now);
            pairs.forEach(([a, b], index) => {
                const from = specs[a]!;
                const to = specs[b]!;
                peers.positions.set([from.x, from.y, from.z, to.x, to.y, to.z], index * 6);
            });
            peers.commit();
            for (let index = 0; index < followers; index += 1) {
                const node = specs[index]!;
                follows.positions.set([0, 0, 0, node.x, node.y, node.z], index * 6);
                const along = 1 - ((0.35 * time + 0.137 * index) % 1);
                pulses.positions.set([node.x * along, node.y * along, node.z * along], index * 3);
            }
            follows.commit();
            pulses.commit();
            leader.mesh.rotation.y = time * 0.7;
            leader.mesh.rotation.x = time * 0.3;
            group.rotation.y = time * 0.08;
        },
        recolor: own.recolor,
        dispose: own.dispose,
    };
}

/// Verify: one block per contract in the deployment, chained in order. A contract with no address on this
/// network is a smaller block. A scan walks the deployed ones, lighting one block at a time.
function contractBlocks(palette: Palette, deployed: readonly boolean[]): Station {
    const own = bag();
    const group = new THREE.Group();
    const columns = 5;
    const rows = Math.ceil(deployed.length / columns);
    const gap = 0.95;
    const centre = (index: number) =>
        new THREE.Vector3(
            ((index % columns) - (columns - 1) / 2) * gap,
            ((rows - 1) / 2 - Math.floor(index / columns)) * gap + 0.2,
            Math.sin(index * 1.7) * 0.3,
        );
    const specs: VoxelSpec[] = deployed.map((live, index) => {
        const c = centre(index);
        const scale = live ? 1 : 0.55;
        return { x: c.x, y: c.y, z: c.z, tone: 'muted', sx: scale, sy: scale, sz: scale, delay: index * 0.05 };
    });
    const blocks = own.add(voxelField(specs, palette, { size: 0.56 }));
    group.add(blocks.mesh);
    const chain: number[] = [];
    for (let index = 1; index < deployed.length; index += 1) {
        const a = centre(index - 1);
        const b = centre(index);
        chain.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const links = own.add(segments(chain, palette, 'muted', 0.4));
    group.add(links.lines);
    const live = deployed.map((value, index) => (value ? index : -1)).filter((index) => index >= 0);
    let lit = -1;
    return {
        group,
        begin: blocks.begin,
        update(time, now) {
            blocks.tick(now);
            const next = live.length > 0 ? live[Math.floor(time * 2.2) % live.length]! : -1;
            if (next !== lit) {
                if (lit >= 0) blocks.tint(lit, 'muted');
                if (next >= 0) blocks.tint(next, 'text');
                lit = next;
            }
            group.rotation.y = 0.25 + Math.sin(time * 0.2) * 0.15;
        },
        recolor() {
            own.recolor();
            if (lit >= 0) blocks.tint(lit, 'text');
        },
        dispose: own.dispose,
    };
}

/// Vision: the mark again, with every third row in the text tone, inside a ring of ticks that faces the camera.
function resolved(palette: Palette, detail: number): Station {
    const own = bag();
    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.set(0.95, 0, 0.18);
    const spin = new THREE.Group();
    tilt.add(spin);
    group.add(tilt);
    const mark = mobiusVoxels(detail, (row) => row % 3 === 0);
    const band = own.add(voxelField(mark.specs, palette, { size: mark.size }));
    spin.add(band.mesh);
    const tickSpecs: VoxelSpec[] = Array.from({ length: 120 }, (_, index) => {
        const angle = (2 * Math.PI * index) / 120;
        const long = index % 10 === 0;
        return {
            x: Math.cos(angle) * 3.4,
            y: Math.sin(angle) * 3.4,
            z: 0,
            tone: long ? 'text' : 'muted',
            sx: 0.4,
            sy: long ? 2.6 : 1.3,
            q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - Math.PI / 2),
            delay: 0.3 + index * 0.008,
        };
    });
    const ring = own.add(voxelField(tickSpecs, palette, { size: 0.1 }));
    group.add(ring.mesh);
    return {
        group,
        begin(now) {
            band.begin(now);
            ring.begin(now);
        },
        update(time, now) {
            band.tick(now);
            ring.tick(now);
            spin.rotation.y = time * 0.14;
            ring.mesh.rotation.z = time * 0.03;
        },
        recolor: own.recolor,
        dispose: own.dispose,
    };
}

/// The seven stations in section order, each placed along x. `detail` scales instance counts down on a
/// phone. `setMarkets` feeds the registry list to the stations that draw it.
export function buildStations(palette: Palette, detail: number, deployed: readonly boolean[]) {
    const start = hero(palette, detail);
    const markets = globe(palette, detail);
    const stations: Station[] = [
        start.station,
        markets.station,
        payoffField(palette, detail),
        vaultGauge(palette, detail),
        network(palette, detail),
        contractBlocks(palette, deployed),
        resolved(palette, detail),
    ];
    stations.forEach((station, index) => station.group.position.set(SPACING * index, 0, 0));
    return {
        stations,
        setMarkets(list: readonly MarketConfig[]) {
            start.setMarkets(list);
            markets.setMarkets(list);
        },
    };
}

/// The ground under the whole world: a grid drawn as one `LineSegments` that follows the camera in whole
/// cells, so it reads as endless and still. A small shader fades each line with distance and fades it out
/// under the header.
export function buildGround(palette: Palette) {
    const STEP = 2;
    const REACH = 48;
    const positions: number[] = [];
    for (let x = -REACH; x <= REACH + 1e-6; x += STEP) positions.push(x, 0, -REACH, x, 0, REACH);
    for (let z = -REACH; z <= REACH + 1e-6; z += STEP) positions.push(-REACH, 0, z, REACH, 0, z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const uniforms = {
        uColor: { value: palette.muted.clone() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uOpacity: { value: 0.22 },
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
                float distanceFade = 1.0 - smoothstep(10.0, 40.0, vDistance);
                float nearFade = smoothstep(1.0, 4.0, vDistance);
                float topFade = 1.0 - smoothstep(0.78, 0.88, v);
                gl_FragColor = vec4(uColor, uOpacity * distanceFade * nearFade * topFade);
            }
        `,
    });
    const grid = new THREE.LineSegments(geometry, material);
    grid.frustumCulled = false;
    grid.position.y = -3.2;
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
