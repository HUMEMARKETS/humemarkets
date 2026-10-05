import * as THREE from 'three';

export interface Palette {
    text: THREE.Color;
    muted: THREE.Color;
    accent: THREE.Color;
}

interface Part {
    material: THREE.LineBasicMaterial;
    base: number;
    tab: number | null;
    rest: THREE.Color;
}

export interface SceneHandle {
    group: THREE.Group;
    /// One world-space anchor per tab, where that tab's hotspot sits.
    anchors: THREE.Object3D[];
    /// The lines the pointer can hover; each carries its tab in `userData.tab`.
    pickables: THREE.LineSegments[];
    /// Radians per second of the slow turn the whole group makes while motion is on.
    spin: number;
    /// Resting scale, so a wide scene can sit inside the same frame as a compact one.
    size: number;
    idle(time: number, motion: number): void;
    look(fade: number, active: number, hover: number | null): void;
    dispose(): void;
}

/// Line segments along both parametric directions of a grid geometry whose vertices are laid out
/// row by row (`row * (cols + 1) + col`), which holds for the torus, torus knot, sphere and plane
/// geometries three ships. Drawing the two directions only, not the triangle diagonals, is what
/// gives the engraved look of the reference.
function gridSegments(
    geometry: THREE.BufferGeometry,
    rows: number,
    cols: number,
    rowStep: number,
    colStep: number,
): Float32Array {
    const position = geometry.getAttribute('position');
    const out: number[] = [];
    const push = (a: number, b: number) =>
        out.push(
            position.getX(a),
            position.getY(a),
            position.getZ(a),
            position.getX(b),
            position.getY(b),
            position.getZ(b),
        );
    const stride = cols + 1;
    for (let row = 0; row <= rows; row += rowStep) {
        for (let col = 0; col < cols; col += 1) {
            push(row * stride + col, row * stride + col + 1);
        }
    }
    for (let col = 0; col <= cols; col += colStep) {
        for (let row = 0; row < rows; row += 1) {
            push(row * stride + col, (row + 1) * stride + col);
        }
    }
    return new Float32Array(out);
}

function rectSegments(
    width: number,
    height: number,
    z: number,
    out: number[],
): void {
    const x = width / 2;
    const y = height / 2;
    out.push(-x, -y, z, x, -y, z);
    out.push(x, -y, z, x, y, z);
    out.push(x, y, z, -x, y, z);
    out.push(-x, y, z, -x, -y, z);
}

function boxSegments(size: number): Float32Array {
    const geometry = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(size, size, size),
    );
    const copy = Float32Array.from(
        geometry.getAttribute('position').array as Float32Array,
    );
    geometry.dispose();
    return copy;
}

function edgeSegments(source: THREE.BufferGeometry): Float32Array {
    const edges = new THREE.EdgesGeometry(source);
    const copy = Float32Array.from(
        edges.getAttribute('position').array as Float32Array,
    );
    edges.dispose();
    source.dispose();
    return copy;
}

function createBuilder(palette: Palette) {
    const group = new THREE.Group();
    const parts: Part[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const pickables: THREE.LineSegments[] = [];

    function add(
        parent: THREE.Object3D,
        positions: Float32Array,
        options: { tab: number | null; base: number; color: THREE.Color },
    ): THREE.LineSegments {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3),
        );
        const material = new THREE.LineBasicMaterial({
            color: options.color,
            transparent: true,
            opacity: options.base,
            depthWrite: false,
        });
        const lines = new THREE.LineSegments(geometry, material);
        lines.userData.tab = options.tab;
        lines.frustumCulled = false;
        parent.add(lines);
        geometries.push(geometry);
        parts.push({
            material,
            base: options.base,
            tab: options.tab,
            rest: options.color,
        });
        if (options.tab !== null) pickables.push(lines);
        return lines;
    }

    function finish(
        anchors: THREE.Object3D[],
        spin: number,
        size: number,
        idle: (time: number, motion: number) => void,
    ): SceneHandle {
        return {
            group,
            anchors,
            pickables,
            spin,
            size,
            idle,
            look(fade, active, hover) {
                for (const part of parts) {
                    const hot = part.tab !== null && part.tab === hover;
                    const current = part.tab !== null && part.tab === active;
                    const emphasis =
                        part.tab === null ? 1 : hot ? 1 : current ? 0.85 : 0.4;
                    part.material.opacity = Math.min(
                        1,
                        part.base * fade * emphasis * (hot ? 1.8 : 1),
                    );
                    part.material.color
                        .copy(part.rest)
                        .lerp(palette.accent, hot ? 0.8 : current ? 0.35 : 0);
                }
            },
            dispose() {
                for (const geometry of geometries) geometry.dispose();
                for (const part of parts) part.material.dispose();
            },
        };
    }

    return { group, add, finish };
}

function anchorAt(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
): THREE.Object3D {
    const anchor = new THREE.Object3D();
    anchor.position.set(x, y, z);
    parent.add(anchor);
    return anchor;
}

/// 00, the beginning: a dense torus knot.
function knotScene(palette: Palette): SceneHandle {
    const { group, add, finish } = createBuilder(palette);
    const knot = new THREE.TorusKnotGeometry(1.15, 0.36, 260, 40, 2, 3);
    add(group, gridSegments(knot, 260, 40, 2, 1), {
        tab: null,
        base: 0.5,
        color: palette.text,
    });
    knot.dispose();
    group.rotation.x = 0.35;
    return finish([], 0.16, 1, () => undefined);
}

/// 01, perpetuals: three doors, each a tunnel of nested frames.
function doorsScene(palette: Palette): SceneHandle {
    const { group, add, finish } = createBuilder(palette);
    const anchors: THREE.Object3D[] = [];
    const doors: THREE.Group[] = [];
    for (let index = 0; index < 3; index += 1) {
        const door = new THREE.Group();
        door.position.set((index - 1) * 2.35, -0.1, 0);
        door.rotation.y = (1 - index) * 0.2;
        const lines: number[] = [];
        const depth = 7;
        for (let step = 0; step < depth; step += 1) {
            const inset = step * 0.13;
            rectSegments(1.7 - inset * 1.5, 3.5 - inset * 1.5, -step * 0.2, lines);
        }
        const front = [
            [-0.85, -1.75],
            [0.85, -1.75],
            [0.85, 1.75],
            [-0.85, 1.75],
        ] as const;
        const back = (depth - 1) * 0.13;
        for (const [x, y] of front) {
            lines.push(
                x,
                y,
                0,
                x * (1 - (back * 1.5) / 1.7),
                y * (1 - (back * 1.5) / 3.5),
                -(depth - 1) * 0.2,
            );
        }
        lines.push(-1.1, -1.75, 0.02, 1.1, -1.75, 0.02);
        add(door, new Float32Array(lines), {
            tab: index,
            base: 0.55,
            color: palette.text,
        });
        group.add(door);
        doors.push(door);
        anchors.push(anchorAt(door, index === 0 ? 0.85 : index === 1 ? 0.5 : 0, 0.4, 0.05));
    }
    group.rotation.x = 0.08;
    return finish(anchors, 0, 0.74, (time, motion) => {
        doors.forEach((door, index) => {
            door.rotation.y =
                (1 - index) * 0.2 + Math.sin(time * 0.5 + index) * 0.06 * motion;
        });
    });
}

/// 02, options: three nested spheres around a cube.
function sphereScene(palette: Palette): SceneHandle {
    const { group, add, finish } = createBuilder(palette);
    const radii = [1.9, 1.45, 1.0];
    radii.forEach((radius, tab) => {
        const sphere = new THREE.SphereGeometry(radius, 48, 24);
        add(group, gridSegments(sphere, 24, 48, 2, 3), {
            tab,
            base: 0.5,
            color: palette.text,
        });
        sphere.dispose();
    });
    add(group, boxSegments(0.75), { tab: 2, base: 0.9, color: palette.text });
    const axis = new Float32Array([0, -2.05, 0, 0, 2.05, 0]);
    add(group, axis, { tab: null, base: 0.6, color: palette.muted });
    const anchors = [
        anchorAt(group, ...unit(-0.95, 0.15, 0.27, 1.9)),
        anchorAt(group, ...unit(0.55, 0.85, 0.2, 1.45)),
        anchorAt(group, ...unit(0.6, -0.5, 0.6, 1.0)),
    ];
    group.rotation.x = 0.2;
    return finish(anchors, 0.12, 1, () => undefined);
}

function unit(
    x: number,
    y: number,
    z: number,
    radius: number,
): [number, number, number] {
    const length = Math.hypot(x, y, z);
    return [(x / length) * radius, (y / length) * radius, (z / length) * radius];
}

/// 03, one vault: three rings turning around a shared core.
function vaultScene(palette: Palette): SceneHandle {
    const { group, add, finish } = createBuilder(palette);
    const radii = [1.95, 1.5, 1.05];
    const tilts: [number, number][] = [
        [0.5, 0],
        [-0.4, 0.9],
        [0.9, -0.7],
    ];
    const speeds: [number, number][] = [
        [0.12, 0.05],
        [-0.1, 0.09],
        [0.08, -0.13],
    ];
    const pivots: THREE.Group[] = [];
    const anchors: THREE.Object3D[] = [];
    radii.forEach((radius, tab) => {
        const pivot = new THREE.Group();
        const ring = new THREE.TorusGeometry(radius, 0.06, 8, 110);
        add(pivot, gridSegments(ring, 8, 110, 1, 3), {
            tab,
            base: 0.6,
            color: palette.text,
        });
        ring.dispose();
        anchors.push(anchorAt(pivot, radius, 0, 0));
        group.add(pivot);
        pivots.push(pivot);
    });
    add(group, edgeSegments(new THREE.OctahedronGeometry(0.62)), {
        tab: null,
        base: 0.9,
        color: palette.text,
    });
    return finish(anchors, 0, 0.92, (time, motion) => {
        pivots.forEach((pivot, index) => {
            const [tiltX, tiltY] = tilts[index] ?? [0, 0];
            const [speedX, speedY] = speeds[index] ?? [0, 0];
            pivot.rotation.set(
                tiltX + time * speedX * motion,
                tiltY + time * speedY * motion,
                0,
            );
        });
    });
}

/// 04, make your move: a wire terrain with a small solid hovering over it.
function terrainScene(palette: Palette): SceneHandle {
    const { group, add, finish } = createBuilder(palette);
    const plane = new THREE.PlaneGeometry(7, 7, 42, 42);
    const position = plane.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        position.setZ(
            index,
            0.45 * Math.sin(x * 0.9) * Math.cos(y * 0.8) +
                0.2 * Math.sin(x * 2.1 + y * 1.7),
        );
    }
    const terrain = new THREE.Group();
    add(terrain, gridSegments(plane, 42, 42, 1, 1), {
        tab: null,
        base: 0.45,
        color: palette.text,
    });
    plane.dispose();
    terrain.rotation.x = -Math.PI / 2.15;
    terrain.position.y = -0.9;
    group.add(terrain);
    const marker = new THREE.Group();
    marker.position.y = 1.25;
    add(marker, edgeSegments(new THREE.OctahedronGeometry(0.55)), {
        tab: null,
        base: 0.95,
        color: palette.text,
    });
    group.add(marker);
    return finish([], 0.05, 0.62, (time, motion) => {
        marker.rotation.y = time * 0.5 * motion;
        marker.position.y = 1.25 + Math.sin(time * 0.9) * 0.08 * motion;
    });
}

/// One scene per landing section, in section order.
export function buildScenes(palette: Palette): SceneHandle[] {
    return [
        knotScene(palette),
        doorsScene(palette),
        sphereScene(palette),
        vaultScene(palette),
        terrainScene(palette),
    ];
}

/// The disc, tick ring and distant grid every scene stands on.
export function buildFloor(palette: Palette) {
    const group = new THREE.Group();
    group.position.y = -2.15;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    function lines(positions: number[], opacity: number): THREE.LineSegments {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(positions), 3),
        );
        const material = new THREE.LineBasicMaterial({
            color: palette.text,
            transparent: true,
            opacity,
            depthWrite: false,
        });
        geometries.push(geometry);
        materials.push(material);
        return new THREE.LineSegments(geometry, material);
    }

    function circle(radius: number, segments: number): number[] {
        const out: number[] = [];
        for (let index = 0; index < segments; index += 1) {
            const a = (index / segments) * Math.PI * 2;
            const b = ((index + 1) / segments) * Math.PI * 2;
            out.push(
                Math.cos(a) * radius,
                0,
                Math.sin(a) * radius,
                Math.cos(b) * radius,
                0,
                Math.sin(b) * radius,
            );
        }
        return out;
    }

    group.add(lines(circle(3.3, 160), 0.5));
    group.add(lines(circle(4.1, 160), 0.2));
    const tickPositions: number[] = [];
    for (let index = 0; index < 120; index += 1) {
        const angle = (index / 120) * Math.PI * 2;
        const long = index % 5 === 0;
        const inner = 4.2;
        const outer = long ? 4.5 : 4.36;
        tickPositions.push(
            Math.cos(angle) * inner,
            0,
            Math.sin(angle) * inner,
            Math.cos(angle) * outer,
            0,
            Math.sin(angle) * outer,
        );
    }
    const ticks = lines(tickPositions, 0.35);
    group.add(ticks);

    const grid = new THREE.GridHelper(20, 20, palette.muted, palette.muted);
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.09;
    gridMaterial.depthWrite = false;
    group.add(grid);

    return {
        group,
        update(time: number, motion: number) {
            ticks.rotation.y = time * 0.02 * motion;
        },
        dispose() {
            for (const geometry of geometries) geometry.dispose();
            for (const material of materials) material.dispose();
            grid.geometry.dispose();
            gridMaterial.dispose();
        },
    };
}
