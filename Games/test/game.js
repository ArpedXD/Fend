const je = document.getElementById('je');
const Menu1 = document.getElementById("menu");
const Menu2 = document.getElementById("menu2");
const floating = document.getElementById("Floatingcharacter");
const game_score = document.getElementById("game_score");
const Menu3 = document.getElementById("menu3");
const win = document.getElementById("win");
const lose = document.getElementById("lose");
winn = 0;
losee = 0;
je.style.top = '0px';
fallspeed = 1;
falling = true;
column_speed = 2
jumpForce = 10;
var colx = []
var coly = []
ended = false;
var AI = true;
let firstcol = '#0d0030'
let secondcol = '#1a004a'
var defined = `linear-gradient(90deg,${firstcol} 0%,${secondcol} 100%)`;
var gamescore = 0;

function menu(){
    if(AI)return;
    Menu1.classList.toggle('active');
}

function game(){
    if(ended) return;
    requestAnimationFrame(game);
    var jeRect = je.getBoundingClientRect();
     if (colx.length === 0 && coly.length === 0) {
        createColumns();
    } else {
        const lastColumn = colx[colx.length - 1];
        const lastColumnLeft = lastColumn.getBoundingClientRect().left;
        
        if (window.innerWidth - lastColumnLeft > 500) {
            createColumns();
        }
    }
    for(i = 0; i < colx.length;i++){
        let x = parseInt(colx[i].getBoundingClientRect().left);
        colx[i].style.left = (x - column_speed) + 'px'

        var colRect = colx[i].getBoundingClientRect();

        const margin = 5;

        if (
            jeRect.right - margin > colRect.left &&
            jeRect.left + margin < colRect.right &&
            jeRect.bottom - margin > colRect.top &&
            jeRect.top + margin < colRect.bottom
        ) {
            gamescore = 0;
            console.log("They touched!");
            if(!AI){
                decis("lose")
                gamescore = 0
                losee++;
                lose.innerHTML = losee;
                ended = true;
            }
            game_score.innerHTML = `Score : ${gamescore}`;
            menu()
        }
    }

    for (let i = colx.length - 1; i >= 0; i--) {
        if (jeRect.left > colx[i].getBoundingClientRect().right + 50) {
            const elemX = colx[i];

            colx[i].style.animation = 'up 0.5s ease-in-out forwards'
            colx.splice(i, 1);
            if(!AI){
                gamescore++;
                game_score.innerHTML = `Score : ${gamescore}`
                if(gamescore % 10 == 0){
                    toast(`${gamescore}! You got 1 win!`)
                    decis("win");
                    winn++;
                    win.innerHTML = winn;
                }
            }
            setTimeout(() => {
                elemX.remove();
            },500)
        }
    }

    for (let i = coly.length - 1; i >= 0; i--) {
        if (jeRect.left > coly[i].getBoundingClientRect().right + 50) {
            const elemY = coly[i];

            coly[i].style.animation = 'down 0.5s ease-in-out forwards'
            coly.splice(i, 1);
            setTimeout(() => {
                elemY.remove();
            },500)
        }
    }

    for(i = 0; i < coly.length;i++){
        let y = parseInt(coly[i].getBoundingClientRect().left);
        coly[i].style.left = (y - column_speed) + 'px'

        var jeRect = je.getBoundingClientRect();
        var colRect = coly[i].getBoundingClientRect();

        const margin = 5;

        if (
            jeRect.right - margin > colRect.left &&
            jeRect.left + margin < colRect.right &&
            jeRect.bottom - margin > colRect.top &&
            jeRect.top + margin < colRect.bottom
        ) {
            gamescore = 0;
            console.log("They touched!");
            if(!AI){
                decis("lose");
                gamescore = 0;
                losee++;
                lose.innerHTML = losee;
                ended = true;
            }
            game_score.innerHTML = `Score : ${gamescore}`;
            ended = true;
            menu()
        }
    }

    
    if(je.offsetTop + je.getBoundingClientRect().height > window.innerHeight || je.offsetTop < 0){
        ended = true;
        if(!AI){
            decis("lose");
            gamescore = 0;
            losee++;
            lose.innerHTML = losee;
            ended = true;
        }
        game_score.innerHTML = `Score : ${gamescore}`;
        menu()
    }else{
        if(falling == true){
            fallspeed *= 1.05;
            let currentTop = parseInt(je.style.top);
            je.style.top = (currentTop + fallspeed) + 'px';
        }
    }

    if(AI){
        if(coly.length === 0){
            
        }else{
            if(je.offsetTop + je.getBoundingClientRect().height > coly[0].getBoundingClientRect().top - 20){
                jump();
            }
        }
    }
}

function createColumns(){
    var x = document.createElement('div');
    var y =  document.createElement('div');

    x.classList.add('killblocks');
    y.classList.add('killblocks');

    var rand = Math.random() * (70 - 0) + 0;

    x.style.height = `${rand}vh`
    y.style.height = `${70 - rand}vh`;
    y.style.top = `${rand + 30}vh`;

    x.style.left = `${window.innerWidth}px`;
    y.style.left = `${window.innerWidth}px`;

    x.style.background = defined;
    y.style.background = defined;

    document.body.appendChild(x);
    colx.push(x);
    document.body.appendChild(y);
    coly.push(y);
}

document.addEventListener('keydown', (e) => {
    if(ended) return;
    if (e.code === 'Space') {
        if(jumpLimit) return;
        jump()
    }
});

var jumpLimit = false;

function jump(){
    je.style.animation = 'none';
    void je.offsetWidth;
    je.style.animation = 'bird 1s ease-in-out forwards';
    falling = false;
    fallspeed = 1;
    column_speed = 2;
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            let currentTop = parseInt(je.style.top);
            je.style.top = (currentTop - jumpForce) + 'px';
        }, i * 10);
    }
    falling = true;
    jumpLimit = true;
    setTimeout(() => {
        jumpLimit = false;
    }, 50);
}

function res(){
    AI = false;
    ended = true;
    menu()
    start()
}

function Aimode(){
    AI = true;
    start()
}

function colorc(vs,val){
    const selectedColor = vs.value;
    if(val == 'bg'){
        console.log(selectedColor)
        document.body.style.background = `linear-gradient(180deg,#000510 0%,${selectedColor} 100%)`;
    }else if(val == 'cg'){
        je.style.boxShadow = `0 0 12px ${selectedColor}`
        je.style.filter = `drop-shadow(0 0 8px ${selectedColor})`
    }else if(val == 'fircol'){
        firstcol = selectedColor;
        defined = `linear-gradient(90deg,${firstcol} 0%, ${secondcol} 100%)`
        console.log(defined)
    }else if(val == 'seccol'){
        secondcol = selectedColor;
        defined = `linear-gradient(90deg,${firstcol} 0%,${secondcol} 100%)`
    }
}

function changetheme(){
    Menu1.classList.toggle('active');
    Menu3.classList.toggle('active');
}

function start(){
for(i = 0; i < colx.length;i++){
        colx[i].remove();
    }
    colx = []

    for(x = 0; x < coly.length;x++){
        coly[x].remove();
    }
    coly = []
    je.style.top = '10vh';
    fallspeed = 1;
    ended = true;
    setTimeout(() =>{
        ended = false;
        game();
    },100)
}

function changechar(){
    Menu1.classList.toggle('active');
    Menu2.classList.toggle('active');
    floating.classList.toggle('active')
}

function img(img){
    je.style.backgroundImage = `url('${img}')`
    floating.style.backgroundImage = `url('${img}')`
}
game()

var toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  msgEl.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1000);
}

async function decis(win){
    await fetch("https://bend-production-72e5.up.railway.app/bird/end", { //test
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        a: win,
        b: localStorage.getItem("username")
    })
    });
    return;
}