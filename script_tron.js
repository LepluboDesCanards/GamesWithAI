const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverElement = document.getElementById('gameOver');
const winnerElement = document.getElementById('winner');

// Configuration du jeu
const EXPLOSION_DURATION = 1000;
const EXPLOSION_PARTICLES = 20;
const gridSize = 100;

const BLOCK_LIFETIME = 5000; // Durée de vie des blocs en millisecondes
const BLOCK_FADE_DURATION = 1000;

// Définir la taille du canvas
function setCanvasSize() {
    const size = Math.min(window.innerWidth, window.innerHeight) - 40;
    canvas.width = size;
    canvas.height = size;
}
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

const cellSize = canvas.width / gridSize;
let gameLoop;

class ExplosionParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speed = {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
        };
        this.radius = Math.random() * 3 + 2;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.x += this.speed.x;
        this.y += this.speed.y;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.life})`;
        ctx.fill();
    }
}

// Joueurs
const players = [
    {
        x: 2,
        y: gridSize * 0.5,
        direction: { x: 1, y: 0 },
        color: '#ff0000',
        bikeColor: '#ffbebeff',
        controls: { up: 'z', down: 's', left: 'q', right: 'd' }
    },
    {
        x: gridSize - 3,
        y: gridSize * 0.5,
        direction: { x: -1, y: 0 },
        color: '#0000ff',
        bikeColor: '#d1d1ffff',
        controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
    }
];

// Grille pour suivre les positions occupées
// Grille pour suivre les positions occupées avec leur timestamp et couleur
const grid = new Array(gridSize).fill(null).map(() => 
    new Array(gridSize).fill(null).map(() => ({
        occupied: false,
        timestamp: 0,
        color: null
    }))
);
// Gestion des contrôles
document.addEventListener('keydown', (e) => {
    players.forEach(player => {
        switch(e.key) {
            case player.controls.up:
                if (player.direction.y !== 1) {
                    player.direction = { x: 0, y: -1 };
                }
                break;
            case player.controls.down:
                if (player.direction.y !== -1) {
                    player.direction = { x: 0, y: 1 };
                }
                break;
            case player.controls.left:
                if (player.direction.x !== 1) {
                    player.direction = { x: -1, y: 0 };
                }
                break;
            case player.controls.right:
                if (player.direction.x !== -1) {
                    player.direction = { x: 1, y: 0 };
                }
                break;
        }
    });
});

function update() {
    const now = Date.now();
    currentTime = now;

    // Effacer la position précédente des motos
    ctx.fillStyle = '#000';
    players.forEach(player => {
        ctx.fillRect(
            Math.floor(player.x * cellSize) - 2,
            Math.floor(player.y * cellSize) - 2,
            cellSize + 4,
            cellSize + 4
        );
    });

    // Mettre à jour et dessiner les blocs existants
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const block = grid[y][x];
            if (block.occupied) {
                const age = now - block.timestamp;
                
                if (age > BLOCK_LIFETIME + BLOCK_FADE_DURATION) {
                    block.occupied = false;
                    ctx.fillStyle = '#000';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                } else if (age > BLOCK_LIFETIME) {
                    const opacity = 1 - ((age - BLOCK_LIFETIME) / BLOCK_FADE_DURATION);
                    ctx.fillStyle = `rgba(${block.color}, ${opacity})`;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    players.forEach((player, index) => {
        // Mise à jour de la position
        const oldX = player.x;
        const oldY = player.y;
        player.x += player.direction.x;
        player.y += player.direction.y;

        const newX = Math.floor(player.x);
        const newY = Math.floor(player.y);

        // Vérification des collisions
        if (newX < 0 || newX >= gridSize || 
            newY < 0 || newY >= gridSize || 
            (grid[newY][newX].occupied && grid[newY][newX].timestamp > now - BLOCK_LIFETIME)) {
            endGame(index);
            return;
        }

        // Dessiner la ligne (trace) à l'ancienne position
        const colorComponents = player.color === '#ff0000' ? '255, 0, 0' : '0, 0, 255';
        grid[Math.floor(oldY)][Math.floor(oldX)] = {
            occupied: true,
            timestamp: now,
            color: colorComponents
        };

        ctx.fillStyle = player.color;
        ctx.fillRect(
            Math.floor(oldX * cellSize),
            Math.floor(oldY * cellSize),
            cellSize,
            cellSize
        );

        // Dessiner la moto à la nouvelle position
        ctx.fillStyle = player.bikeColor;
        ctx.fillRect(
            Math.floor(player.x * cellSize) - 1,
            Math.floor(player.y * cellSize) - 1,
            cellSize + 2,
            cellSize + 2
        );
    });
}

function endGame(loserIndex) {
    const loser = players[loserIndex];
    const particles = [];
    const lines = [];
    let animationStart = null;
    
    // Créer les particules d'explosion
    const centerX = loser.x * cellSize;
    const centerY = loser.y * cellSize;
    const colorComponents = loserIndex === 0 ? "255, 0, 0" : "0, 0, 255";
    
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
        particles.push(new ExplosionParticle(centerX, centerY, colorComponents));
    }

    // Collecter toutes les positions des lignes
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (grid[y][x]) {
                lines.push({x: x * cellSize, y: y * cellSize});
            }
        }
    }

    function animate(timestamp) {
        if (!animationStart) animationStart = timestamp;
        const progress = timestamp - animationStart;

        // Effacer le canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dessiner et mettre à jour les particules
        particles.forEach((particle, i) => {
            particle.update();
            particle.draw(ctx);
            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        });

        // Faire disparaître progressivement les lignes
        const opacity = 1 - (progress / EXPLOSION_DURATION);
        ctx.fillStyle = `rgba(${colorComponents}, ${opacity})`;
        lines.forEach(line => {
            ctx.fillRect(line.x, line.y, cellSize, cellSize);
        });

        if (progress < EXPLOSION_DURATION) {
            requestAnimationFrame(animate);
        } else {
            // Afficher l'écran de fin
            gameOverElement.classList.remove('hidden');
            winnerElement.textContent = `Joueur ${loserIndex === 0 ? 'Bleu' : 'Rouge'} gagne !`;
        }
    }

    clearInterval(gameLoop);
    requestAnimationFrame(animate);
}

function startGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    gameLoop = setInterval(update, 50);
}

startGame();