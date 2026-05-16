import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

// ==========================================
// 1. VARIÁVEIS GLOBAIS DE ANIMAÇÃO
// ==========================================
let mixer; // Responsável por controlar as animações do modelo
let actions = {}; // Guardará cada animação mapeada pelo nome
let activeAction; // A animação que está rodando no momento
const clock = new THREE.Clock(); // Necessário para calcular o tempo dos frames

// ==========================================
// 2. CONFIGURAÇÃO DA CENA, CÂMERA E RENDER
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.2, 3.0); // Enquadramento focado no paciente

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0); 

// ==========================================
// 3. ILUMINAÇÃO REFORÇADA
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
mainLight.position.set(5, 10, 7);
mainLight.castShadow = true;
scene.add(mainLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
backLight.position.set(-5, 5, -5);
scene.add(backLight);

// Adiciona um chão simples com grade para dar noção de movimento/espaço
const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
scene.add(grid);

// ==========================================
// 4. CARREGAR MODELO E CONFIGURAR INTERFACE (GUI)
// ==========================================
const loader = new GLTFLoader();

loader.load('paciente_1.glb', (gltf) => {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    
    model.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    scene.add(model);

    // Se o modelo tiver animações salvas...
    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        
        // Criar o menu visual no canto da tela
        const gui = new GUI({ title: 'Movimentos do GLB' });
        const animationFolder = gui.addFolder('Animações Disponíveis');
        
        // Objeto auxiliar para controlar os botões na interface
        const playlist = {
            'Parar Tudo': () => { if(activeAction) activeAction.stop(); }
        };

        // Mapeia todas as animações encontradas no arquivo
        gltf.animations.forEach((clip) => {
            // Guarda a ação da animação
            actions[clip.name] = mixer.clipAction(clip);
            
            // Cria uma função/botão no menu com o nome da animação do Blender
            playlist[clip.name] = () => {
                mudarParaAnimacao(clip.name);
            };
            
            // Adiciona o botão correspondente no menu lateral
            animationFolder.add(playlist, clip.name).name('▶ ' + clip.name);
        });

        animationFolder.add(playlist, 'Parar Tudo').name('⏹ Parar Tudo');
        animationFolder.open();

        // Toca a primeira animação da lista por padrão para testar
        mudarParaAnimacao(gltf.animations[0].name);
    } else {
        console.warn("Nenhuma animação foi encontrada dentro deste arquivo .glb!");
        alert("O modelo carregou, mas não foram encontradas trilhas de animação (clips) nele.");
    }
}, 
(xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% carregado');
}, 
(error) => {
    console.error('Erro ao carregar o modelo:', error);
});

// ==========================================
// 5. FUNÇÃO PARA TRANSIÇÃO SUAVE ENTRE MOVIMENTOS
// ==========================================
function mudarParaAnimacao(nomeAnimacao) {
    const novaAcao = actions[nomeAnimacao];
    if (!novaAcao) return;

    if (activeAction) {
        // Faz uma transição suave (crossfade) de 0.5 segundos entre a animação antiga e a nova
        activeAction.fadeOut(0.5);
    }

    novaAcao.reset();
    novaAcao.fadeIn(0.5);
    novaAcao.play();
    
    activeAction = novaAcao;
}

// ==========================================
// 6. LOOP DE ATUALIZAÇÃO (ANIMATE)
// ==========================================
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta(); // Tempo que passou desde o último frame
    
    // Se o mixer existir, ele atualiza a posição dos ossos/malha do paciente
    if (mixer) mixer.update(delta);
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
