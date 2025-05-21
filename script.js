document.addEventListener('DOMContentLoaded', () => {
    const farmGrid = document.getElementById('farm-grid');
    const moneyDisplay = document.getElementById('money-display');
    const shopButton = document.getElementById('shop-button');
    const inventoryButton = document.getElementById('inventory-button');
    const gameModal = document.getElementById('game-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const closeButton = document.querySelector('.close-button');

    let money = 500; // Начальные деньги, можно увеличить для тестирования
    const gridSize = 5; // Поле 5x5
    const farmCells = [];
    let currentCellIndex = -1; // Индекс ячейки, с которой взаимодействуем

    // --- Игровые данные ---

    const initialCellPrice = 100;
    const cellPriceMultiplier = 1.5; // Множитель для удорожания каждой следующей ячейки

    const CLUTTER_TYPES = {
        trash: { name: 'Мусор', cleanPrice: 20, tools: [], byproduct: { item: 'boards', chance: 0.3 }, cleanupTime: 5 },
        bushes: { name: 'Кусты', cleanPrice: 50, tools: ['saw', 'shovel'], byproduct: { item: 'boards', amount: 1 }, cleanupTime: 10 },
        puddle: { name: 'Лужа', cleanPrice: 30, tools: ['shovel'], byproduct: null, cleanupTime: 7 }
    };

    const TOOLS = {
        shovel: { name: 'Лопата', price: 50 },
        hammer: { name: 'Молоток', price: 70 },
        saw: { name: 'Пила', price: 60 },
        hoe: { name: 'Мотыга', price: 40 }
    };

    const MATERIALS = {
        boards: { name: 'Доски', price: 10, type: 'material' },
        nails: { name: 'Гвозди', price: 5, type: 'material' },
        fertilizer: { name: 'Удобрение', price: 15, type: 'material' }
    };

    const SEEDS = { // Семена и растения
        apple_sapling: { name: 'Саженец яблони', price: 100, growthTime: 60, product: 'apple', sellPrice: 20, prepares: ['shovel', 'fertilizer'], initialHarvestLimit: 5 }, // Лимит для яблок
        wheat_seed: { name: 'Семена пшеницы', price: 20, growthTime: 30, product: 'wheat_grain', sellPrice: 5, prepares: ['shovel', 'hoe', 'fertilizer'], initialHarvestLimit: 10, canBeFood: true }, // Лимит для пшеницы
        potato_seed: { name: 'Семена картошки', price: 30, growthTime: 45, product: 'potato', sellPrice: 8, prepares: ['shovel', 'hoe', 'fertilizer'], initialHarvestLimit: 8 } // Лимит для картошки
    };

    const BUILDINGS = { // Постройки для животных
        cow_pen: { name: 'Коровник', price: 300, materials: { boards: 5, nails: 3 }, tools: ['hammer'], productionTime: 90, product: 'milk', sellPrice: 100, initialHarvestLimit: 3 }, // Лимит для молока
        sheep_pen: { name: 'Загон для овец', price: 250, materials: { boards: 4, nails: 2 }, tools: ['hammer'], productionTime: 75, product: 'wool', sellPrice: 80, initialHarvestLimit: 3 } // Лимит для шерсти
    };

    // Обновленные продукты в инвентаре: теперь все продукты из SEEDS и BUILDINGS
    let inventory = {
        tools: {},
        materials: { boards: 0, nails: 0, fertilizer: 0 },
        plants: {},
        products: {
            apple: 0,
            wheat_grain: 0,
            potato: 0,
            milk: 0,
            wool: 0
        }
    };

    // --- Вспомогательные функции ---

    function updateMoneyDisplay() {
        moneyDisplay.textContent = money;
    }

    // Привязываем closeModal к window, чтобы она была доступна из onclick
    window.closeModal = () => {
        gameModal.style.display = 'none';
        currentCellIndex = -1;
    };

    closeButton.addEventListener('click', window.closeModal); // Используем привязанную функцию
    window.addEventListener('click', (event) => {
        if (event.target === gameModal) {
            window.closeModal();
        }
    });

    function updateInventoryDisplay(tabName) {
        const tabContent = document.getElementById('inventory-tab-content');
        if (!tabContent) return;

        let html = '';
        if (tabName === 'inv-tools') {
            for (const key in inventory.tools) {
                if (inventory.tools[key] > 0) {
                    html += `<p>${TOOLS[key].name}: ${inventory.tools[key]}</p>`;
                }
            }
        } else if (tabName === 'inv-materials') {
            for (const key in inventory.materials) {
                if (inventory.materials[key] > 0) {
                    html += `<p>${MATERIALS[key].name}: ${MATERIALS[key].name} ${inventory.materials[key]}</p>`;
                }
            }
        } else if (tabName === 'inv-plants') {
             for (const key in inventory.plants) {
                if (inventory.plants[key] > 0) {
                    html += `<p>${SEEDS[key].name}: ${inventory.plants[key]}</p>`;
                }
            }
        } else if (tabName === 'inv-products') {
            for (const key in inventory.products) {
                if (inventory.products[key] > 0) {
                    html += `
                        <div class="item-row">
                            <span>${key.replace('_', ' ')}: ${inventory.products[key]}</span>
                            <button onclick="sellItem('${key}')">Продать (${getSellPrice(key)} монет)</button>
                        </div>
                    `;
                }
            }
        }
        tabContent.innerHTML = html || '<p>Пусто</p>';
    }

    // Привязываем sellItem к window
    window.sellItem = (itemKey) => {
        if (inventory.products[itemKey] > 0) {
            const price = getSellPrice(itemKey);
            inventory.products[itemKey]--;
            money += price;
            updateMoneyDisplay();
            updateInventoryDisplay('inv-products');
            alert(`Вы продали 1 ${itemKey.replace('_', ' ')} за ${price} монет.`);
        } else {
            alert('Нет продукта для продажи.');
        }
    };

    function getSellPrice(itemKey) {
        for (const seedKey in SEEDS) {
            if (SEEDS[seedKey].product === itemKey) {
                return SEEDS[seedKey].sellPrice;
            }
        }
        for (const buildingKey in BUILDINGS) {
            if (BUILDINGS[buildingKey].product === itemKey) {
                return BUILDINGS[buildingKey].sellPrice;
            }
        }
        return 0;
    }

    function hasRequired(type, key, amount = 1) {
        if (type === 'tools') return (inventory.tools[key] || 0) >= amount;
        if (type === 'materials') return (inventory.materials[key] || 0) >= amount;
        if (type === 'plants') return (inventory.plants[key] || 0) >= amount;
        return false;
    }

    function consumeItem(type, key, amount = 1) {
        if (type === 'tools') inventory.tools[key] -= amount;
        else if (type === 'materials') inventory.materials[key] -= amount;
        else if (type === 'plants') inventory.plants[key] -= amount;
    }

    // --- Инициализация и рендеринг поля ---

    function initFarm() {
        farmGrid.style.gridTemplateColumns = `repeat(${gridSize}, 100px)`;
        farmGrid.style.gridTemplateRows = `repeat(${gridSize}, 100px)`;

        for (let i = 0; i < gridSize * gridSize; i++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.index = i;

            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            farmCells.push({
                element: cellElement,
                index: i,
                row: row,
                col: col,
                state: 'locked',
                clutterType: null,
                plantType: null,
                buildingType: null,
                actionStartTime: null,
                actionDuration: null,
                timerElement: null,
                progressBarElement: null,
                spriteElement: null,
                productCount: 0,
                harvestLimit: 0,
                preparedFor: null
            });

            cellElement.addEventListener('click', () => onCellClick(i));
            farmGrid.appendChild(cellElement);
        }

        const centerIndex = Math.floor(gridSize / 2) * gridSize + Math.floor(gridSize / 2);
        const centerCell = farmCells[centerIndex];
        centerCell.state = 'producing';
        centerCell.plantType = 'apple_sapling';
        centerCell.actionStartTime = Date.now();
        // Установим actionDuration как время производства одного яблока
        centerCell.actionDuration = SEEDS.apple_sapling.growthTime * 1000 / SEEDS.apple_sapling.initialHarvestLimit; // Например, 60 сек / 5 яблок = 12 сек на яблоко
        centerCell.harvestLimit = SEEDS.apple_sapling.initialHarvestLimit;
        centerCell.productCount = 0; // Начинаем с 0 продуктов

        // Добавим начальные ресурсы для тестирования
        inventory.tools.shovel = 1;
        inventory.tools.hammer = 1;
        inventory.tools.saw = 1;
        inventory.tools.hoe = 1;
        inventory.materials.boards = 5;
        inventory.materials.nails = 5;
        inventory.materials.fertilizer = 5;
        inventory.plants.wheat_seed = 5;
        inventory.plants.potato_seed = 5;
        inventory.plants.apple_sapling = 2;

        renderFarm();
        updateMoneyDisplay();
        setInterval(gameTick, 1000);
    }

    function renderFarm() {
        farmCells.forEach(cell => {
            cell.element.className = 'cell';
            cell.element.innerHTML = ''; // Очистить все дочерние элементы

            cell.element.classList.add(cell.state);

            if (cell.state !== 'locked' && cell.state !== 'empty' && cell.state !== 'preparing') {
                const spriteDiv = document.createElement('div');
                spriteDiv.classList.add('sprite');
                cell.element.appendChild(spriteDiv);
                cell.spriteElement = spriteDiv;

                if (cell.clutterType) {
                    cell.element.classList.add(`clutter-${cell.clutterType}`);
                } else if (cell.plantType) {
                    cell.element.classList.add(cell.plantType);
                } else if (cell.buildingType) {
                    cell.element.classList.add(cell.buildingType);
                }
            } else {
                cell.spriteElement = null;
            }

            if (cell.state === 'preparing' || cell.state === 'planted' || cell.state === 'producing') {
                addProgressBar(cell);
                addTimer(cell);
            }

            if (cell.state === 'product_full') {
                 const productInfo = cell.plantType ? SEEDS[cell.plantType] : BUILDINGS[cell.buildingType];
                 const productName = productInfo.product.replace('_', ' ');
                 if (cell.timerElement) cell.timerElement.remove();
                 const fullTextDiv = document.createElement('div');
                 fullTextDiv.classList.add('timer');
                 fullTextDiv.textContent = `${cell.productCount}/${cell.harvestLimit} ${productName}`;
                 cell.element.appendChild(fullTextDiv);
                 cell.timerElement = fullTextDiv;
            }
        });
    }

    function updateCellVisuals(cell) {
        const currentTime = Date.now();

        if (cell.state === 'preparing' || cell.state === 'planted' || cell.state === 'producing') {
            const timeElapsed = currentTime - cell.actionStartTime;
            const timeLeft = Math.max(0, cell.actionDuration - timeElapsed);

            if (cell.timerElement) {
                const secondsLeft = Math.ceil(timeLeft / 1000);
                const minutes = Math.floor(secondsLeft / 60);
                const seconds = secondsLeft % 60;
                cell.timerElement.textContent = `${minutes}м ${seconds}с`;
            }

            if (cell.progressBarElement) {
                const progress = (timeElapsed / cell.actionDuration) * 100;
                cell.progressBarElement.style.width = `${Math.min(100, progress)}%`;
            }

            if (timeLeft <= 0) {
                if (cell.state === 'preparing') {
                    const preparedType = cell.preparedFor.type;
                    const preparedKey = cell.preparedFor.key;
                    cell.preparedFor = null;

                    if (preparedType === 'clean') {
                        cell.state = 'empty';
                    } else {
                        startPlantingOrBuilding(cell.index, preparedType, preparedKey);
                    }
                } else if (cell.state === 'planted') {
                    cell.state = 'mature';
                    // Убираем таймер и прогресс-бар после перехода в mature
                    if (cell.timerElement) { cell.timerElement.remove(); cell.timerElement = null; }
                    if (cell.progressBarElement) { cell.progressBarElement.remove(); cell.progressBarElement = null; }
                } else if (cell.state === 'producing') {
                    const productInfo = cell.plantType ? SEEDS[cell.plantType] : BUILDINGS[cell.buildingType];
                    const limit = productInfo.initialHarvestLimit;

                    if (cell.productCount < limit) {
                        cell.productCount++;
                    }

                    if (cell.productCount >= limit) {
                        cell.state = 'product_full';
                        // При переходе в product_full, таймер останавливается, и показывается счетчик
                        if (cell.timerElement) { cell.timerElement.remove(); cell.timerElement = null; }
                        if (cell.progressBarElement) { cell.progressBarElement.remove(); cell.progressBarElement = null; }
                    }
                    cell.actionStartTime = Date.now(); // Перезапускаем таймер для следующего продукта
                }
                renderFarm();
            }
        }
    }

    function addTimer(cell) {
        if (!cell.timerElement) {
            const timerDiv = document.createElement('div');
            timerDiv.classList.add('timer');
            cell.element.appendChild(timerDiv);
            cell.timerElement = timerDiv;
        }
    }

    function addProgressBar(cell) {
        if (!cell.progressBarElement) {
            const progressBarContainer = document.createElement('div');
            progressBarContainer.classList.add('progress-bar-container');
            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            progressBarContainer.appendChild(progressBar);
            cell.element.appendChild(progressBarContainer);
            cell.progressBarElement = progressBar;
        }
    }

    // --- Логика взаимодействия с ячейками ---

    function onCellClick(index) {
        currentCellIndex = index;
        const cell = farmCells[index];
        let modalContent = '';

        if (cell.state === 'locked') {
            const currentPrice = calculateCellPrice();
            const hasAdjacentUnlocked = getAdjacentUnlocked(index).length > 0;
            const canBuy = money >= currentPrice && hasAdjacentUnlocked;

            modalContent = `
                <p>Нужно денег для покупки: <span style="color:${money >= currentPrice ? 'green' : 'red'};">${currentPrice}</span></p>
                <p>У вас есть денег: ${money}</p>
                ${!hasAdjacentUnlocked ? '<p style="color:red;">Эта ячейка не примыкает к открытым.</p>' : ''}
                <div class="modal-action-buttons">
                    <button onclick="buyCell(${index})" ${!canBuy ? 'disabled' : ''}>Купить</button>
                    <button onclick="closeModal()" class="cancel">Отмена</button>
                </div>
            `;
            openModal('Купить ячейку', modalContent);
        } else if (cell.state === 'empty') {
            modalContent = `
                <p>Чем хотим заняться:</p>
                <div class="modal-action-buttons">
                    <button onclick="showPlantOptions()">Посадить растение</button>
                    <button onclick="showBuildingOptions()">Построить загон</button>
                    <button onclick="closeModal()" class="cancel">Отмена</button>
                </div>
            `;
            openModal('Подготовка ячейки', modalContent);
        } else if (cell.state === 'clutter') {
            const clutterInfo = CLUTTER_TYPES[cell.clutterType];
            let toolsRequiredText = clutterInfo.tools.map(tool => TOOLS[tool].name + (hasRequired('tools', tool) ? ' (есть)' : ' (нет)')).join(', ') || 'Нет';
            let canClean = money >= clutterInfo.cleanPrice && clutterInfo.tools.every(tool => hasRequired('tools', tool));

            modalContent = `
                <p>Тип захламления: ${clutterInfo.name}</p>
                <p>Необходимый инструмент: ${toolsRequiredText}</p>
                <p>Необходимо денег: <span style="color:${money >= clutterInfo.cleanPrice ? 'green' : 'red'};">${clutterInfo.cleanPrice}</span></p>
                <div class="modal-action-buttons">
                    <button onclick="cleanCell()" ${!canClean ? 'disabled' : ''}>Очистить</button>
                    <button onclick="closeModal()" class="cancel">Отмена</button>
                </div>
            `;
            openModal('Убрать захламление', modalContent);
        } else if (cell.state === 'preparing') {
             modalContent = `<p>Идет подготовка ячейки...</p><div class="modal-action-buttons"><button onclick="closeModal()" class="cancel">Закрыть</button></div>`;
             openModal('Подготовка', modalContent);
        } else if (cell.state === 'planted') {
            modalContent = `<p>Растение растет... (${SEEDS[cell.plantType].name})</p><div class="modal-action-buttons"><button onclick="closeModal()" class="cancel">Закрыть</button></div>`;
            openModal('Растение', modalContent);
        } else if (cell.state === 'mature') {
            const productInfo = cell.plantType ? SEEDS[cell.plantType] : BUILDINGS[cell.buildingType];
            const itemKey = productInfo.product;
            const productName = itemKey.replace('_', ' ');

            modalContent = `
                <p>Урожай готов! (${productInfo.name})</p>
                <div class="modal-action-buttons">
                    <button onclick="harvestMatureItem()">Собрать 1 ${productName}</button>
            `;
            modalContent += `<button onclick="closeModal()" class="cancel">Отмена</button></div>`;
            openModal('Сбор урожая', modalContent);
        } else if (cell.state === 'producing' || cell.state === 'product_full') {
            const productInfo = cell.plantType ? SEEDS[cell.plantType] : BUILDINGS[cell.buildingType];
            const itemKey = productInfo.product;
            const productName = itemKey.replace('_', ' ');
            const currentProducts = cell.productCount;
            const maxProducts = cell.harvestLimit;

            modalContent = `<p>Готово продуктов: ${currentProducts}/${maxProducts} ${productName}</p>`;
            if (currentProducts > 0) {
                 modalContent += `<div class="modal-action-buttons"><button onclick="collectProduct()">Собрать все (${currentProducts} шт.)</button></div>`;
            }
             modalContent += `<div class="modal-action-buttons"><button onclick="closeModal()" class="cancel">Закрыть</button></div>`;
            openModal('Производство', modalContent);
        }
    }

    // --- Покупка ячейки ---
    function calculateCellPrice() {
        const ownedCellsCount = farmCells.filter(cell => cell.state !== 'locked').length;
        return Math.round(initialCellPrice * Math.pow(cellPriceMultiplier, ownedCellsCount - 1));
    }

    function getAdjacent(index) {
        const cell = farmCells[index];
        const adjacent = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dr, dc] of directions) {
            const newRow = cell.row + dr;
            const newCol = cell.col + dc;
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const newIndex = newRow * gridSize + newCol;
                adjacent.push(farmCells[newIndex]);
            }
        }
        return adjacent;
    }

    function getAdjacentUnlocked(index) {
        return getAdjacent(index).filter(adjCell => adjCell.state !== 'locked');
    }

    // Привязываем buyCell к window
    window.buyCell = (index) => {
        const cell = farmCells[index];
        const price = calculateCellPrice();

        const hasAdjacentUnlocked = getAdjacentUnlocked(index).length > 0;
        if (cell.state === 'locked' && money >= price && hasAdjacentUnlocked) {
            money -= price;
            updateMoneyDisplay();

            const clutterTypes = Object.keys(CLUTTER_TYPES);
            const randomClutter = clutterTypes[Math.floor(Math.random() * clutterTypes.length)];
            cell.state = 'clutter';
            cell.clutterType = randomClutter;
            
            window.closeModal();
            renderFarm();
        } else if (!hasAdjacentUnlocked) {
            alert('Нельзя покупать ячейки, не примыкающие к открытым!');
        } else {
            alert('Недостаточно денег!');
        }
    };

    // --- Очистка ячейки ---

    // Привязываем cleanCell к window
    window.cleanCell = () => {
        const cell = farmCells[currentCellIndex];
        const clutterInfo = CLUTTER_TYPES[cell.clutterType];

        if (money < clutterInfo.cleanPrice || !clutterInfo.tools.every(tool => hasRequired('tools', tool))) {
            alert('Не хватает инструментов или денег для очистки!');
            return;
        }

        money -= clutterInfo.cleanPrice;
        updateMoneyDisplay();

        clutterInfo.tools.forEach(tool => consumeItem('tools', tool));

        cell.state = 'preparing';
        cell.actionStartTime = Date.now();
        cell.actionDuration = clutterInfo.cleanupTime * 1000;
        cell.preparedFor = { type: 'clean', key: cell.clutterType };
        
        if (clutterInfo.byproduct) {
            const { item, chance, amount } = clutterInfo.byproduct;
            if (chance && Math.random() < chance) {
                inventory.materials[item] = (inventory.materials[item] || 0) + 1;
                alert(`Вы нашли 1 ${MATERIALS[item].name}!`);
            } else if (amount) {
                inventory.materials[item] = (inventory.materials[item] || 0) + amount;
                alert(`Вы получили ${amount} ${MATERIALS[item].name}!`);
            }
        }

        window.closeModal();
        renderFarm();
    };


    // --- Посадка и строительство ---

    // Привязываем showPlantOptions к window
    window.showPlantOptions = () => {
        let optionsHtml = '';
        for (const key in SEEDS) {
            const seed = SEEDS[key];
            const hasSeeds = hasRequired('plants', key);
            optionsHtml += `
                <div class="item-row">
                    <span>${seed.name} (Время роста: ${seed.growthTime} сек)</span>
                    <button onclick="preparePlot('plant', '${key}')" ${!hasSeeds ? 'disabled' : ''}>Подготовить</button>
                </div>
            `;
        }
        modalBody.innerHTML = optionsHtml;
        modalTitle.textContent = 'Выберите растение';
        modalBody.innerHTML += '<div class="modal-action-buttons"><button onclick="closeModal()" class="cancel">Отмена</button></div>';
    };

    // Привязываем showBuildingOptions к window
    window.showBuildingOptions = () => {
        let optionsHtml = '';
        for (const key in BUILDINGS) {
            const building = BUILDINGS[key];
            const hasMaterials = Object.entries(building.materials).every(([mat, amt]) => hasRequired('materials', mat, amt));
            const hasTools = building.tools.every(tool => hasRequired('tools', tool));
            const canAfford = money >= building.price;

            optionsHtml += `
                <div class="item-row">
                    <span>${building.name} (Цена: ${building.price})</span>
                    <button onclick="preparePlot('build', '${key}')" ${!(hasMaterials && hasTools && canAfford) ? 'disabled' : ''}>Построить</button>
                </div>
            `;
        }
        modalBody.innerHTML = optionsHtml;
        modalTitle.textContent = 'Выберите постройку';
        modalBody.innerHTML += '<div class="modal-action-buttons"><button onclick="closeModal()" class="cancel">Отмена</button></div>';
    };

    // Привязываем preparePlot к window
    window.preparePlot = (type, itemKey) => {
        const cell = farmCells[currentCellIndex];
        let price = 0;
        let preparationTime = 0;
        let requiredTools = [];
        let requiredMaterials = {};
        let consumeSeed = false;

        if (type === 'plant') {
            const plantInfo = SEEDS[itemKey];
            requiredTools = plantInfo.prepares.filter(req => Object.keys(TOOLS).includes(req));
            if (plantInfo.prepares.includes('fertilizer')) requiredMaterials.fertilizer = (requiredMaterials.fertilizer || 0) + 1;
            preparationTime = plantInfo.growthTime * 1000 * 0.5;
            consumeSeed = true;

            if (!hasRequired('plants', itemKey)) {
                alert(`Необходимо купить ${SEEDS[itemKey].name} в магазине!`);
                return;
            }
        } else if (type === 'build') {
            const buildingInfo = BUILDINGS[itemKey];
            requiredTools = buildingInfo.tools;
            requiredMaterials = buildingInfo.materials;
            price = buildingInfo.price;
            preparationTime = buildingInfo.productionTime * 1000 * 0.3;
        }

        const hasAllTools = requiredTools.every(tool => hasRequired('tools', tool));
        const hasAllMaterials = Object.entries(requiredMaterials).every(([mat, amt]) => hasRequired('materials', mat, amt));
        const canAfford = money >= price;

        if (!hasAllTools || !hasAllMaterials || !canAfford) {
            let alertMsg = 'Не хватает: ';
            if (!canAfford) alertMsg += `денег (${price - money}), `;
            requiredTools.forEach(tool => { if (!hasRequired('tools', tool)) alertMsg += `${TOOLS[tool].name}, `; });
            Object.entries(requiredMaterials).forEach(([mat, amt]) => { if (!hasRequired('materials', mat, amt)) alertMsg += `${MATERIALS[mat].name} (${amt}), `; });
            alert(alertMsg.slice(0, -2) + '!');
            return;
        }

        money -= price;
        updateMoneyDisplay();
        requiredTools.forEach(tool => consumeItem('tools', tool));
        Object.entries(requiredMaterials).forEach(([mat, amt]) => consumeItem('materials', mat, amt));
        if (consumeSeed) consumeItem('plants', itemKey);


        cell.state = 'preparing';
        cell.actionStartTime = Date.now();
        cell.actionDuration = preparationTime;
        cell.preparedFor = { type: type, key: itemKey };
        
        window.closeModal();
        renderFarm();
    };

    function startPlantingOrBuilding(index, type, itemKey) {
        const cell = farmCells[index];
        
        if (type === 'plant') {
            const plantInfo = SEEDS[itemKey];
            cell.state = 'planted';
            cell.plantType = itemKey;
            cell.actionStartTime = Date.now();
            cell.actionDuration = plantInfo.growthTime * 1000;
            cell.harvestLimit = plantInfo.initialHarvestLimit;
            cell.productCount = 0;
        } else if (type === 'build') {
            const buildingInfo = BUILDINGS[itemKey];
            cell.state = 'producing';
            cell.buildingType = itemKey;
            cell.actionStartTime = Date.now();
            // Для зданий, productionTime - это время на производство одного продукта
            cell.actionDuration = buildingInfo.productionTime * 1000;
            cell.harvestLimit = buildingInfo.initialHarvestLimit;
            cell.productCount = 0;
        }
        renderFarm();
    }

    // --- Сбор урожая / продуктов ---

    // Привязываем harvestMatureItem к window
    window.harvestMatureItem = () => {
        const cell = farmCells[currentCellIndex];
        if (cell.state === 'mature' && cell.plantType) {
            const plantInfo = SEEDS[cell.plantType];
            const harvestedProductKey = plantInfo.product;
            
            inventory.products[harvestedProductKey] = (inventory.products[harvestedProductKey] || 0) + 1;
            alert(`Вы собрали 1 ${harvestedProductKey.replace('_', ' ')}! Проверьте инвентарь.`);

            cell.state = 'empty';
            cell.plantType = null;
            cell.actionStartTime = null;
            cell.actionDuration = null;
            cell.productCount = 0;
            cell.harvestLimit = 0;
            
            window.closeModal();
            renderFarm();
        }
    };

    // Привязываем collectProduct к window
    window.collectProduct = () => {
        const cell = farmCells[currentCellIndex];
        if (cell.productCount > 0) {
            const productInfo = cell.plantType ? SEEDS[cell.plantType] : BUILDINGS[cell.buildingType];
            const productKey = productInfo.product;

            inventory.products[productKey] = (inventory.products[productKey] || 0) + cell.productCount;
            alert(`Вы собрали ${cell.productCount} ${productKey.replace('_', ' ')}! Проверьте инвентарь.`);

            cell.productCount = 0;
            // После сбора, если это было product_full, возвращаем в producing и перезапускаем таймер
            if (cell.state === 'product_full') {
                cell.state = 'producing';
                const productInfo = cell.plantType ? SEEDS[cell.plantType] : BUILDINGS[cell.buildingType];
                // actionDuration должен быть установлен в соответствии с временем производства одного продукта
                cell.actionDuration = productInfo.growthTime ? productInfo.growthTime * 1000 / productInfo.initialHarvestLimit : productInfo.productionTime * 1000;
                cell.actionStartTime = Date.now();
            }
            window.closeModal();
            renderFarm();
        }
    };

    // --- Магазин и Инвентарь ---

    shopButton.addEventListener('click', showShop);
    inventoryButton.addEventListener('click', showInventory);

    function showShop() {
        let shopHtml = `
            <div class="tab-buttons">
                <button class="active" data-tab="tools">Инструменты</button>
                <button data-tab="materials">Материалы</button>
                <button data-tab="plants">Растения</button>
            </div>
            <div class="tab-content" id="shop-tab-content"></div>
        `;
        openModal('Магазин', shopHtml);

        document.querySelectorAll('#game-modal .tab-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('#game-modal .tab-buttons button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                renderShopTab(e.target.dataset.tab);
            });
        });

        renderShopTab('tools');
    }

    function renderShopTab(tabName) {
        const tabContent = document.getElementById('shop-tab-content');
        if (!tabContent) return;

        let html = '';
        if (tabName === 'tools') {
            for (const key in TOOLS) {
                const tool = TOOLS[key];
                html += `
                    <div class="item-row">
                        <span>${tool.name} (Цена: ${tool.price})</span>
                        <button onclick="buyItem('tools', '${key}', ${tool.price})" ${money < tool.price ? 'disabled' : ''}>Купить</button>
                    </div>
                `;
            }
        } else if (tabName === 'materials') {
            for (const key in MATERIALS) {
                const material = MATERIALS[key];
                html += `
                    <div class="item-row">
                        <span>${material.name} (Цена: ${material.price})</span>
                        <button onclick="buyItem('materials', '${key}', ${material.price})" ${money < material.price ? 'disabled' : ''}>Купить</button>
                    </div>
                `;
            }
        } else if (tabName === 'plants') {
             for (const key in SEEDS) {
                const seed = SEEDS[key];
                html += `
                    <div class="item-row">
                        <span>${seed.name} (Цена: ${seed.price})</span>
                        <button onclick="buyItem('plants', '${key}', ${seed.price})" ${money < seed.price ? 'disabled' : ''}>Купить</button>
                    </div>
                `;
            }
        }
        tabContent.innerHTML = html;
    }

    // Привязываем buyItem к window
    window.buyItem = (type, key, price) => {
        if (money >= price) {
            money -= price;
            updateMoneyDisplay();
            if (type === 'tools') {
                inventory.tools[key] = (inventory.tools[key] || 0) + 1;
            } else if (type === 'materials') {
                inventory.materials[key] = (inventory.materials[key] || 0) + 1;
            } else if (type === 'plants') {
                 inventory.plants[key] = (inventory.plants[key] || 0) + 1;
            }
            alert(`Куплено 1 ${type === 'tools' ? TOOLS[key].name : type === 'materials' ? MATERIALS[key].name : SEEDS[key].name} за ${price} монет.`);
            const currentTab = document.querySelector('#game-modal .tab-buttons button.active');
            if (currentTab) renderShopTab(currentTab.dataset.tab);
        } else {
            alert('Недостаточно денег!');
        }
    };

    function showInventory() {
        let inventoryHtml = `
            <div class="tab-buttons">
                <button class="active" data-tab="inv-tools">Инструменты</button>
                <button data-tab="inv-materials">Материалы</button>
                <button data-tab="inv-plants">Растения</button>
                <button data-tab="inv-products">Продукты</button>
            </div>
            <div class="tab-content" id="inventory-tab-content"></div>
        `;
        openModal('Инвентарь', inventoryHtml);

        document.querySelectorAll('#game-modal .tab-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('#game-modal .tab-buttons button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                updateInventoryDisplay(e.target.dataset.tab);
            });
        });

        updateInventoryDisplay('inv-tools');
    }

    // --- Главный игровой тик ---

    function gameTick() {
        farmCells.forEach(cell => {
            updateCellVisuals(cell);
        });
    }

    initFarm();
});