import type { MarketConfig } from '@hume/types';
import * as THREE from 'three';
import { dampFactor } from '@/lib/landingScroll';
import { symbolOf } from '@/lib/market';
import { useLandingLink } from '@/stores/landing';
import { label, orbitRing, particles, seeded, segments, solid, voxelField, wireSurface, type Palette, type VoxelSpec } from './kit';

/// The landing world: one lit, solid station per section (after robinid.vercel.app), laid along a path the
/// camera travels as the page scrolls. Every colour is a page token (`Palette`).

export type { Palette } from './kit';

/// The visitor's pointer, damped. `x` and `y` are NDC. `hover` eases to 1 while a fine pointer moves over
/// the page and back to 0 when it leaves; on touch it stays 0, so only the idle motion runs. `world` is
/// where the pointer meets the plane through the active station, facing the camera; `view` is that point in
/// view space.
export interface Pointer {
    x: number;
    y: number;
    hover: number;
    world: THREE.Vector3;
    view: THREE.Vector3;
}

export interface Station {
    group: THREE.Group;
    /// Starts the voxel assembly; called the first time the station comes into view.
    begin(now: number): void;
    /// 1 when the camera is at the station, falling to 0 as it travels away.
    setFade(amount: number): void;
    /// `focus` is the station's fade; pointer reactions scale with it, so a station the camera is leaving
    /// lets go of the pointer smoothly.
    update(time: number, now: number, pointer: Pointer, focus: number): void;
    /// Hit-tests what can be hovered, with a ray from the pointer, or with null when the pointer has left or
    /// the station is no longer the active one. Called at most once a frame, only after the pointer moved,
    /// and only on the active station.
    pick?(ray: THREE.Raycaster | null): void;
    /// A click while this is the active station.
    poke?(now: number): void;
    recolor(): void;
    dispose(): void;
}

/// Seconds since the last call, for stations that ease their own values.
function clock() {
    let last = -1;
    return (time: number) => {
        const dt = last < 0 ? 0 : Math.min(0.05, time - last);
        last = time;
        return dt;
    };
}

/// Distance between two stations along the path, in world units.
const SPACING = 13;
/// How far the camera stands back from the station it is looking at.
const STAND_OFF = 10.5;
const EYE_HEIGHT = 2;

const stationPosition = (index: number) => new THREE.Vector3(Math.sin(index * 1.3) * 3.2, 0, -index * SPACING);
/// Which side of a station the camera stands on, as an angle around it from straight in front (+z).
const viewAngle = (index: number) => (index % 2 === 0 ? -0.34 : 0.34);

/// The camera's path and the path of the point it looks at, through every station. The camera swings
/// from one side to the other between stations, so the travel reads as moving through a place.
export function buildPath(count: number) {
    const look: THREE.Vector3[] = [];
    const eye: THREE.Vector3[] = [];
    for (let index = 0; index < count; index += 1) {
        const station = stationPosition(index);
        const angle = viewAngle(index);
        look.push(station.clone().add(new THREE.Vector3(0, 0.1, 0)));
        eye.push(station.clone().add(new THREE.Vector3(Math.sin(angle) * STAND_OFF, EYE_HEIGHT, Math.cos(angle) * STAND_OFF)));
    }
    return {
        eye: new THREE.CatmullRomCurve3(eye, false, 'centripetal'),
        look: new THREE.CatmullRomCurve3(look, false, 'centripetal'),
    };
}

/// Everything a station owns, so recolouring and disposing are one loop.
function bag() {
    const items: { recolor(): void; dispose(): void; fade(amount: number): void }[] = [];
    return {
        add<T extends { recolor(): void; dispose(): void; fade(amount: number): void }>(item: T): T {
            items.push(item);
            return item;
        },
        recolor() {
            for (const item of items) item.recolor();
        },
        setFade(amount: number) {
            for (const item of items) item.fade(amount);
        },
        dispose() {
            for (const item of items) item.dispose();
        },
    };
}

/// A caption pill on a station, always on top, that says what a part of the drawing is. `buildStations`
/// scales every one to the same size on screen, whatever its station's own scale, and the canvas hides them
/// where the drawing is too small, or the copy sits under it.
function caption(own: ReturnType<typeof bag>, group: THREE.Group, text: string, x: number, y: number, z: number) {
    const tag = own.add(label(text));
    tag.sprite.position.set(x, y, z);
    tag.sprite.renderOrder = 100;
    tag.sprite.userData.caption = true;
    group.add(tag.sprite);
    return tag;
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const facing = (direction: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(Z_AXIS, direction.clone().normalize());

/// The HUME mark as a surface, after the wireframe study in `UI_REFERENCES/hume-3d-illustration.jpeg`: a
/// flattened tube whose cross-section turns half a turn on the way round, so its crease runs into itself.
/// `swell` scales the cross-section, for points that float just off the skin.
const TUBE = { radius: 2.4, wide: 0.72, thin: 0.26 };
function mobiusTube(u: number, v: number, out: THREE.Vector3, swell = 1) {
    const around = 2 * Math.PI * u;
    const turn = around / 2;
    const p = TUBE.wide * swell * Math.cos(2 * Math.PI * v);
    const q = TUBE.thin * swell * Math.sin(2 * Math.PI * v);
    const r = TUBE.radius + p * Math.cos(turn) - q * Math.sin(turn);
    return out.set(r * Math.cos(around), p * Math.sin(turn) + q * Math.cos(turn), r * Math.sin(around));
}

/// The HUME mark as Start and Vision draw it: the shaded wire band, with dust drifting along its skin. It
/// tilts toward the pointer from `rest`, ripples under it, and the dust drifts to it.
function wireMark(own: ReturnType<typeof bag>, palette: Palette, detail: number, rest: THREE.Euler) {
    const tilt = new THREE.Group();
    tilt.rotation.copy(rest);
    const spin = new THREE.Group();
    tilt.add(spin);
    const band = own.add(
        wireSurface(mobiusTube, Math.round(110 * detail), Math.max(14, Math.round(22 * detail)), palette, 'text', {
            line: { face: 0.2, edge: 0.95, spec: 0.9 },
            fill: { face: 0.07, edge: 0.24, spec: 0.08 },
            glow: { edge: 0.45, push: 0.04 },
        }),
    );
    spin.add(band.object);
    // Each mote keeps its place across the tube and its height off the skin, and drifts along the loop, so
    // it follows the twist.
    const dustCount = Math.round(360 * detail);
    const dust = own.add(particles(dustCount, palette, 'text', 0.04));
    spin.add(dust.points);
    const random = seeded(29);
    const motes = Array.from({ length: dustCount }, () => ({
        u: random(),
        v: random(),
        swell: 1.04 + random() * random() * 0.5,
        speed: 0.004 + random() * 0.01,
    }));
    const mote = new THREE.Vector3();
    const near = new THREE.Vector3();
    return {
        object: tilt,
        begin: band.begin,
        update(time: number, now: number, pointer: Pointer, focus: number) {
            band.tick(now);
            const reach = pointer.hover * focus;
            tilt.rotation.set(rest.x - pointer.y * 0.2 * focus, rest.y + pointer.x * 0.3 * focus, rest.z);
            band.point(pointer.view, time * 3, reach);
            spin.rotation.y = time * 0.12;
            spin.worldToLocal(near.copy(pointer.world));
            motes.forEach((m, index) => {
                mobiusTube((m.u + time * m.speed) % 1, m.v, mote, m.swell);
                if (reach > 0.01) mote.lerp(near, reach * 0.35 * Math.exp(-mote.distanceToSquared(near) * 0.8));
                mote.toArray(dust.positions, 3 * index);
            });
            dust.commit();
        },
    };
}

const pillText = (market: MarketConfig) => `${symbolOf(market.marketId)} · ${market.active ? `${market.maxLeverage}x` : 'paused'}`;

/// Up to `limit` registry markets as "NVDA · 5x" pills.
function marketLabels(markets: readonly MarketConfig[], limit: number) {
    return markets
        .filter((market) => market.active)
        .slice(0, limit)
        .map((market) => label(pillText(market)));
}

/// Start: the wireframe mark (`wireMark`), with particles in orbit and live market labels riding around it.
function hero(palette: Palette, detail: number) {
    const own = bag();
    const group = new THREE.Group();
    const mark = wireMark(own, palette, detail, new THREE.Euler(0.32, 0, 0.3));
    group.add(mark.object);
    const count = Math.round(90 * detail);
    const dots = own.add(particles(count, palette));
    group.add(dots.points);
    // Larger on a wide screen, where the band has the right of the page to itself.
    group.scale.setScalar(detail < 1 ? 0.74 : 0.9);
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
        begin: mark.begin,
        setFade(amount) {
            own.setFade(amount);
            for (const tag of tags) tag.fade(amount);
        },
        update(time, now, pointer, focus) {
            mark.update(time, now, pointer, focus);
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
/// leverage cap. A paused market is a short pillar in the muted tone. A hovered pillar lifts and shows its
/// market; picking a group on the Markets tabs turns the globe to face that group's pillars.
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
    caption(own, group, 'Pillar = one market', -1.3, -3.2, 0);
    caption(own, group, 'Height = leverage cap', 1.3, -3.2, 0);
    caption(own, group, 'Short grey = paused', 0, -4, 0);
    let pillars: ReturnType<typeof voxelField> | null = null;
    let startedAt = -1;
    // Per pillar: its market, its direction out of the globe, its resting centre and how far it is lifted.
    let ids: string[] = [];
    let texts: string[] = [];
    let directions: THREE.Vector3[] = [];
    let centres: THREE.Vector3[] = [];
    let lifts = new Float32Array(0);
    let hovered = -1;
    const tag = own.add(label(''));
    tag.sprite.visible = false;
    spin.add(tag.sprite);
    const hover = (index: number) => {
        if (index === hovered) return;
        hovered = index;
        tag.sprite.visible = index >= 0;
        if (index < 0) return;
        tag.set(texts[index]!);
        tag.sprite.position.copy(directions[index]!).multiplyScalar(radius + 0.9);
    };
    const setMarkets = (markets: readonly MarketConfig[]) => {
        if (pillars) {
            spin.remove(pillars.mesh);
            pillars.dispose();
        }
        hover(-1);
        ids = markets.map((market) => market.marketId);
        texts = markets.map(pillText);
        directions = markets.map((_, index) => lattice(markets.length, index));
        centres = [];
        lifts = new Float32Array(markets.length);
        pillars = voxelField(
            markets.map((market, index) => {
                const direction = directions[index]!;
                const length = market.active ? 0.2 + 0.06 * Number(market.maxLeverage) : 0.12;
                const centre = direction.clone().multiplyScalar(radius + length / 2);
                centres.push(centre);
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
            { size: 0.1, live: true },
        );
        spin.add(pillars.mesh);
        if (startedAt >= 0) pillars.begin(startedAt);
    };
    const tick = clock();
    const hits: THREE.Intersection[] = [];
    const toward = new THREE.Vector3();
    let yaw = 0;
    let aim: number | null = null;
    let region: readonly string[] | null = null;
    const station: Station = {
        group,
        setFade(amount) {
            own.setFade(amount);
            pillars?.fade(amount);
        },
        begin(now) {
            if (startedAt < 0) startedAt = now;
            tiles.begin(now);
            pillars?.begin(now);
        },
        update(time, now) {
            const dt = tick(time);
            const k = dampFactor(dt);
            tiles.tick(now);
            if (pillars) {
                pillars.specs.forEach((spec, index) => {
                    lifts[index]! += ((index === hovered ? 0.35 : 0) - lifts[index]!) * k;
                    const centre = centres[index]!;
                    const direction = directions[index]!;
                    spec.x = centre.x + direction.x * lifts[index]!;
                    spec.y = centre.y + direction.y * lifts[index]!;
                    spec.z = centre.z + direction.z * lifts[index]!;
                });
                pillars.tick(now);
            }
            // A chosen group: turn so the mean direction of its pillars faces the camera. All: keep turning.
            const chosen = useLandingLink.getState().region;
            if (chosen !== region) {
                region = chosen;
                toward.set(0, 0, 0);
                ids.forEach((id, index) => {
                    if (chosen.includes(id)) toward.add(directions[index]!);
                });
                toward.applyAxisAngle(Z_AXIS, spin.rotation.z);
                aim = chosen.length > 0 && toward.lengthSq() > 1e-6 ? viewAngle(1) - Math.atan2(toward.x, toward.z) : null;
            }
            yaw += aim === null ? dt * 0.1 : Math.atan2(Math.sin(aim - yaw), Math.cos(aim - yaw)) * k;
            spin.rotation.y = yaw;
        },
        pick(ray) {
            let hit = -1;
            if (ray && pillars) {
                // The pillars move (assembly, lift), so the bounds are recomputed for each hit test.
                pillars.mesh.boundingSphere = null;
                hits.length = 0;
                ray.intersectObject(pillars.mesh, false, hits);
                hit = hits[0]?.instanceId ?? -1;
            }
            hover(hit);
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
/// The front row, at expiry, is the familiar hockey stick, in the text tone. The field breathes. A price
/// line follows the pointer across, and the payoff drawing in the copy shows the same price.
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
    const price = own.add(segments(new Array(12).fill(0), palette, 'text', 0.75));
    price.lines.visible = false;
    group.add(price.lines);
    group.rotation.y = -0.35;
    // Station groups are placed along x by `buildStations`; the field's own offset keeps it clear of the copy.
    bars.mesh.position.x = frame.lines.position.x = price.lines.position.x = 0.6;
    let shown: number | null = null;
    const front = 1.4 + gap;
    caption(own, group, 'Underlying price', 0.6, -2.3, front);
    caption(own, group, 'Option value', -1.9, 2.6, front);
    caption(own, group, 'Front row = at expiry', 1.6, 2.6, front);
    caption(own, group, 'Back rows = more time', -1.6, 0.4, -1);
    const ends = [-1.6, front, 2.2, front, -1.6, front, -1.6, 1.4 - rows * gap];
    return {
        group,
        setFade: own.setFade,
        begin: bars.begin,
        update(time, now, pointer, focus) {
            // The pointer's place across the screen is the price, while this station holds the camera.
            const link = useLandingLink.getState();
            const wanted = pointer.hover > 0.5 && focus > 0.9 ? Math.min(1, Math.max(0, (pointer.x + 1) / 2)) : null;
            if (wanted === null ? link.price !== null : link.price === null || Math.abs(wanted - link.price) > 0.004) {
                useLandingLink.setState({ price: wanted });
            }
            const at = useLandingLink.getState().price;
            if (at !== shown) {
                shown = at;
                price.lines.visible = at !== null;
                if (at !== null) {
                    const x = (at - 0.5) * (columns - 1) * gap;
                    // A post at the front row, and a line along the floor into the field.
                    for (let point = 0; point < 4; point += 1) {
                        price.positions[3 * point] = x;
                        price.positions[3 * point + 1] = ends[2 * point]!;
                        price.positions[3 * point + 2] = ends[2 * point + 1]!;
                    }
                    price.commit();
                }
            }
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

/// Capital: a vault of stacked rings of blocks, and a health gauge over it whose needle shows the borrow set
/// on the health-factor calculator in the copy: left is nothing borrowed, right is liquidation.
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
    caption(own, group, 'Collateral vault', 0, -3.3, 0);
    caption(own, group, 'Health factor', 0, -0.3, 0);
    caption(own, group, 'Nothing borrowed', -2.6, 0.1, 0);
    caption(own, group, 'Liquidation', 2.6, 0.1, 0);
    const needle = own.add(solid(new THREE.BoxGeometry(0.07, 2, 0.07), palette, 'text'));
    needle.mesh.position.y = 1;
    const pivot = new THREE.Group();
    pivot.add(needle.mesh);
    gauge.add(pivot);
    const hub = own.add(solid(new THREE.SphereGeometry(0.14, 20, 12), palette, 'text'));
    gauge.add(hub.mesh);
    const tick = clock();
    let angle = from - Math.PI / 2;
    return {
        group,
        setFade: own.setFade,
        begin(now) {
            vault.begin(now);
            dial.begin(now);
        },
        update(time, now) {
            vault.tick(now);
            dial.tick(now);
            // The needle points along the dial; at rest it stands straight up, a quarter turn from angle 0.
            const goal = from + (to - from) * useLandingLink.getState().gauge - Math.PI / 2;
            angle += (goal - angle) * dampFactor(tick(time));
            pivot.rotation.z = angle + Math.sin(time * 0.9) * 0.015;
            group.rotation.y = Math.sin(time * 0.25) * 0.25;
        },
        recolor: own.recolor,
        dispose: own.dispose,
    };
}

/// Social: a solid leader with traders around it. A third of them follow the leader, and pulses travel
/// along those links. Traders near the pointer move out of its way.
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
    const near = new THREE.Vector3();
    caption(own, group, 'Leader', 0, 0.9, 0);
    // The other two ride on a follower and on a trader who follows no one, which both drift.
    const followerTag = caption(own, group, 'Follower', 0, 0, 0);
    const traderTag = caption(own, group, 'Trader, no copy', 0, 0, 0);
    return {
        group,
        setFade: own.setFade,
        begin: traders.begin,
        update(time, now, pointer, focus) {
            const reach = pointer.hover * focus;
            group.worldToLocal(near.copy(pointer.world));
            specs.forEach((spec, index) => {
                const node = nodes[index]!;
                spec.x = node.x;
                spec.y = node.y + 0.18 * Math.sin(0.9 * time + phases[index]!);
                spec.z = node.z;
                if (reach < 0.01) return;
                const dx = spec.x - near.x;
                const dy = spec.y - near.y;
                const dz = spec.z - near.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-3;
                const push = (reach * 0.9 * Math.exp(-distance * distance * 0.6)) / distance;
                spec.x += dx * push;
                spec.y += dy * push;
                spec.z += dz * push;
            });
            traders.tick(now);
            followerTag.sprite.position.set(specs[0]!.x, specs[0]!.y + 0.55, specs[0]!.z);
            traderTag.sprite.position.set(specs[count - 1]!.x, specs[count - 1]!.y + 0.55, specs[count - 1]!.z);
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
/// network is a smaller block. A scan walks the deployed ones, lighting one block at a time. Hovering a
/// contract in the copy lights its block and holds the scan; hovering a block marks its row in the copy.
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
    const low = -((rows - 1) / 2) * gap - 1;
    caption(own, group, 'Block = one contract', -1.4, low, 0.4);
    caption(own, group, 'Lit = being checked', 1.4, low, 0.4);
    if (deployed.some((value) => !value)) caption(own, group, 'Small = not deployed', 0, low - 0.8, 0.4);
    const live = deployed.map((value, index) => (value ? index : -1)).filter((index) => index >= 0);
    let lit = -1;
    let picked = -1;
    const hits: THREE.Intersection[] = [];
    return {
        group,
        setFade: own.setFade,
        begin: blocks.begin,
        update(time, now) {
            blocks.tick(now);
            const chosen = useLandingLink.getState().contract;
            const next = chosen >= 0 && chosen < deployed.length ? chosen : live.length > 0 ? live[Math.floor(time * 2.2) % live.length]! : -1;
            if (next !== lit) {
                if (lit >= 0) blocks.tint(lit, 'muted');
                if (next >= 0) blocks.tint(next, 'text');
                lit = next;
            }
            group.rotation.y = 0.25 + Math.sin(time * 0.2) * 0.15;
        },
        // Writes only when its own hit changes, so a row hovered in the copy is not cleared by a miss here.
        pick(ray) {
            let hit = -1;
            if (ray) {
                blocks.mesh.boundingSphere = null;
                hits.length = 0;
                ray.intersectObject(blocks.mesh, false, hits);
                hit = hits[0]?.instanceId ?? -1;
            }
            if (hit === picked) return;
            picked = hit;
            useLandingLink.setState({ contract: hit });
        },
        recolor() {
            own.recolor();
            if (lit >= 0) blocks.tint(lit, 'text');
        },
        dispose: own.dispose,
    };
}

/// Vision: the Start mark again (`wireMark`), inside a ring of ticks that faces the camera. A click sends a
/// pulse once around the ring.
function resolved(palette: Palette, detail: number): Station {
    const own = bag();
    const group = new THREE.Group();
    const mark = wireMark(own, palette, detail, new THREE.Euler(0.6, 0, 0.18));
    group.add(mark.object);
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
    const ring = own.add(voxelField(tickSpecs, palette, { size: 0.1, live: true }));
    group.add(ring.mesh);
    caption(own, group, 'The HUME mark', 0, 0, 0);
    caption(own, group, 'Click to send a pulse', 0, -4.4, 0);
    const heights = tickSpecs.map((spec) => spec.sy!);
    let pulsed = -1;
    return {
        group,
        setFade: own.setFade,
        begin(now) {
            mark.begin(now);
            ring.begin(now);
        },
        update(time, now, pointer, focus) {
            mark.update(time, now, pointer, focus);
            // The pulse's head goes once round the ring in 1.2 s; each tick swells as the head passes it.
            const head = pulsed < 0 ? -1 : (now - pulsed) / 1.2;
            if (head > 1.15) pulsed = -1;
            tickSpecs.forEach((spec, index) => {
                const behind = head - index / tickSpecs.length;
                spec.sy = heights[index]! * (behind >= 0 && behind < 0.15 ? 1 + 1.6 * Math.exp(-behind * 30) : 1);
            });
            ring.tick(now);
            ring.mesh.rotation.z = time * 0.03;
        },
        poke(now) {
            pulsed = now;
        },
        recolor: own.recolor,
        dispose: own.dispose,
    };
}

/// The seven stations in section order, each placed on the path. `detail` scales instance counts down on a
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
    // The stations were sized for a camera 12 to 15 units away; the path stands 10.5 away, so each is scaled
    // to keep the size it had on screen.
    const fit = [0.78, 0.875, 0.84, 0.84, 0.84, 0.84, 0.62];
    const captions: THREE.Object3D[] = [];
    stations.forEach((station, index) => {
        station.group.position.copy(stationPosition(index));
        station.group.scale.multiplyScalar(fit[index] ?? 1);
        // A caption keeps the size it would have on a station fitted at 0.84.
        station.group.traverse((part) => {
            if (!part.userData.caption) return;
            part.scale.multiplyScalar(0.84 / (fit[index] ?? 1));
            part.userData.base = part.scale.clone();
            captions.push(part);
        });
    });
    return {
        stations,
        captions,
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
    // The lines are the muted tone, which is dark on light and light on dark; on the near-black ground they
    // need more opacity than on ivory to read, and the text tone is the lighter of the two there.
    const opacity = () => (palette.text.r > 0.5 ? 0.65 : 0.22);
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
        uOpacity: { value: opacity() },
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
            uniforms.uOpacity.value = opacity();
        },
        dispose() {
            geometry.dispose();
            material.dispose();
        },
    };
}
