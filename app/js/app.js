import "https://cdnjs.cloudflare.com/ajax/libs/three.js/r122/three.min.js"
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";

var camera, scene, renderer, controls
var levelCounter = document.querySelector("#levelCounter")


const geometryCache = new Map();
const sierpinskiCache = new Map();

// initial math algo without memoization credits to Wyatt Newberry
function half(p1, p2) {
    var hp = new THREE.Vector3(0, 0, 0).addVectors(p1, p2);
    hp.divideScalar(2);
    return hp;
}

var sin_PI_3 = Math.sin(Math.PI / 3);
function build(level, side, v0, geometry) {
    if (geometry == null) geometry = new THREE.Geometry();

    const cacheKey = `${level}-${side}-${v0.x}-${v0.y}-${v0.z}`;

    // Check if the result is already in the cache
    if (geometryCache.has(cacheKey)) {
        return geometryCache.get(cacheKey);
    }

    var v1 = new THREE.Vector3().copy(v0);
    v1.x += side;
    var v2 = new THREE.Vector3().copy(v0);
    v2.x += (v1.x - v0.x) / 2;
    v2.y += side * sin_PI_3;
    v2.z += side / (sin_PI_3 * 4);
    var v3 = new THREE.Vector3().copy(v0);
    v3.x = v2.x;
    v3.z += side * sin_PI_3;

    if (level === 1) {
        var v0_i = geometry.vertices.length;
        geometry.vertices.push(v0);
        geometry.vertices.push(v1);
        geometry.vertices.push(v2);
        geometry.vertices.push(v3);

        geometry.faces.push(new THREE.Face3(v0_i + 0, v0_i + 2, v0_i + 1));
        geometry.faces.push(new THREE.Face3(v0_i + 1, v0_i + 2, v0_i + 3));
        geometry.faces.push(new THREE.Face3(v0_i + 3, v0_i + 2, v0_i + 0));
        geometry.faces.push(new THREE.Face3(v0_i + 0, v0_i + 1, v0_i + 3));
    } else {
        var hside = side / 2;
        build(level - 1, hside, v0, geometry);
        var v01 = half(v0, v1);
        build(level - 1, hside, v01, geometry);
        var v02 = half(v0, v2);
        build(level - 1, hside, v02, geometry);
        var v03 = half(v0, v3);
        build(level - 1, hside, v03, geometry);
    }

    // Store the result in the cache
    geometryCache.set(cacheKey, geometry);
    return geometry;
}

const tMaterial = {
    clearcoat: 1.0,
    metalness: 1.0,
    roughness: 0.5,
    color: 0xaa8844,
    wireframe: true,
};

function sierpinski(level, side) {
    var geometry = build(level, side, new THREE.Vector3(-side / 2, 0, -side / (sin_PI_3 * 4)));
    geometry.computeFaceNormals();
    var material = new THREE.MeshPhysicalMaterial(tMaterial);
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function memoized(level, side) {
    const key = `${level}:${side}`;
    if (sierpinskiCache.has(key)) {
        return sierpinskiCache.get(key);
    }
    const result = sierpinski(level, side);
    sierpinskiCache.set(key, result);
    return result;
}

function resizeCanvasToDisplaySize(force) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (force || canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

var level = 2;
var side = 500
var stop = true;

var trismegistus
initialize();
animate();

function setTrismegistus(scene, trismegistus) {
    scene.add(trismegistus);
    var axis = new THREE.Vector3(0, 1, 0);
    var angle = 60 * (Math.PI / 180);
    trismegistus.quaternion.setFromAxisAngle(axis, angle);
}

function initialize() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, -100);
    camera.position.x = 0;
    camera.position.y = 1200;
    camera.position.z = 0;

    scene = new THREE.Scene();

    var bottomLight = new THREE.PointLight(0xffffff, 10);
    bottomLight.position.set(0, 1000, 0);
    scene.add(bottomLight);

    var topLight = new THREE.PointLight(0xffffff, 1);
    topLight.position.set(0, -1000, 0);
    scene.add(topLight);

    trismegistus = memoized(level, side);
    setTrismegistus(scene, trismegistus)

    const canvas = document.querySelector('#canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    controls = new OrbitControls(camera, renderer.domElement);
}

function animate() {
    resizeCanvasToDisplaySize(true);
    requestAnimationFrame(animate);
    render();
}

function render() {
    if (!stop) {
        var interval = Date.now() * 0.0001;
        for (var i = 0, l = scene.children.length; i < l; i++) {
            var obj = scene.children[i];
            obj.rotation.y = interval * 4;
        }
    }
    renderer.render(scene, camera);
}

document.querySelector('#incLev_button').addEventListener('click', incLev)
document.querySelector('#decLev_button').addEventListener('click', decLev)
document.querySelector('#toggleRot_button').addEventListener('click', toggleRot)

function toggleRot() {
    if (!stop) {
        stop = true;
    }
    else {
        stop = false;
    }
}
function incLev() {
    scene.remove(trismegistus);
    level += 1;
    trismegistus = memoized(level, side);
    setTrismegistus(scene, trismegistus);
    levelCounter.innerHTML = level - 1
}

function decLev() {
    if (level > 1) {
        scene.remove(trismegistus);
        level -= 1;
        trismegistus = memoized(level, side);
        setTrismegistus(scene, trismegistus);
        levelCounter.innerHTML = level - 1
    }
    else {
        alert("Level cannot be less than 0");
    }

}