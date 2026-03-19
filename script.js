// Initialize Three.js Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF4A460); // Desert sand color

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Camera position (first-person view)
camera.position.set(0, 1.5, 0);

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(100, 200, 100);
sunLight.castShadow = true;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Game variables
let distance = 0;
let isPaused = false;
let currentBiome = 'desert';
let roadSegments = [];
let biomeDistance = 0;
let speed = 0.5;
const BIOME_CHANGE_DISTANCE = 5000; // Change biome every 5km

// Biome definitions
const biomes = {
    desert: {
        skyColor: 0xF4A460,
        roadColor: 0x8B7355,
        name: 'Desert'
    },
    forest: {
        skyColor: 0x87CEEB,
        roadColor: 0x333333,
        name: 'Forest'
    },
    snow: {
        skyColor: 0xE0F6FF,
        roadColor: 0xFFFFFF,
        name: 'Snow'
    },
    ocean: {
        skyColor: 0x00BFFF,
        roadColor: 0x2F4F7F,
        name: 'Ocean'
    }
};

const biomeArray = Object.keys(biomes);

// Create infinite road
function createRoadSegment(zOffset) {
    const roadGeometry = new THREE.PlaneGeometry(8, 100);
    const roadMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(biomes[currentBiome].roadColor),
        shininess: 0
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    
    road.rotation.x = -Math.PI / 2;
    road.position.z = zOffset;
    road.receiveShadow = true;
    
    scene.add(road);
    roadSegments.push(road);
    
    return road;
}

// Create initial road segments
for (let i = 0; i < 10; i++) {
    createRoadSegment(i * 100);
}

// Update biome
function updateBiome() {
    biomeDistance += speed / 50; // Increment based on speed
    
    if (biomeDistance >= BIOME_CHANGE_DISTANCE) {
        const currentIndex = biomeArray.indexOf(currentBiome);
        const nextIndex = (currentIndex + 1) % biomeArray.length;
        currentBiome = biomeArray[nextIndex];
        biomeDistance = 0;
        
        // Update UI
        document.getElementById('biome-indicator').textContent = `Biome: ${biomes[currentBiome].name}`;
        
        // Update scene
        scene.background = new THREE.Color(biomes[currentBiome].skyColor);
    }
}

// Audio setup using Web Audio API
let musicEnabled = true;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Simple engine sound effect
function playEngineSound() {
    if (musicEnabled && audioContext.state === 'running') {
        try {
            const now = audioContext.currentTime;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = 80 + Math.random() * 20;
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {
            console.log('Audio error:', e);
        }
    }
}

// Play ambient music (using oscillator)
let ambientOsc = null;
function playAmbientMusic() {
    if (musicEnabled && audioContext.state === 'running' && !ambientOsc) {
        try {
            const now = audioContext.currentTime;
            ambientOsc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            ambientOsc.connect(gain);
            gain.connect(audioContext.destination);
            
            ambientOsc.frequency.value = 60; // Low frequency for calm music
            gain.gain.setValueAtTime(0.02, now);
            
            ambientOsc.start();
        } catch (e) {
            console.log('Audio error:', e);
        }
    }
}

function stopAmbientMusic() {
    if (ambientOsc) {
        try {
            ambientOsc.stop();
            ambientOsc = null;
        } catch (e) {
            console.log('Error stopping music:', e);
        }
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Controls
document.getElementById('mute-btn').addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
        document.getElementById('mute-btn').textContent = '🔊 Sound';
        playAmbientMusic();
    } else {
        document.getElementById('mute-btn').textContent = '🔇 Muted';
        stopAmbientMusic();
    }
});

document.getElementById('pause-btn').addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        document.getElementById('pause-btn').textContent = '▶ Resume';
        stopAmbientMusic();
    } else {
        document.getElementById('pause-btn').textContent = '⏸ Pause';
        if (musicEnabled) {
            playAmbientMusic();
        }
    }
});

document.getElementById('restart-btn').addEventListener('click', () => {
    distance = 0;
    biomeDistance = 0;
    currentBiome = 'desert';
    camera.position.z = 0;
    scene.background = new THREE.Color(biomes[currentBiome].skyColor);
    document.getElementById('biome-indicator').textContent = `Biome: ${biomes[currentBiome].name}`;
    document.getElementById('distance-counter').textContent = 'Distance: 0 km';
});

// Start ambient music on first interaction
document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (musicEnabled && !isPaused) {
        playAmbientMusic();
    }
}, { once: true });

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (!isPaused) {
        // Move camera forward (driving)
        camera.position.z -= speed;
        distance += speed;
        
        // Play engine sound occasionally
        if (Math.random() > 0.92) {
            playEngineSound();
        }
        
        // Update biome
        updateBiome();
        
        // Generate new road segments
        if (roadSegments.length > 0) {
            const lastSegment = roadSegments[roadSegments.length - 1];
            if (lastSegment.position.z > camera.position.z - 500) {
                createRoadSegment(lastSegment.position.z + 100);
            }
        }
        
        // Remove old road segments
        roadSegments = roadSegments.filter(segment => {
            if (segment.position.z < camera.position.z - 1000) {
                scene.remove(segment);
                return false;
            }
            return true;
        });
        
        // Update UI
        const distanceKm = (distance / 100).toFixed(1);
        document.getElementById('distance-counter').textContent = `Distance: ${distanceKm} km`;
    }
    
    renderer.render(scene, camera);
}

// Start the game
animate();
playAmbientMusic();
