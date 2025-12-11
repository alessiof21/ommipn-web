import { main, managerGame, options, settingsManager, logger } from './main.js';
import { findDistance, findDirection, recalcPos } from './usefulFunctions.js';

export default class Controller extends EventTarget {
	constructor(runtime) {
		if (Controller._instance === undefined) {
			super();
			this.runtime = runtime;
			Controller._instance = this;
			if (main?.type === 'pc') { // Достаточно ли это хорошо?
				this.type = 'mouse';
				this.setCursor(true);
			} else if (main?.type === 'mobile') {
				this.type = 'touch';
			} else {
				this.type = 'unknown';
			}
			this.addEventListener('click', ()=> this.running = false);
			logger.add({type: 'info', text: 'Successfully: controller was initialized'})
		} else {
			return Controller._instance;
		}
	}
	
	//-------------------Основные свойства--------------------
	type = 'mouse' // Тип контроллера
	clickDelay = 0 // Задержка для клика
	wheelDelay = 0 // Задержка для прокрутки колесика
	running = true // Можно ли запускать дальше

	
	// Управление при помощи мышки
	mouse = {
		position: [],
		clicked: false,
		wheel: {
			direction: '',
			position: []
		},
		drag: {
			event: false
		},
		moving: {
			prevPosition: [],
			direction: []
		}
	}
	
	// Управление при помощи touch
	touch = {
		first: {
			id: null,
			position: [],
			direction: [],
		},
		second: {
			id: null,
			position: []
		},
		delta: {
			prevDistance: 0,
			distance: 0,
			position: []
		},
		down: {
			event: false,
			position: []
		},
		up: {
			event: false,
			position: [],
		}
	}
	
	// Хранение по типам взаимодействия имен событий и коллбеков к ним
	waiting = {
		click: {},
		wheel: {},
	}
	
	delays = {

	}
	
	//-------------------Обработка event--------------------
	// Добавить ожидание события
	wait(type, event, callback, delay=0) {
		if (!this.waiting.hasOwnProperty(type)) {
			this.waiting[type] = {};
		}
		const added = function() {
			this.waiting[type][event] = {callback: callback, handled: false};
			this.addEventListener(event, callback);	
		}.bind(this);
		
		if (delay === 0) {
			added();
		} else {
			const date = Date.now();
			const eventName = `${date}-${type}-${event}`;
			this.delays[eventName] = {delay: delay, callback: added};
		}
		return;
	}
	
	deleteWait(type, event) {
		if (!this.waiting.hasOwnProperty(type)) return;
		if (!this.waiting[type].hasOwnProperty(event)) return;
		delete this.waiting[type][event];
		return;
	}
	
	// Сброс состояния контроллера
	clear() {
		for (const type in this.waiting) {
			for (const eventName in this.waiting[type]) {
				this.removeEventListener(eventName, this.waiting[type][eventName]);
			}
			this.waiting[type] = {};
		}
		this.delays = {};
		return;
	}
	
	// Сообщить о выполнении события
	dispatch(event) {
		const e = new Event(event);
		globalThis.nextTick(()=> {
			this.dispatchEvent(e);
			this.deleteEvent(event);
		});
	}
	
	// Удалить событие
	deleteEvent(event) {
		for (const key in this.waiting) {
			if (this.waiting[key].hasOwnProperty(event)) {
				this.removeEventListener(event, this.waiting[key][event].callback);
				delete this.waiting[key][event];
				break;
			}
		}
		return;
	}
	
	// Диспатчнуть все события по типу взаимодействия type
	handleWait(type) {
		if (this.waiting.hasOwnProperty(type)) { // Перебираем все события
			for (const event in this.waiting[type]) {
				if (this.waiting[type][event].handled) continue; // Уже обрабатывали это событие
				this.waiting[type][event].handled = true;
				this.dispatch(event);
			}
	
		}
		return;
	}
	//-------------------Методы контроллера--------------------
	prevCursor = '';
	// Изменить курсор
	setCursor(value) {
		if (this.type === 'mouse') {
			const cursorName = `${value}Cursor`;
			if (this.runtime.objects.hasOwnProperty(cursorName)) {
				this.runtime.mouse.setCursorObjectClass(this.runtime.objects[cursorName]);
				this.prevCursor = value; 
			}
		}
		return;
	}
	// Очистить информацию о предудыщих нажатиях
	refresh() {
		this.clickDelay = 16; // Добавляем задержку
		if (this.type === 'mouse') {
			this.mouse.clicked = false;
			this.mouse.position = [];
		} else {
			this.touch.down.event = false;
			this.touch.down.position = [];
			this.touch.up.event = false;
			this.touch.up.position = [];
		}
		return;
	}
	
	// Надежно ли, что мы определяем устройство по ОС? Или лучше в самом
	// pointer-event определять тоже? e.pointerType
	
	// Событие клика (касания пальцем)
	click(e) {
		if (this.type === 'mouse') { // Игра на PC
			if (e.button === 0) { // Левая кнопка мыши
				this.mouse.drag.event = true; // Если необходимо, то кликнули для drag
				if (this.clickDelay === 0) { // Задержки нет
					
					this.clickDelay = 16; // Устанавливаем задержку
					this.mouse.clicked = true; // Устанавливаем, что клик был
					this.mouse.position = recalcPos(e.clientX, e.clientY); // Высчитываем позицию клика
					globalThis.nextTick(()=> this.checkClick()); // Проверяем клик
				}
			} /*else if (e.button === 2) { // Правая кнопка мыши
				if (main.env === 'development') { // Находимся в режиме разработки
					managerGame.editText();
				}
			}*/
		} else { // Игра с мобильного устройства
			if (!this.touch.first.id) { // Еще нет ни одного пальца на экране
				if (this.clickDelay === 0) {
					this.clickDelay = 16; // Устанавливаем задержку
					this.touch.first.id = e.pointerId; // Устанавливаем id для первого пальца
					this.touch.first.position = recalcPos(e.clientX, e.clientY); // Рассчитываем позицию касания первого пальца
					this.touch.down.event = true; // Устанавливаем, что клик был
					this.touch.down.position = this.touch.first.position.slice(); // Устанавлиаем позицию первого пальца
				}
			} else if (!this.touch.second.id) { // Первый палец уже на экране, касаемся вторым
				this.touch.second.id = e.pointerId; // Устанавливаем id для второго  пальца
				this.touch.second.position = recalcPos(e.clientX, e.clientY); // Рассчитываем позицию касания второго пальца
				const find = findDistance(this.touch.first.position, this.touch.second.position); // Находим расстояние между ними
				this.touch.delta.prevDistance = find.distance; // Фиксируем первоначальное расстояние
			}
		}
		return
	}
	
	checkBlock() {
		let flag = false;
		for (const key in this.waiting['blockClick']) {
			flag = true;
		}
		if (flag) {
			this.handleWait('blockClick');
			return false;
		}
		return true;
	}
	
	checkClick() {
		globalThis.nextTick(()=> {
			if (this.checkBlock()) {
				if (this.running && !settingsManager.isPaused) {
					this.handleWait('click'); // Диспатчим все события клика
					managerGame.dispatch('main', 'run'); // Диспатчим в менеджер игры, что был клик и надо запускаться
				} else {
					this.running = true;
				}				
			}
		});
		return;
	}
	
	// Проверяет, был ли клик/тач первым пальцем
	isClicked() {
		if (this.type === 'mouse') {
			return {clicked: this.mouse.clicked, position: this.mouse.position};
		} else {
			return {clicked: this.touch.down.event, position: this.touch.down.position};
		}
	}
	
	// Событие отпускания клика (касания пальца)
	up(e) {
		if (this.type === 'mouse') { // Играем на PC
			this.mouse.drag.event = false;
		} else { // Играем на мобильном устройстве
			if (e.pointerId === this.touch.first.id) { // Отпустили первый палец		
				this.touch.up.event = true;
				this.touch.up.position = recalcPos(e.clientX, e.clientY);
				globalThis.requestAnimationFrame(()=> this.checkClick());
				if (this.touch.second.id) { // При этом есть второй, он становится первым
					this.touch.first.id = this.touch.second.id;
					this.touch.first.position = this.touch.second.position.slice();
					this.touch.second.id = null;
					this.touch.second.position = [];
				} else { // Второго пальца нет
					this.touch.first.id = null;
					this.touch.first.position = [];
				}
				this.touch.first.direction = []
			} else if (e.pointerId === this.touch.second.id) {
				this.touch.second.id = null;
				this.touch.second.position = [];
			}
		}
		return;
	}
	
	// Проверяет, был ли отпущен первый палец
	isUp() {
		if (this.type === 'touch') {
			return this.touch.up;
		} else {
			return !this.mouse.drag.event;
		}
		return null;
	}
	
	// Движение курсора/пальца
	move(e) {
		if (this.type === 'mouse') { // Используется мышку
			const newPosition = recalcPos(e.clientX, e.clientY);
			this.mouse.moving.direction = findDirection(newPosition, this.mouse.moving.prevPosition);
			this.mouse.moving.prevPosition = newPosition.slice();
		} else { // Движем пальцем
			if (e.pointerId === this.touch.first.id || e.pointerId === this.touch.second.id) { // Двигаем первый или второй палец, остальные не фиксируем
				const newPosition = recalcPos(e.clientX, e.clientY);
				if (this.touch.first.id === e.pointerId) { // Движется первый палец
					this.touch.first.direction = findDirection(newPosition, this.touch.first.position);
					this.touch.first.position = newPosition.slice();
				} else if (this.touch.second.id === e.pointerId) { // Движется второй палец
					this.touch.second.position = newPosition.slice();
				}
				
				if (this.touch.first.id && this.touch.second.id) { // Тот случай, когда установлено два пальца
					const find = findDistance(this.touch.first.position, this.touch.second.position);
					this.touch.delta.distance = find.distance;
					this.touch.delta.position = find.position;								
				}
			} 
		}
		return;
	}
	
	// Отмена нажатия (исключительно для touch, когда свернули приложение, например, или закрыли его выдвигающимся экраном уведомлений и т.д)
	cancel(e) {
		if (this.type === 'touch') {
			if (this.touch.first.id === e.pointerId) {
				this.touch.first.id = null;
				this.touch.first.position = [];
				this.touch.first.direction = [];
			} else if (this.touch.second.id === e.pointerId) {
				this.touch.second.id = null;
				this.touch.second.position = [];				
			}
		}
		return;
	}
	
	// Событие прокрутки колесика мышки
	wheel(e) {
		this.mouse.wheel.position = recalcPos(e.clientX, e.clientY);
		this.mouse.wheel.direction = e.deltaY < 0 ? 'in' : 'out';	
		return;
	}
	
	// Проверяет, было ли зумирование (при помощи колесика мышки или движения двух пальцев), в противном случае возвращает null
	isZoom() {
		if (this.type === 'mouse') {
			if (this.mouse.wheel.direction) {
				return this.mouse.wheel;
			}
		} else {
			if (this.touch.delta.distance !== 0) {
				let direction = '';
				if (this.touch.delta.distance - this.touch.delta.prevDistance >= 5) {
					direction = 'in'
				} else if (this.touch.delta.distance - this.touch.delta.prevDistance <= -5) {
					direction = 'out';
				} else {
					return null;
				}
				return {
					direction: direction,
					position: this.touch.delta.position
				}
			}
		}
		return null;
	}
	
	// Получение позиции курсора/позиции в момент касания первым пальцем вовзращает null если нет позиции по какой-то причине
	getPosition() {
		if (this.type === 'mouse') {
			const mouse = this.runtime.mouse;
			return mouse.getMousePosition('ui');
		} else if (this.type === 'touch') {
			if (this.touch.down.position.length !== 0) {
				return this.touch.down.position;
			}
		}
		return null;
	}
	
	// Получить направление движение курсора/первого пальца, вовзращает null если движения нет
	getDirection() {
		if (this.type === 'mouse') {
			if (this.mouse.moving.direction.length !== 0) {
				return this.mouse.moving.direction;				
			}
		} else {
			if (this.touch.first.direction.length !== 0) {
				return this.touch.first.direction;				
			}
		}
		return null;
	}
	
	// Выполняет ли мышь/тач функцию drag, то есть схватился ли он за объект
	isDrag() {
		if (this.type === 'mouse') {
			return this.mouse.drag.event;
		} else {
			return !!this.touch.first.id;
		}
	}
	
	// Проверяет, мульти-тач ли касание в данный момент (два пальца касаются экрана)
	isMultiTouch() {
		if (this.type === 'touch') {
			return (this.touch.first.id && this.touch.second.id);	
		}
		return null;
	}
	
	// Тиковая функция, обнуляем все необходимые значения, уменьшаем время до окончания задержки
	tick() {
		if (this.clickDelay !== 0) {
			--this.clickDelay;
		} 
		if (this.wheelDelay !== 0) {
			--this.wheelDelay;
		}
		
		// Ожидания
		for (const eventName in this.delays) {
			--this.delays[eventName].delay;
			if (this.delays[eventName].delay <= 0) {
				this.delays[eventName].callback();
				delete this.delays[eventName];
			}
		}
		
		if (this.type === 'mouse') {
			if (this.mouse.clicked) {
				this.mouse.clicked = false;
				this.mouse.position = [];
			}
			if (this.mouse.wheel.direction) {
				this.mouse.wheel.direction = '';
				this.mouse.wheel.position = [];
			}
		} else {
			if (this.touch.down.event) {
				this.touch.down.event = false;
				this.touch.down.position = [];
			}
			if (this.touch.up.event) {
				this.touch.up.event = false;
				this.touch.up.position = [];			
			}
			if (this.touch.delta.distance !== 0) {
				this.touch.delta.prevDistance = this.touch.delta.distance;
				this.touch.delta.distance = 0;
			}
		}
		return;
	}
	
	async keyboard(e) {
		if (e.code === 'Space') {
			if (this.checkBlock()) {
				managerGame.run();				
			}
		}
		
		if (main.env !== 'development' || !managerGame.devs.ready) return; // Работает это все только в режиме разработчика
		if (e.code === 'F1') {
			managerGame.devInfo();
		} else if (e.code === 'F2') {
			managerGame.devConsole();
		} else if (e.code === 'F3') {
			logger.getLogs();
		} else if (e.code === 'F4') {
			managerGame.devText();
		} else if (e.code === 'F5') {
			logger.getTexts();
		}
	}
}