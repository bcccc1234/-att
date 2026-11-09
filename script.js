
// =========================
// 1. 游戏基础设置
// =========================

const SIZE = 6;          // 立方体边长
const MINE_TOTAL = 15;   // 总雷数
const SHOW_LAYERS = 3;   // 同时显示几个面

// 让网格列数始终和 SIZE 保持一致
document.documentElement.style.setProperty("--size", SIZE);

let board = [];
let firstClick = true;
let gameOver = false;

let currentStart = 0;
// 当前固定高亮的格子
let pinnedCell = null;
let flags = 0;
let openedCount = 0;

let seconds = 0;
let timer = null;


// =========================
// 2. 获取页面元素
// =========================

const boardsElement = document.getElementById("boards");
const mineCountElement = document.getElementById("mineCount");
const timerElement = document.getElementById("timer");
const layerInfoElement = document.getElementById("layerInfo");
const messageElement = document.getElementById("message");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");


// =========================
// 3. 创建三维雷区
// board[z][y][x]
// =========================

function createBoard() {
    board = [];

    for (let z = 0; z < SIZE; z++) {
        const layer = [];

        for (let y = 0; y < SIZE; y++) {
            const row = [];

            for (let x = 0; x < SIZE; x++) {
                row.push({
                    mine: false,
                    number: 0,
                    opened: false,
                    mark: 0
                });
            }

            layer.push(row);
        }

        board.push(layer);
    }

    // 随机布雷
    let placed = 0;

    while (placed < MINE_TOTAL) {
        const z = Math.floor(Math.random() * SIZE);
        const y = Math.floor(Math.random() * SIZE);
        const x = Math.floor(Math.random() * SIZE);

        if (!board[z][y][x].mine) {
            board[z][y][x].mine = true;
            placed++;
        }
    }

    // 计算每格周围的雷数
    for (let z = 0; z < SIZE; z++) {
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {

                board[z][y][x].number =
                    countNearbyMines(z, y, x);

            }
        }
    }
}


// =========================
// 4. 计算三维邻居
// 最多检查 26 个方向
// =========================

function countNearbyMines(z, y, x) {
    let count = 0;

    for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {

                // 跳过自己
                if (dx === 0 && dy === 0 && dz === 0) {
                    continue;
                }

                const nz = z + dz;
                const ny = y + dy;
                const nx = x + dx;

                // 检查是否越界
                if (
                    nz >= 0 && nz < SIZE &&
                    ny >= 0 && ny < SIZE &&
                    nx >= 0 && nx < SIZE
                ) {
                    if (board[nz][ny][nx].mine) {
                        count++;
                    }
                }
            }
        }
    }

    return count;
}


// 统计某一层的雷数
function countLayerMines(z) {
    let count = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[z][y][x].mine) {
                count++;
            }
        }
    }

    return count;
}


// =========================
// 5. 显示三个连续截面
// =========================


function renderBoards() {
    boardsElement.innerHTML = "";

    for (let z = currentStart - 1; z <= currentStart + 1; z++) {
        const layerElement = document.createElement("div");
        layerElement.className = "layer";

        // 超出范围时显示空白位置
        if (z < 0 || z >= SIZE) {
            const title = document.createElement("h3");
            title.textContent = "无截面";

            layerElement.appendChild(title);
            boardsElement.appendChild(layerElement);
            continue;
        }

        const title = document.createElement("h3");
        title.textContent = `第 ${z + 1} 面（${countLayerMines(z)} 雷）`;

        const grid = document.createElement("div");
        grid.className = "board";

        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const cell = board[z][y][x];

                const button = document.createElement("button");
                button.className = "cell";
                // 记录这个格子的三维坐标
                button.dataset.z = z;
                button.dataset.y = y;
                button.dataset.x = x;
                if (cell.opened) {
                    button.classList.add("opened");

                    if (cell.mine) {
                        button.textContent = "💣";
                        button.classList.add("mine");
                    } else if (cell.number > 0) {
                        button.textContent = cell.number;

                        // 数字越大，颜色越深
                        const colors = [
                            "#000000",
                            "#0077ff", // 1
                            "#009900", // 2
                            "#ff7700", // 3
                            "#cc0000", // 4
                            "#9900cc", // 5
                            "#660099", // 6
                            "#333333", // 7
                            "#111111"  // 8
                        ];

                        button.style.color =
                            colors[Math.min(cell.number, 8)];
                    }
                } else if (cell.mark === 1) {
                    button.textContent = "🚩";
                    button.classList.add("flagged");
                } else if (cell.mark === 2) {
                    button.textContent = "❓";
                }

                // 只有中间面可以操作
                if (z === currentStart) {
                    // 已翻开的格子：固定/取消固定；未翻开的格子：左键翻开
                    button.addEventListener("click", () => {
                        if (cell.opened) {
                            if (!cell.mine) {
                                togglePinnedCell(z, y, x);
                            }
                            return;
                        }

                        revealCell(z, y, x);
                    });
                    // 只有已翻开且不是雷的格子才显示周围；固定后高亮锁定
                    button.addEventListener("mouseenter", () => {
                        if (gameOver || pinnedCell) return;
                        if (!cell.opened || cell.mine) return;

                        highlightNeighbors(z, y, x);
                    });

                    button.addEventListener("mouseleave", () => {
                        if (pinnedCell) return;

                        clearHighlights();
                    });

                    button.addEventListener("contextmenu", (event) => {
                        event.preventDefault();
                        toggleFlag(z, y, x);
                    });
                } else {
                    button.classList.add("readonly");
                }

                grid.appendChild(button);
            }
        }

        layerElement.appendChild(title);
        layerElement.appendChild(grid);
        boardsElement.appendChild(layerElement);
    }

    layerInfoElement.textContent = `当前操作：第 ${currentStart + 1} 面`;

    prevBtn.disabled = currentStart === 0;
    nextBtn.disabled = currentStart === SIZE - 1;

    // 重绘后恢复固定格子的高亮
    if (pinnedCell) {
        highlightNeighbors(
            pinnedCell.z,
            pinnedCell.y,
            pinnedCell.x
        );
    }

    markPinnedCell();
}
// 高亮周围的 26 个格子
// 高亮周围的 26 个格子
function highlightNeighbors(z, y, x) {
    clearHighlights();

    for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {

                if (dx === 0 && dy === 0 && dz === 0) {
                    continue;
                }

                const nz = z + dz;
                const ny = y + dy;
                const nx = x + dx;

                if (
                    nz < 0 || nz >= SIZE ||
                    ny < 0 || ny >= SIZE ||
                    nx < 0 || nx >= SIZE
                ) {
                    continue;
                }

                const neighbor = boardsElement.querySelector(
                    `[data-z="${nz}"][data-y="${ny}"][data-x="${nx}"]`
                );

                if (neighbor) {
                    neighbor.classList.add("neighbor-highlight");
                }
            }
        }
    }
}


// 清除高亮
function clearHighlights() {
    boardsElement.querySelectorAll(".neighbor-highlight")
        .forEach(cell => {
            cell.classList.remove("neighbor-highlight");
        });
}


// 点击固定或取消固定
function togglePinnedCell(z, y, x) {
    if (gameOver) return;

    if (
        pinnedCell &&
        pinnedCell.z === z &&
        pinnedCell.y === y &&
        pinnedCell.x === x
    ) {
        pinnedCell = null;
        messageElement.textContent = "已取消固定。左键翻开格子，右键插旗。";
    } else {
        pinnedCell = { z, y, x };
        messageElement.textContent =
            `已固定：第 ${z + 1} 面，第 ${y + 1} 行第 ${x + 1} 列（再点一次取消固定）。`;
    }

    markPinnedCell();

    if (pinnedCell) {
        highlightNeighbors(
            pinnedCell.z,
            pinnedCell.y,
            pinnedCell.x
        );
    } else {
        clearHighlights();
    }
}


// 给被固定的格子加独立标识
function markPinnedCell() {
    boardsElement.querySelectorAll(".pinned")
        .forEach(cell => {
            cell.classList.remove("pinned");
        });

    if (!pinnedCell) return;

    const cell = boardsElement.querySelector(
        `[data-z="${pinnedCell.z}"][data-y="${pinnedCell.y}"][data-x="${pinnedCell.x}"]`
    );

    if (cell) {
        cell.classList.add("pinned");
    }
}


// =========================
// 6. 第一次点击安全
// =========================

function protectFirstClick(z, y, x) {
    // 首点及其 26 个邻居都不布雷：把它们已有的雷全部挪走
    let movedMines = 0;

    for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nz = z + dz;
                const ny = y + dy;
                const nx = x + dx;

                if (
                    nz < 0 || nz >= SIZE ||
                    ny < 0 || ny >= SIZE ||
                    nx < 0 || nx >= SIZE
                ) {
                    continue;
                }

                if (board[nz][ny][nx].mine) {
                    board[nz][ny][nx].mine = false;
                    movedMines++;
                }
            }
        }
    }

    // 把这些雷放到首点周围 3×3×3 区域之外，保证总雷数不变
    while (movedMines > 0) {
        const nz = Math.floor(Math.random() * SIZE);
        const ny = Math.floor(Math.random() * SIZE);
        const nx = Math.floor(Math.random() * SIZE);

        // 跳过首点周围的安全区域
        if (
            Math.abs(nz - z) <= 1 &&
            Math.abs(ny - y) <= 1 &&
            Math.abs(nx - x) <= 1
        ) {
            continue;
        }

        const target = board[nz][ny][nx];

        if (!target.mine) {
            target.mine = true;
            movedMines--;
        }
    }

    // 重新计算全部格子的数字
    for (let iz = 0; iz < SIZE; iz++) {
        for (let iy = 0; iy < SIZE; iy++) {
            for (let ix = 0; ix < SIZE; ix++) {
                board[iz][iy][ix].number =
                    countNearbyMines(iz, iy, ix);
            }
        }
    }
}


// =========================
// 7. 翻开格子
// =========================

function revealCell(z, y, x) {
    if (gameOver) return;

    const cell = board[z][y][x];

    if (cell.opened || cell.mark !== 0) return;

    if (firstClick) {
        protectFirstClick(z, y, x);
        firstClick = false;
        startTimer();
    }

    if (cell.mine) {
        cell.opened = true;
        loseGame();
        return;
    }

    openCell(z, y, x);
    renderBoards();
    checkWin();
}


// =========================
// 8. 打开格子与三维自动展开
// =========================


function openCell(z, y, x) {

    // 先检查边界，再访问数组
    if (
        z < 0 || z >= SIZE ||
        y < 0 || y >= SIZE ||
        x < 0 || x >= SIZE
    ) return;

    const cell = board[z][y][x];

    if (cell.opened || cell.mark !== 0 || cell.mine) {
        return;
    }

    cell.opened = true;
    openedCount++;

    if (cell.number !== 0) return;

    for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {

                if (dx === 0 && dy === 0 && dz === 0) {
                    continue;
                }

                openCell(z + dz, y + dy, x + dx);
            }
        }
    }
}



// =========================
// 9. 插旗与问号
// 空白 → 旗子 → 问号 → 空白
// =========================

function toggleFlag(z, y, x) {
    if (gameOver) return;

    const cell = board[z][y][x];

    if (cell.opened) return;

    if (cell.mark === 0) {
        // 旗子数量不能超过总雷数
        if (flags >= MINE_TOTAL) {
            messageElement.textContent = `旗子已用完（共 ${MINE_TOTAL} 个）。`;
            return;
        }

        cell.mark = 1;
        flags++;
    } else if (cell.mark === 1) {
        cell.mark = 2;
        flags--;
    } else {
        cell.mark = 0;
    }

    mineCountElement.textContent = MINE_TOTAL - flags;

    renderBoards();
}


// =========================
// 10. 胜负判断
// =========================

function checkWin() {
    const totalCells = SIZE * SIZE * SIZE;

    if (openedCount === totalCells - MINE_TOTAL) {
        gameOver = true;
        stopTimer();
        messageElement.textContent = "🎉 恭喜！你赢了！";
    }
}

function loseGame() {
    gameOver = true;
    stopTimer();

    // 显示全部地雷
    for (let z = 0; z < SIZE; z++) {
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (board[z][y][x].mine) {
                    board[z][y][x].opened = true;
                }
            }
        }
    }

    messageElement.textContent = "💥 踩到雷了，游戏结束！";
    renderBoards();
}


// =========================
// 11. 计时器
// =========================

function startTimer() {
    if (timer !== null) return;

    timer = setInterval(() => {
        seconds++;
        timerElement.textContent = seconds;
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
}


// =========================
// 12. 切换截面
// =========================


prevBtn.addEventListener("click", () => {
    if (currentStart > 0) {
        currentStart--;
        renderBoards();
    }
});

nextBtn.addEventListener("click", () => {
    if (currentStart < SIZE - 1) {
        currentStart++;
        renderBoards();
    }
});



// =========================
// 13. 重新开始
// =========================

function restartGame() {
    firstClick = true;
    gameOver = false;
    pinnedCell = null;
    currentStart = 1;
    flags = 0;
    openedCount = 0;

    seconds = 0;
    timerElement.textContent = 0;
    mineCountElement.textContent = MINE_TOTAL;

    messageElement.textContent = "左键翻开格子，右键插旗。";

    stopTimer();
    createBoard();
    renderBoards();
}

restartBtn.addEventListener("click", restartGame);


// =========================
// 14. 启动游戏
// =========================

restartGame();
