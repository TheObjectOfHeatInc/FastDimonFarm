document.addEventListener('DOMContentLoaded', () => {
    const farmGrid = document.getElementById('farm-grid');
    const moneyDisplay = document.getElementById('money-display');
    const actionModal = document.getElementById('action-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalOptions = document.getElementById('modal-options');
    const closeButton = document.querySelector('.close-button');

    let money = 0;
    let selectedCell = null; // Ячейка, на которую нажали

    // Определяем типы растений
    const plants = {
        carrot: {
            name: 'Морковь',
            growthTime: 10, // Секунды
            sellPrice: 10,
            spriteClass: 'carrot'
        },
        wheat: {
            name: 'Пшеница',
            growthTime: 20, // Секунды
            sellPrice: 25,
            spriteClass: 'wheat'
        },
        tomato: {
            name: 'Помидор',
            growthTime: 30, // Секунды
            sellPrice: 50,
            spriteClass: 'tomato'
        }
    };

    // Состояние всех 9 ячеек
    const farmCells = [];

    // Инициализация игрового поля
    function initFarm() {
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i; // Храним индекс ячейки
            farmGrid.appendChild(cell);

            // Инициализируем состояние ячейки
            farmCells.push({
                element: cell,
                state: 'empty', // empty, seed, growing, mature
                plantType: null,
                plantTime: null, // Время посадки (timestamp)
                growthDuration: null, // Длительность роста в секундах
                timerElement: null // Элемент для отображения таймера
            });

            cell.addEventListener('click', () => onCellClick(i));
        }
        updateMoneyDisplay();
        setInterval(gameTick, 1000); // Игровой "тик" каждую секунду
    }

    // Обработка клика по ячейке
    function onCellClick(index) {
        selectedCell = farmCells[index];
        modalOptions.innerHTML = ''; // Очищаем предыдущие опции

        if (selectedCell.state === 'empty') {
            modalTitle.textContent = 'Что посадить?';
            for (const key in plants) {
                const plant = plants[key];
                const button = document.createElement('button');
                button.textContent = `Посадить ${plant.name} (${plant.growthTime} сек)`;
                button.addEventListener('click', () => plantSeed(index, key));
                modalOptions.appendChild(button);
            }
        } else if (selectedCell.state === 'growing') {
            modalTitle.textContent = 'Растение растет...';
            const waterButton = document.createElement('button');
            waterButton.textContent = 'Полить (Ускорить)';
            waterButton.addEventListener('click', () => waterPlant(index));
            modalOptions.appendChild(waterButton);
        } else if (selectedCell.state === 'mature') {
            modalTitle.textContent = 'Урожай готов!';
            const harvestButton = document.createElement('button');
            harvestButton.textContent = `Собрать ${plants[selectedCell.plantType].name} (${plants[selectedCell.plantType].sellPrice} монет)`;
            harvestButton.addEventListener('click', () => harvestPlant(index));
            modalOptions.appendChild(harvestButton);
        }
        actionModal.style.display = 'flex'; // Показать модальное окно
    }

    // Закрытие модального окна
    closeButton.addEventListener('click', () => {
        actionModal.style.display = 'none';
    });

    // Закрытие модального окна по клику вне его
    window.addEventListener('click', (event) => {
        if (event.target == actionModal) {
            actionModal.style.display = 'none';
        }
    });

    // Посадка семян
    function plantSeed(index, plantKey) {
        const cell = farmCells[index];
        const plantInfo = plants[plantKey];

        cell.state = 'seed'; // Сначала семечко
        cell.plantType = plantKey;
        cell.plantTime = Date.now(); // Текущее время в миллисекундах
        cell.growthDuration = plantInfo.growthTime * 1000; // В миллисекундах

        // Удаляем все старые классы спрайтов
        cell.element.classList.remove('seed', 'growing', 'mature', 'carrot', 'wheat', 'tomato');
        cell.element.classList.add('seed', plantInfo.spriteClass); // Добавляем класс семени и тип растения

        // Создаем элемент для таймера
        const timerDiv = document.createElement('div');
        timerDiv.classList.add('timer');
        cell.element.appendChild(timerDiv);
        cell.timerElement = timerDiv;

        actionModal.style.display = 'none'; // Закрыть модальное окно
    }

    // Полив растения (ускоряет рост)
    function waterPlant(index) {
        const cell = farmCells[index];
        if (cell.state === 'growing' && cell.plantTime) {
            // Уменьшаем оставшееся время на 10% (пример)
            const timeElapsed = Date.now() - cell.plantTime;
            const timeLeft = cell.growthDuration - timeElapsed;

            if (timeLeft > 0) {
                const waterBoost = timeLeft * 0.1; // Ускоряем на 10% от оставшегося времени
                cell.plantTime += waterBoost; // Сдвигаем время посадки вперед
                // Убедимся, что plantTime не превышает текущее время + growthDuration
                // (это предотвращает ускорение "в будущее" и не позволяет сразу созреть)
                if (cell.plantTime > Date.now() + cell.growthDuration) {
                    cell.plantTime = Date.now() + cell.growthDuration;
                }
            }
            alert(`Растение полито! Осталось меньше времени до созревания.`); // Простое уведомление
            actionModal.style.display = 'none';
        }
    }


    // Сбор урожая
    function harvestPlant(index) {
        const cell = farmCells[index];
        if (cell.state === 'mature') {
            const plantInfo = plants[cell.plantType];
            money += plantInfo.sellPrice;
            updateMoneyDisplay();

            // Сброс состояния ячейки
            cell.state = 'empty';
            cell.plantType = null;
            cell.plantTime = null;
            cell.growthDuration = null;

            // Удаляем таймер и все классы спрайтов
            if (cell.timerElement) {
                cell.element.removeChild(cell.timerElement);
                cell.timerElement = null;
            }
            cell.element.classList.remove('seed', 'growing', 'mature', 'carrot', 'wheat', 'tomato');
            cell.element.classList.add('empty'); // Возвращаем класс пустой грядки
            actionModal.style.display = 'none';
        }
    }

    // Обновление счетчика денег
    function updateMoneyDisplay() {
        moneyDisplay.textContent = money;
    }

    // Основной игровой цикл
    function gameTick() {
        farmCells.forEach(cell => {
            if (cell.state === 'seed' || cell.state === 'growing') {
                const currentTime = Date.now();
                const timeElapsed = currentTime - cell.plantTime;
                const timeLeft = Math.max(0, cell.growthDuration - timeElapsed); // Оставшееся время

                // Обновление состояния и спрайтов
                if (timeLeft <= 0) {
                    cell.state = 'mature';
                    cell.element.classList.remove('seed', 'growing');
                    cell.element.classList.add('mature');
                    if (cell.timerElement) {
                        cell.element.removeChild(cell.timerElement); // Убрать таймер
                        cell.timerElement = null;
                    }
                } else {
                    cell.state = 'growing'; // Если ещё не созрело
                    cell.element.classList.remove('seed'); // Убираем класс семени, если уже растет
                    cell.element.classList.add('growing');
                    if (cell.timerElement) {
                        const secondsLeft = Math.ceil(timeLeft / 1000);
                        const minutes = Math.floor(secondsLeft / 60);
                        const seconds = secondsLeft % 60;
                        cell.timerElement.textContent = `${minutes}м ${seconds}с`;
                    }
                }
                // Обновляем спрайт для растущего состояния
                cell.element.classList.add(plants[cell.plantType].spriteClass);
            }
        });
    }

    // Запускаем игру
    initFarm();
});