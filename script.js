// =======================================================
// Quiz Story - Meganthropus
// Part 1
// =======================================================

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


// -----------------------------
// THREE JS
// -----------------------------

let scene;
let camera;
let renderer;
let light;

let loader;

let controls;

let meganthropus = null;
let babi = null;

let backgroundTexture;


// -----------------------------
// STORY
// -----------------------------

let story = [];

let currentScene = 0;

let dialogIndex = 0;

let score = 0;


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

window.innerWidth/window.innerHeight,

0.1,

1000

);

camera.position.set(0,1.8,4);

renderer = new THREE.WebGLRenderer({

canvas,

antialias:true,

alpha:true

});

renderer.setSize(

window.innerWidth,

window.innerHeight

);

renderer.setPixelRatio(window.devicePixelRatio);

controls = new THREE.OrbitControls(

camera,

renderer.domElement

);

controls.enablePan=false;

controls.target.set(0,1,0);

controls.update();


// Ambient

const ambient = new THREE.AmbientLight(

0xffffff,

2

);

scene.add(ambient);


// Directional

light = new THREE.DirectionalLight(

0xffffff,

3

);

light.position.set(

5,

10,

5

);

scene.add(light);

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

async function loadScene(index){

loading.style.display="flex";

choiceBox.style.display="none";

resultPopup.style.display="none";

dialogIndex=0;

currentScene=index;

const data = story[index];

chapter.innerHTML="Chapter "+(index+1);


// background

new THREE.TextureLoader().load(

"assets/images/"+data.background,

(texture)=>{

scene.background=texture;

}

);


// remove old

if(meganthropus){

scene.remove(meganthropus);

}

if(babi){

scene.remove(babi);

}


// loader

loader = new THREE.GLTFLoader();

loader.load(

"assets/model/"+data.player,

(gltf)=>{

meganthropus=gltf.scene;

meganthropus.position.x=-0.8;

scene.add(meganthropus);

}

);


loader.load(

"assets/model/"+data.enemy,

(gltf)=>{

babi=gltf.scene;

babi.position.x=1.2;

scene.add(babi);

loading.style.display="none";

showDialog();

}

);

}


// =======================================================
// DIALOG
// =======================================================

function showDialog(){

const data = story[currentScene];

speaker.innerHTML=data.speaker;

typeWriter(

data.dialog[dialogIndex]

);

}


// =======================================================
// TYPE EFFECT
// =======================================================

function typeWriter(text){

dialogText.innerHTML="";

let i=0;

const interval=setInterval(()=>{

dialogText.innerHTML+=text.charAt(i);

i++;

if(i>=text.length){

clearInterval(interval);

}

},25);

}


// =======================================================
// NEXT
// =======================================================

nextButton.onclick=()=>{

const data=story[currentScene];

dialogIndex++;

if(dialogIndex<data.dialog.length){

showDialog();

}else{

showQuestion();

}

};


// =======================================================
// QUESTION
// =======================================================

function showQuestion(){

dialogText.innerHTML="";

speaker.innerHTML="Pertanyaan";

nextButton.style.display="none";

choiceBox.style.display="flex";

const q=story[currentScene].question;

choiceButtons[0].innerHTML=q.answers[0].text;

choiceButtons[1].innerHTML=q.answers[1].text;

choiceButtons[2].innerHTML=q.answers[2].text;

}


// =======================================================
// LOOP
// =======================================================

function animate(){

requestAnimationFrame(animate);

renderer.render(

scene,

camera

);

}


// =======================================================
// RESIZE
// =======================================================

window.addEventListener(

"resize",

()=>{

camera.aspect=

window.innerWidth/

window.innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(

window.innerWidth,

window.innerHeight

);

}

);
