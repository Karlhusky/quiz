// =======================================================
// Quiz Story - Meganthropus
// script.js (LENGKAP - versi ES Module, FIXED)
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

// -----------------------------
// TYPEWRITER STATE (FIX #2)
// -----------------------------
let typeInterval = null;
let isTyping = false;
let currentFullText = "";

// -----------------------------
// LAYOUT / POSISI KARAKTER (FIX #3)
// -----------------------------
// Kalau model masih kelihatan kekecilan / kegedean setelah dites di HP,
// tinggal ubah MODEL_SCALE saja (misal 1.4 untuk perbesar, 0.7 untuk perkecil).
const MODEL_SCALE = 1;

// Rotasi supaya kedua karakter saling berhadapan.
// Asumsi: model glTF standar menghadap ke arah +Z secara default.
// Kalau setelah dites arahnya masih salah (misal babi malah membelakangi),
// tambah/kurangi nilai ini dengan Math.PI (180°) atau Math.PI/2 (90°).
const PLAYER_FACING_Y = Math.PI / 2;   // meganthropus menghadap ke kanan (+X, ke arah babi)
const ENEMY_FACING_Y  = -Math.PI / 2;  // babi menghadap ke kiri (-X, ke arah meganthropus)

// Layout berbeda untuk landscape vs portrait (HP) supaya kedua karakter
// tetap masuk frame dan jaraknya pas untuk animasi serang/kick.
function getLayout(){
    const aspect = window.innerWidth / window.innerHeight;

    if(aspect < 1){
        // PORTRAIT (HP)
        return {
            playerX: -0.55,
            enemyX: 0.55,
            cameraPos: new THREE.Vector3(0, 1.7, 5.2),
            cameraTarget: new THREE.Vector3(0, 1, 0),
            fov: 65
        };
    }

    // LANDSCAPE (desktop / tablet)
    return {
        playerX: -0.7,
        enemyX: 0.7,
        cameraPos: new THREE.Vector3(0, 1.8, 4),
        cameraTarget: new THREE.Vector3(0, 1, 0),
        fov: 60
    };
}

// Terapkan layout saat ini ke kamera + model yang sedang ada di scene
function applyLayout(){
    const layout = getLayout();

    camera.fov = layout.fov;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.copy(layout.cameraPos);
    camera.updateProjectionMatrix();

    controls.target.copy(layout.cameraTarget);
    controls.update();

    if(meganthropus){
        meganthropus.position.x = layout.playerX;
    }
    if(babi){
        babi.position.x = layout.enemyX;
    }

    return layout;
}

// Set posisi, rotasi, dan skala standar untuk karakter yang baru dimuat
function setupCharacter(model, x, facingY){
    model.position.set(x, 0, 0);
    model.rotation.y = facingY;
    model.scale.setScalar(MODEL_SCALE);
}

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

    applyLayout();
}

// =======================================================
// LOAD STORY JSON
// =======================================================

async function loadStory(){
    try {
        const response = await fetch("story.json");
        if(!response.ok){
            throw new Error("Gagal fetch story.json (status " + response.status + ")");
        }
        story = await response.json();
        loadScene(0);
    } catch(err){
        console.error("[loadStory] Error:", err);
        showLoadError("Gagal memuat story.json. Cek console untuk detail.");
    }
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
        },
        undefined,
        (err) => {
            console.error("[loadScene] Gagal load background:", "assets/images/" + data.background, err);
        }
    );

    // buang model lama
    clearModels();

    let loadedCount = 0;
    let doneCalled = false;
    function checkDone(){
        loadedCount++;
        if(loadedCount >= 2 && !doneCalled){
            doneCalled = true;
            loading.style.display = "none";
            fade.classList.remove("active");
            showDialog();
        }
    }

    loader.load(
        "assets/model/" + data.player,
        (gltf) => {
            meganthropus = gltf.scene;
            const layout = getLayout();
            setupCharacter(meganthropus, layout.playerX, PLAYER_FACING_Y);
            scene.add(meganthropus);
            playAnimation(gltf, "player");
            checkDone();
        },
        undefined,
        (err) => {
            console.error("[loadScene] Gagal load model player:", "assets/model/" + data.player, err);
            checkDone(); // FIX #1: jangan biarkan loading screen nyangkut
        }
    );

    loader.load(
        "assets/model/" + data.enemy,
        (gltf) => {
            babi = gltf.scene;
            const layout = getLayout();
            setupCharacter(babi, layout.enemyX, ENEMY_FACING_Y);
            scene.add(babi);
            playAnimation(gltf, "enemy");
            checkDone();
        },
        undefined,
        (err) => {
            console.error("[loadScene] Gagal load model enemy:", "assets/model/" + data.enemy, err);
            checkDone(); // FIX #1: jangan biarkan loading screen nyangkut
        }
    );
}

// =======================================================
// TAMPILKAN PESAN ERROR DI LOADING SCREEN (FIX #1)
// =======================================================

function showLoadError(message){
    loading.style.display = "flex";
    loading.innerHTML = "<h2 style='color:#ff5252;text-align:center;padding:20px'>" + message + "</h2>";
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
// TYPE EFFECT (FIX #2: hentikan interval lama sebelum mulai baru)
// =======================================================

function typeWriter(text){
    if(typeInterval){
        clearInterval(typeInterval);
        typeInterval = null;
    }

    dialogText.innerHTML = "";
    currentFullText = text;
    isTyping = true;

    let i = 0;
    typeInterval = setInterval(() => {
        dialogText.innerHTML += text.charAt(i);
        i++;
        if(i >= text.length){
            clearInterval(typeInterval);
            typeInterval = null;
            isTyping = false;
        }
    }, 25);
}

// =======================================================
// NEXT
// =======================================================

nextButton.onclick = () => {
    // FIX #2: kalau masih dalam proses ngetik, klik pertama cukup
    // menyelesaikan teksnya dulu (tidak langsung lompat ke dialog berikutnya)
    if(isTyping){
        clearInterval(typeInterval);
        typeInterval = null;
        isTyping = false;
        dialogText.innerHTML = currentFullText;
        return;
    }

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
        if(q.answers[i]){
            btn.style.display = "block";
            btn.innerHTML = q.answers[i].text;
            btn.onclick = () => selectAnswer(i);
        }else{
            // FIX: sembunyikan tombol jika jumlah jawaban < jumlah tombol
            btn.style.display = "none";
            btn.onclick = null;
        }
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

    const layout = getLayout();

    loader.load(
        playerFile,
        (gltf) => {
            meganthropus = gltf.scene;
            setupCharacter(meganthropus, layout.playerX, PLAYER_FACING_Y);
            scene.add(meganthropus);
            playAnimation(gltf, "player");
        },
        undefined,
        (err) => console.error("[swapModel] Gagal load:", playerFile, err)
    );

    loader.load(
        enemyFile,
        (gltf) => {
            babi = gltf.scene;
            setupCharacter(babi, layout.enemyX, ENEMY_FACING_Y);
            scene.add(babi);
            playAnimation(gltf, "enemy");
        },
        undefined,
        (err) => console.error("[swapModel] Gagal load:", enemyFile, err)
    );
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    applyLayout(); // FIX #3: kamera & posisi karakter ikut menyesuaikan orientasi HP
});

// Beberapa HP tidak langsung memicu event "resize" saat rotasi layar,
// jadi kita dengarkan juga "orientationchange" sebagai jaga-jaga.
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        applyLayout();
    }, 200);
});
