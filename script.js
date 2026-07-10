// =======================================================
// Quiz Story - Meganthropus
// script.js (LENGKAP - versi ES Module)
// =======================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// -----------------------------
// ELEMENT
// -----------------------------

const canvas = document.getElementById("three-canvas");
const loading = document.getElementById("loading-screen");
const dialogText = document.getElementById("dialogText");
const speaker = document.getElementById("speaker");
const nextButton = document.getElementById("nextButton");
const choiceBox = document.getElementById("choiceBox");
const choiceButtons = document.querySelectorAll(".choiceBtn");
const resultPopup = document.getElementById("resultPopup");
const resultTitle = document.getElementById("resultTitle");
const resultExplanation = document.getElementById("resultExplanation");
const continueButton = document.getElementById("continueButton");
const scoreValue = document.getElementById("scoreValue");
const chapter = document.getElementById("chapter");
const endingScreen = document.getElementById("endingScreen");
const finalScore = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");
const fade = document.getElementById("fade");

// -----------------------------
// THREE JS
// -----------------------------

let scene;
let camera;
let renderer;
let light;
let controls;
let loader;
let clock = new THREE.Clock();

let mixerPlayer = null;
let mixerEnemy = null;

let meganthropus = null;
let babi = null;

// -----------------------------
// STORY
// -----------------------------

let story = [];
let currentScene = 0;
let dialogIndex = 0;
let score = 0;
let isAnswered = false;

// =======================================================
// INIT
// =======================================================

initThree();
loadStory();
animate();

// =======================================================
// THREE SETUP
// =======================================================

function initThree(){

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    camera.position.set(0, 1.8, 4);

    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.target.set(0, 1, 0);
    controls.update();

    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambient);

    // Directional
    light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(5, 10, 5);
    scene.add(light);

    loader = new GLTFLoader();
}

// =======================================================
// LOAD STORY JSON
// =======================================================

async function loadStory(){
    const response = await fetch("story.json");
    story = await response.json();
    loadScene(0);
}

// =======================================================
// LOAD SCENE
// =======================================================

function loadScene(index){

    loading.style.display = "flex";
    choiceBox.style.display = "none";
    resultPopup.style.display = "none";
    nextButton.style.display = "block";

    dialogIndex = 0;
    currentScene = index;
    isAnswered = false;

    const data = story[index];
    chapter.innerHTML = "Chapter " + (index + 1);

    // background
    new THREE.TextureLoader().load(
        "assets/images/" + data.background,
        (texture) => {
            scene.background = texture;
        }
    );

    // buang model lama
    clearModels();

    let loadedCount = 0;
    function checkDone(){
        loadedCount++;
        if(loadedCount >= 2){
            loading.style.display = "none";
            fade.classList.remove("active");
            showDialog();
        }
    }

    loader.load(
        "assets/model/" + data.player,
        (gltf) => {
            meganthropus = gltf.scene;
            meganthropus.position.x = -0.8;
            scene.add(meganthropus);
            playAnimation(gltf, "player");
            checkDone();
        }
    );

    loader.load(
        "assets/model/" + data.enemy,
        (gltf) => {
            babi = gltf.scene;
            babi.position.x = 1.2;
            scene.add(babi);
            playAnimation(gltf, "enemy");
            checkDone();
        }
    );
}

// =======================================================
// HAPUS MODEL LAMA DARI SCENE
// =======================================================

function clearModels(){
    if(meganthropus){
        scene.remove(meganthropus);
        meganthropus = null;
    }
    if(babi){
        scene.remove(babi);
        babi = null;
    }
    mixerPlayer = null;
    mixerEnemy = null;
}

// =======================================================
// JALANKAN ANIMASI (JIKA GLB PUNYA ANIMATION CLIP)
// =======================================================

function playAnimation(gltf, who){
    if(!gltf.animations || gltf.animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations[0]).play();

    if(who === "player"){
        mixerPlayer = mixer;
    }else{
        mixerEnemy = mixer;
    }
}

// =======================================================
// DIALOG
// =======================================================

function showDialog(){
    const data = story[currentScene];
    speaker.innerHTML = data.speaker;
    typeWriter(data.dialog[dialogIndex]);
}

// =======================================================
// TYPE EFFECT
// =======================================================

function typeWriter(text){
    dialogText.innerHTML = "";
    let i = 0;
    const interval = setInterval(() => {
        dialogText.innerHTML += text.charAt(i);
        i++;
        if(i >= text.length){
            clearInterval(interval);
        }
    }, 25);
}

// =======================================================
// NEXT
// =======================================================

nextButton.onclick = () => {
    const data = story[currentScene];
    dialogIndex++;

    if(dialogIndex < data.dialog.length){
        showDialog();
    }else{
        showQuestion();
    }
};

// =======================================================
// QUESTION
// =======================================================

function showQuestion(){
    dialogText.innerHTML = "";
    speaker.innerHTML = "Pertanyaan";
    nextButton.style.display = "none";
    choiceBox.style.display = "flex";

    const q = story[currentScene].question;
    dialogText.innerHTML = q.text;

    choiceButtons.forEach((btn, i) => {
        btn.innerHTML = q.answers[i].text;
        btn.onclick = () => selectAnswer(i);
    });
}

// =======================================================
// PILIH JAWABAN
// =======================================================

function selectAnswer(i){
    if(isAnswered) return;
    isAnswered = true;

    const q = story[currentScene].question;
    const answer = q.answers[i];

    choiceBox.style.display = "none";

    if(answer.correct){
        score += 10;
        scoreValue.innerHTML = score;
        // Meganthropus menyerang, babi mati
        swapModel("assets/model/meganthropus-attack.glb", "assets/model/babi-death.glb");
    }else{
        // Babi menyerang, meganthropus kalah
        swapModel("assets/model/meganthropus-defeat.glb", "assets/model/babi-nyerang.glb");
    }

    // beri jeda supaya animasi kelihatan dulu sebelum popup muncul
    setTimeout(() => {
        showResult(answer);
    }, 1200);
}

// =======================================================
// GANTI MODEL SAAT JAWAB (attack / defeat / death / nyerang)
// =======================================================

function swapModel(playerFile, enemyFile){
    clearModels();

    loader.load(playerFile, (gltf) => {
        meganthropus = gltf.scene;
        meganthropus.position.x = -0.8;
        scene.add(meganthropus);
        playAnimation(gltf, "player");
    });

    loader.load(enemyFile, (gltf) => {
        babi = gltf.scene;
        babi.position.x = 1.2;
        scene.add(babi);
        playAnimation(gltf, "enemy");
    });
}

// =======================================================
// POPUP HASIL
// =======================================================

function showResult(answer){
    resultPopup.style.display = "block";

    if(answer.correct){
        resultTitle.innerHTML = "Benar!";
        resultTitle.style.color = "#00e676";
    }else{
        resultTitle.innerHTML = "Kurang Tepat";
        resultTitle.style.color = "#ff5252";
    }

    resultExplanation.innerHTML = answer.explanation;
}

// =======================================================
// LANJUT KE CHAPTER BERIKUTNYA
// =======================================================

continueButton.onclick = () => {
    resultPopup.style.display = "none";
    fade.classList.add("active");

    setTimeout(() => {
        if(currentScene + 1 < story.length){
            loadScene(currentScene + 1);
        }else{
            loading.style.display = "none";
            showEnding();
        }
    }, 800);
};

// =======================================================
// ENDING
// =======================================================

function showEnding(){
    endingScreen.style.display = "flex";
    finalScore.innerHTML = score;
}

// =======================================================
// RESTART
// =======================================================

restartButton.onclick = () => {
    location.reload();
};

// =======================================================
// LOOP
// =======================================================

function animate(){
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if(mixerPlayer) mixerPlayer.update(delta);
    if(mixerEnemy) mixerEnemy.update(delta);

    if(controls) controls.update();

    renderer.render(scene, camera);
}

// =======================================================
// RESIZE
// =======================================================

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
