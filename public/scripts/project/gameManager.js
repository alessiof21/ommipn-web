/*
Новый вариант выборов
this.choice(options, variants, loop)
loop - повтор
variant - [[[[]]]]
options: {
    type: 'usual' || 'image' ??
    settings: null (для usual ?) || 'scroll' : 'x 3 2 1'
    text: текст вопроса
    time: false || true (если вопрос на время)
}

и дальше этот метод основываясь на options отправляет дальше вызов
usual - this.showChoice()
image - this.showImageChoice()
и тд
*/

//-------------------------Необходимый импорт------------------------------------------
import { options, controller, audioManager, logger, errorManager, settingsManager, uiManager, achievements } from './main.js';
import { saveData, loadData, saveAchievements } from './saveload.js';
import { SpriteObject ,Background, Person, Picture, GameText, SVGPicture, HTMLPicture } from './classes.js';
import { chapters } from './scripts.js';
import translater from './translater.js';
import transformate from './transformator.js';
//-------------------------------------------------------------------------------------


//-------------------------Класс ManagerGame-------------------------------------------
export default class ManagerGame extends EventTarget {
	constructor(runtime, opts = {}) {
		super();
		if (ManagerGame._instance === undefined) {
			this.runtime = runtime;
			this.positions = structuredClone(opts.positions);
			this.inputs = structuredClone(opts.inputs);
			this.stats = structuredClone(opts.stats);
			this.achievements = structuredClone(opts.achievements);
			this.info = structuredClone(opts.info)
			ManagerGame._instance = this;
			this.addEvent('main', 'run', this.run);
			logger.add({type: 'info', text: 'Successfully: managerGame was initialized'});
		} else {
			return ManagerGame._instance;
		}
	}
	//------------------------Свойства--------------------------
	// Фиксируем события, с коллбэками
	listeners = {} // objName: [{eventName: eventName, callback: fn}]
	// Фиксируем таймеры
	timers = {
		delays: {},
		timeouts: {},
		intervals: {}
	}
	
	working = false; // false - игра не запущена, true - игра запущена, можно играть
	running = false // false - закончен run(), true - в процессе выполнения
	waiting = false // false - можно начинать новый run(), true - нельзя
	isDev = false // false - можно начинать новый run(), true - нельзя, когда режим разработки
	
	mode = 'menu'
	
	allowSaving = true // Разрешено ли производить сохранение
	
	chapter = 'none';
	isChaptered = false;
	
	inventory = new Map();
	inventoryButton = {
		instance: null,
		type: '',
	}
	isInventory = false;
	inventoryDescription = {
		field: null,
		text: null
	}
	
	shadowBack = null
	shadowBackOpacity = 0.9;
	
	display = {
		back: null,
		color: [],
		opacity: -1
	}; // Есть ли какой-то экран, меняющий дисплей
	
	// Инпуты
	inputs = {}
	
	// Положения для персонажей
	positions = {}
	
	// Информация
	info = {}
	
	// Статы
	stats = {}
	
	// Достижения
	achievements = {}
	//------------------------Методы----------------------------
	// Сохранение игры
	async save(name) {
		if (!this.allowSaving) { // Нельзя сохраняться
			return;
		}
		const saves = structuredClone(saveData());
		if (name === 'autosave') { 
			const oldSaves = await this.runtime.storage.getItem('autosave');
			await this.runtime.storage.setItem('prevAutosave', oldSaves);
			// Смысл этого очень прост: если игрок резко выйдет при сохранении
			// в хранилище могут неправильно сохраниться данные (с ошибкой), так, что
			// потом будет не загрузить, чтобы избежать этого, делаем сначала 
			// сохранение в ячейку prevAutosave того, что было (если игрок выйдет на этом этапе -
			// ничего страшного, prevAutosave пусть и с ошибкой, autosave осталось невредимым),
			// и если не получается загрузиться на autosave, загрузимся на prevAutosave
		}
		await this.runtime.storage.setItem(name, saves);
		
		/*
		Возможность сохранения на облачный сервер, чтобы возможность играть была с разных устройств
		Думаю, возможно стоит рассмотреть такое сохранение исключительно после окончания уровня, 
		чтобы сильно не перегружать сервер, хотя кто знает
		await fetch('http://localhost:1234/save', {
			method: 'POST',
  			headers: {
    		  	'Content-Type': 'application/json;charset=utf-8'
  			},
  			body: JSON.stringify(saves)
		});
		*/
		return JSON.stringify(saves);
	}
	
	// Сохраняем состояние менеджера игры
	saveStates() {
		const saves = {};
		saves.inventory = new Map();
		// Сохраняем инвентарь
		for (const elem of this.inventory) {
			saves.inventory.set(...elem)
		}
		
		// Сохраняем таймеры
		saves.timers = structuredClone(this.timers);
		// Сохраняем название главы
		saves.chapter = this.chapter;
		saves.allowSaving = this.allowSaving;
		if (this.shadowBack !== null) {
			saves.shadow = this.shadowBackOpacity;			
		} else {
			saves.shadow = null;
		}
		return saves;
	}
	
	// Загружаем состояние менеджера игры
	loadStates(loads) {
		// Загружаем инвентарь
		for (const elem of loads.inventory){
			this.inventory.set(...elem);
		}
		
		// Загружаем таймеры
		this.timers = structuredClone(loads.timers);
		// Загружаем главу
		this.chapter = loads.chapter;
		this.allowSaving = loads.allowSaving;
		if (loads.shadow) {
			this.shadowBackground('show', loads.shadow);
		}
		logger.add({type: 'info', text: 'end loading managerGame states'});
		return;
	}
	
	// Очистка состояния менеджера игры перед переходом на layout меню
	clear() {
		// Удаляем все события, кроме основных, нужно ли?
		for (const key in this.listeners) {
			if (key !== 'main') {
				for (let i = 0; i < this.listeners[key].length; i++) {
					this.deleteEvent(key, this.listeners[key][i].eventName);
				}
				delete this.listeners[key];
			}
		}
		// Очищаем все таймеры
		for (const key in this.timers) {
			this.timers[key] = {};
		}
		// Очищаем ожидание событий контроллером
		controller.clear();
		this.chapter = ''; // Обнулили главу
		this.allowSaving = true; // Снова можно сохранять
		this.waiting = false; // 
		this.running = false;
		this.working = false;
		this.isChaptered = false;
		this.isDev = false;
		// Очищаем инвентарь
		this.isInventory = false;
		this.inventoryButton.instance = null;
		this.inventoryButton.type = '';
		this.inventoryDescription.field = null;
		this.inventoryDescription.text = null;
		this.inventory.clear();
		this.mode = 'menu';
		this.display = {
			back: null,
			color: [],
			opacity: -1
		};
		this.shadowBack = null;
		return;
	}
	
	// Загрузка игры
	async load(name) {
		let loads = await this.runtime.storage.getItem(name);
		if (loads === null) { // Произошла ошибка
			if (name === 'autosave') { // Загружали autosave
				loads = await this.runtime.storage.getItem('prevAutosave');
			} else { // Загружали не autosave
				throw new Error(`Load Error: don't exist save with name ${name} or Saved data is damaged and cannot be loaded`);
			}
		}
		await loadData(loads);
		return;
	}
	
	// Работа с аудио
	audio(cmd, ...params) {
		if (audioManager.working) { // Если аудиоменеджер работает
			try {
				audioManager[cmd](...params); // Выполняем функцию	
			} catch(e) {
				this.runtime.alert(e.message); // Оставим пока так, чтобы отслеживать на телефоне
				errorManager.handle(e); // Или обрабатываем ошибку при ее неудачном выполнении
			}			
		}
		return;
	}
	
	//--------------------Главные методы
	check() {
		const script = 
		`try {
			var gui = require("nw.gui");
			var win_main = gui.Window.get();
			win_main.enterFullscreen();
		} catch(e) {
			console.error(e);
		}
		`

		globalThis.mainScript(this.runtime, script);
	}
	
	// Запустить переданный код
	handleCode(code) {
		try {
			eval(`(async ()=> {\n${code}\n})()`);
		} catch(e) {
			errorManager.handle(e);
			logger.add({type: 'info', text: 'Неверно использован блок кода в скрипте.'})
		}
	}
	
	// Показать стат
	async stat(stat, value) {
		if (!options.stats.hasOwnProperty(stat)) {
			throw new Error(`managerGame Error: don't exist stat with name ${stat}`);
		}
		this.audio('play', 'stat', 0.8)
	
		let statName = stat;
		if (value > 0) {
			statName += 'Inc';
		} else {
			statName += 'Dec';
		}
		options.stats[stat] += value;
		const field = await HTMLPicture.create('fStat', 960, 80);
		const icon = await HTMLPicture.create(statName, 820, 80);		
		const text = await GameText.create('statText', [975, 80], `<p class="text white">${this.stats[stat][settingsManager.main.language]}  ${value > 0 ? '+  ' : '- '}${Math.abs(value)}</p>`);
		
		const date = Date.now();
		
		const endStat = function() {
			this.deleteEvent(`stats-${date}`, 'hide');
			text.destroy();
			icon.destroy();
			field.destroy();
		}.bind(this);
		
		
		let count = 64;
		const timer = function() {
			count -= this.runtime.dt/0.0166;
			if (count <= 0) {
				this.dispatch(`stats-${date}`, 'hide');
			} else {
				globalThis.nextTick(timer);
			}
		}.bind(this);
		
		field.addEventListener('changeOpacityEnded', ()=> {
			if (count > 0) {
				timer() ;
			} else {
				globalThis.nextTick(endStat);
			}
		});
		
		const hide = async function() {
			await text.changeOpacity(1, 0, 1);
			await icon.changeOpacity(1, 0, 1);
			await field.changeOpacity(1, 0, 1);
		}
		
		this.addEvent(`stats-${date}`, 'hide', hide);
		return;
	}
	
	// Показать достижение
	async getAchievement(name) {
		if (!achievements.hasOwnProperty(name)) {
			throw new Error(`managerGame Error: don't exist achievement with name ${name}`);
		}
		if (achievements[name]) {
			console.log('Достижение уже получено')
			return;
		}
		this.audio('play', 'ach', 0.8)
		const fAch = await HTMLPicture.create('fAch',  1670, 920);
		const text = await GameText.create('achivementText', [1670, 888], `<p class="text white vmin2">Получено достижение!</p>`);
		const upLine = await HTMLPicture.create('lAch', 1670, 914);
		const achName = await GameText.create('achivementName', [1670, 954], `<p class="text white vmin2_5">${this.achievements[name][settingsManager.main.language]}</p>`);
		const downLine = await HTMLPicture.create('lAch',  1670, 994);
		
		const endAch = function() {
			this.deleteEvent(`achievment-${name}`, 'hide')
			fAch.destroy();
			text.destroy();
			upLine.destroy();
			achName.destroy();
			downLine.destroy();
		}.bind(this);
		

		
		let count = 80;
		const timer = async function() {
			count -= this.runtime.dt/0.0166;
			if (count <= 0) {
				this.dispatch(`achievment-${name}`, 'hide');
			} else {
				globalThis.nextTick(timer);
			}
		}.bind(this);
		
		fAch.addEventListener('changeOpacityEnded', ()=> {
			if (count > 0) {
				timer();
			} else {
				globalThis.nextTick(endAch);
			}
		})
		
		const hide = async function() {
			await text.changeOpacity(1, 0, 1);
			await upLine.changeOpacity(1, 0, 1);
			await achName.changeOpacity(1, 0, 1);
			await downLine.changeOpacity(1, 0, 1);
			await fAch.changeOpacity(1, 0, 1);
		}
		
		achievements[name] = true;
		await saveAchievements(this.runtime);
		this.addEvent(`achievment-${name}`, 'hide', hide);
		return;
	}
	
	// Показать плашку с информацией (2 режима: bool = true, то info - ключ в объекте this.info, из которого берем нужный текст, если bool = false, то info текст, который нужно показать)
	async getInfo(bool, info, top=false) { 
		this.audio('play', 'info'); // Запускаем audio появления плашки с информацией
		let infoText = info;
		if (bool) { // Проверяем режим
			infoText = this.info[info][settingsManager.main.language]
		}
		
		const y = top ? 160 : 300;
		
		const field = await HTMLPicture.create('fieldInfo',  960, y); // Плашка для текста
		const text = await GameText.create('infoText', [960, y], `<p class="text dark">${infoText}</p>`); // Текст
 
 		const date = Date.now();
 
		const endInfo = function() {
			this.deleteEvent(`info-${date}`);
			text.destroy();
			field.destroy();
		}.bind(this);
				
		let count = 150;
		const timer = async function() {
			count -= this.runtime.dt/0.0166;
			if (count <= 0) {
				this.dispatch(`info-${date}`, 'hide');
			} else {
				globalThis.nextTick(()=> timer());
			}
		}.bind(this);
		
		field.addEventListener('changeOpacityEnded', ()=> {
			if (count > 0) {
				timer();
			} else {
				endInfo();
			}
		});
		
		const hide = async function() {
			await text.changeOpacity(1, 0, 1);
			await field.changeOpacity(1, 0, 1);
		}
		
		this.addEvent(`info-${date}`, 'hide', hide);
		return;
	}
	
	// Переходит к следующей строке скрипта
	async run() {
		try {
			if (!this.working || this.running || this.waiting || this.isInventory || this.isDev) {
				return;
			}
			this.running = true; // Началось выполнение
			
			const endLine = this.dispatchEndLine();
			let answer;
			do {
				answer = await endLine.next().value;
			} while (answer);
			
			this.read();
		} catch(e) {
			errorManager.handle(e);
			let message = `Critical: Error occurs during read script chapter: ${options.chapter}, label: ${options.label}, line: ${options.line}`;
			if (options.temps.length !== 0) {
				message += ` temp type: ${options.temps[options.temps.length-1].type}, line: ${options.temps[options.temps.length-1].line}`;
			}
			errorManager.handle(new Error(message));
		}
		return;
	}
	
	// Асинхронный генератор, выполняющий события, начинающиеся с 'endLine', при переходе на следующую строку
	*dispatchEndLine() {
		for (const name in this.listeners) {
			for (let i = this.listeners[name].length-1; i >= 0; i--) {
				if (this.listeners[name][i].eventName.includes('endLine')) {
					yield new Promise(resolve => {
						this.dispatch(name, this.listeners[name][i].eventName);
						
						const endPromise = function() {
							if (i === this.listeners[name].length) {
								resolve(`удалили`)
							} else {
								globalThis.nextTick(endPromise)
							} 
						}.bind(this);
						
						endPromise();
					}); 
				}
			}
		}
	}
	
	// Читает строку скрипта
	read() {
		if (!chapters.hasOwnProperty(options.chapter)) { // Нет такой главы
			throw new Error(`Chapter ${options.chapter} doesn't exist`);
		}
		if (!chapters[options.chapter].script.hasOwnProperty(options.label)) { // Нет такой метки
			throw new Error(`Label ${options.label} doesn't exist in chapter ${options.chapter}`);
		}
		
		let arrStrings; // Будущий массив со строками
		
		// Блок получения строки текста, которая будет воспроизводиться
		try {
			if (options.temps.length === 0) { // Обычное выполнение
				if (options.chapter !== this.chapter && options.label === 'start' && options.line === 0) {
					return this.startChapter();
				}
				if (chapters[options.chapter].script[options.label][options.line] === undefined) { // Строк не осталось, возвращаемся в главное меню
					return this.goToMenu();
					//return this.prepareEndGame();
				} else { // Строки еще есть
					arrStrings = chapters[options.chapter].script[options.label][options.line].slice();
				}
			} else { 
				const scriptPoint = structuredClone(options.temps[options.temps.length-1]);
				if (scriptPoint.type === 'choice' || scriptPoint.type === 'show' || scriptPoint.type === 'temp') { // Ветка выбора
					if (scriptPoint.script[scriptPoint.line] === undefined || scriptPoint.script[scriptPoint.line].length === 0) { // Закончилась точка
						options.temps.pop();
						this.running = false;
						return this.run();
					} else {
						arrStrings = scriptPoint.script[scriptPoint.line].slice();
					}
				} else {
					if (chapters[scriptPoint.chapter].script[scriptPoint.label][scriptPoint.line] === undefined) { // Строк не осталось
						options.temps.pop();
						this.running = false;
						return this.run();
					} else { // Строки еще есть
						arrStrings = chapters[scriptPoint.chapter].script[scriptPoint.label][scriptPoint.line].slice();
					}
				}
			}		
		} catch(e) {
			errorManager.handle(e);
			throw new Error(`ReadError: fail to get the line of the text`);
		}
				
		// Непосредственный блок трансляции строк текста в скрипт
		// И выполнение посредством eval этого скрипта
		try {
			const script = translater(arrStrings);
			try {
				eval(script);
			} catch(e) {
				errorManager.handle(e);
				logger.add({type: 'info', text: `The last line of the script that caused the error:\n${script}`});
				throw new Error(`EvalError: fail to eval script from translater`);
			}
		} catch(e) {
			if (e.message.startsWith('EvalError')) {
				throw e;
			} else {
				errorManager.handle(e);
				logger.add({type: 'info', text: `The last line of the text that caused the error:\n${arrStrings.join('\n')}`});
				throw new Error(`TranslaterError: fail to translate text to script`);
			}
		}
		return;
	}
	
	// подготовка кнопок ui
	async prepareUiButton(name='invC') {
		if (this.inventoryButton.instance !== null && name !== this.inventoryButton.type) {
			this.inventoryButton.instance.destroy();
		} else if (this.inventoryButton.instance !== null && name === this.inventoryButton.type) {
			return;
		}
		this.inventoryButton.instance = await HTMLPicture.create(name, 1792, 80);
		this.inventoryButton.type = name;
		const clickInventory = function() {
			controller.dispatch('click');
			this.interactInventory();
		}.bind(this);
		
		this.inventoryButton.instance.addEventListener('clicked', clickInventory);
		uiManager.addButton(this.inventoryButton.instance, 'clicked', 'noanimation-hover-sound(c-button)');
		return;
	}
	
	async addToInventory(name, type) {
		if (this.inventory.has(name)) {
			return;
		}
		this.inventory.set(name, type);
		this.audio('play', 'a-inv');
		await this.prepareUiButton('invO');
		return;
	}
	
	async interactInventory() {
		if (this.waiting || this.isChaptered) {
			return;
		}
		if (!this.isInventory) { // Открываем инвентарь
			this.isInventory = true;
			if (this.inventory.size === 0) {
				this.interactInventory();
				return;
			}
			this.audio('play', 'inv');
			GameText.isVisible(false);
			for (let i = 0; i < this.inputsTexts.length; i++) {
				if (this.inputsTexts[i] !== null && this.inputsTexts[i].y > 0) {
					this.inputsTexts[i].y *= -1;
				}
			}
			
			const leftArrow = await HTMLPicture.create('bigAL', -500, 540);
			const rightArrow = await HTMLPicture.create('bigAR', -1500, 540);
			
			const interPic = async function(name, type, cmd) {
				let method = cmd;
				if (type === 'svg') {
					method += 'SVG';
				}
				method += 'Image';
				if (cmd === 'show') {
					await this[method](name, 960, 540, 'preUi');
					const position = [];
					let description = '';
					if (type === 'svg') {
						position.push(...SVGPicture.getSize(name));
						description = SVGPicture.getDescription(name);
					} else {
						position.push(...Picture.getSize(name));
						description = Picture.getDescription(name);
					}
					globalThis.nextTick(()=> {
						leftArrow.x = 1025-position[0];
						rightArrow.x = 895+position[0];						
					});	
					if (description !== null) {
						this.inventoryDescription.field = await HTMLPicture.create('invDescription', 960-position[0]+258, 540-position[1]+60);
						this.inventoryDescription.text = await GameText.create('inventory', [946.5-position[0]+258, 540-position[1]+60], `<p class="text dark vmin2_3">${description}</p>`);	
					}
				} else {
					if (this.inventoryDescription.field !== null) {
						this.inventoryDescription.field.destroy();
						this.inventoryDescription.field = null;
					}
					if (this.inventoryDescription.text !== null) {
						this.inventoryDescription.text.destroy();
						this.inventoryDescription.text = null;
					}

					await this[method](name);
				}
			}.bind(this);
			
			const items = [...this.inventory]; 
			let index = 0;
			
			for (let i = 0; i < items.length; i++) {
				await interPic(...items[i], 'hide'); // Убираем, если картинка демонстрировалась перед заходом в инвентарь
			}			
			const background = this.runtime.objects.colorBackground.createInstance('preUi', -100, -100);
			background.colorRgb = [0, 0, 0];
			background.opacity = 0.7;
			[background.width, background.height] = [1920, 1080];
			[background.x, background.y] = [0, 0];
			
			await interPic(...items[index], 'show');
		
			const changePic = async function(value) {
				controller.dispatch('click');
				if (items.length === 1) {
					return;
				}
				await interPic(...items[index], 'hide');
				if (value === 1) {
					if (items.length-1 === index) {
						index = 0;
					} else {
						++index;
					}
				} else {
					if (index === 0) {
						index = items.length-1;
					} else {
						--index;
					}
				}
				
				await interPic(...items[index], 'show'); 
	
				leftArrow.moveToTop();
				rightArrow.moveToTop();
			}.bind(this);
			
			leftArrow.addEventListener('clicked', ()=> changePic(-1));
			rightArrow.addEventListener('clicked', ()=> changePic(1));
			uiManager.addButton(leftArrow, 'clicked', 'noanimation-hover-sound(c-button)');
			uiManager.addButton(rightArrow, 'clicked', 'noanimation-hover-sound(c-button)');
			
			const closeInventory = async function() {
				this.deleteEvent('inventory', 'closeInventory');
				this.isInventory = false;
				await interPic(...items[index], 'hide');
				leftArrow.destroy();
				rightArrow.destroy();
				background.destroy();
				this.audio('play', 'inv');
			}.bind(this);
			
			this.addEvent('inventory', 'closeInventory', closeInventory);
		} else {
			GameText.isVisible(true);
			for (let i = 0; i < this.inputsTexts.length; i++) {
				if (this.inputsTexts[i] !== null && this.inputsTexts[i].y < 0) {
					this.inputsTexts[i].y *= -1;
				}
			}
			this.isInventory = false;
			this.prepareUiButton();
			this.dispatch('inventory', 'closeInventory');
		}
	}
	
	// Стоит продумать мягкое появление и исчезновение
	async startChapter() {
		this.isChaptered = true;
		logger.add({type: 'info', text: `Start new chapter ${options.chapter}`});
		await this.save(options.chapter); // Сохраняем доступ к новой главе
		this.chapter = options.chapter; // Делаем отметку, что игрок просмотрел заголовок
		await this.save('autosave'); // Делаем автосохранение, чтобы продолжив, игрок не видел заголовок еще раз
		const background = this.runtime.objects.colorBackground.createInstance('ui', -100, -100);
		background.colorRgb = [0, 0, 0];
		[background.width, background.height] = [1920, 1080];
		[background.x, background.y] = [0, 0];
		const line = this.runtime.objects.chapterLine.createInstance('ui', 960, 540);
		
		const volume = await GameText.create('chapterDisplay', [960, 450], `<p class="text white vmin9">Глава ${chapters[this.chapter].info.volume}</p>`);
		const title = await GameText.create('chapterDisplay', [960, 635], `<p class="text white vmin6"><i>${chapters[this.chapter].info.title}</i></p>`)
		
		this.audio('play', 's-chapter');
		
		const end = function() {
			background.destroy();
			line.destroy();
			title.destroy();
			volume.destroy();
			this.isChaptered = false;
		}.bind(this);
		
		background.addEventListener("destroy", ()=> this.deleteEvent('managerGame', 'endLineNewChapter'));
		
		this.addEvent('managerGame', 'endLineNewChapter', end);
		this.running = false;
		return;
	}
	
	// Переход в меню
	goToMenu() {
		this.clear();
		audioManager.stopAll();
		this.runtime.goToLayout('menu');	
	}
	
	// Подготовка к выходу из игры
	prepareEndGame() {
		this.addEvent('main', 'closeApp', this.endGame);
		if (logger.getTexts('closeApp')) {
			return; //this.endGame();
		} 
		return this.endGame();
	}
	
	// Закрытие игры
	endGame() {	
		//globalThis.mainScript(this.runtime, `globalThis.window.close();`);
		//globalThis.mainScript(this.runtime, 'process.exit(1);'); трей остается
		//this.runtime.callFunction('exit');
		

		// Вариант для nw.js
		/*const script = 
		`try {
			var gui = require("nw.gui");
			var win_main = gui.Window.get();
			win_main.removeAllListeners('close');
			
			win_main.on('close', function() {
				try {
					this.hide();
					this.close(true);
				} catch(e) {
					console.error(e)
				}
			});
			win_main.close();
		} catch(e) {
			console.error(e);
		}*/

		// Вариант для браузера
		const script = 
		`try {
			globalThis.window.close();
		} catch(e) {
			console.error(e)
		}`;

		globalThis.mainScript(this.runtime, script);
	}
	
	// Тиковая функция
	tick() {
		const dt = Math.trunc(this.runtime.dt*1000);
		const delays = Object.getOwnPropertySymbols(this.timers.delays);
		for (let i = 0; i < delays.length; i++) {
			const key = delays[i];
			this.timers.delays[key].time -= dt;
			if (this.timers.delays[key].time <= 0) {
				this.timers.delays[key].callback();
				delete this.timers.delays[key];
			}
		}
		const timeouts = Object.getOwnPropertySymbols(this.timers.timeouts);
		for (let i = 0; i < timeouts.length; i++) {
			const key = timeouts[i];
			this.timers.timeouts[key].time -= dt;
			if (this.timers.timeouts[key].time <= 0){
				this.timers.timeouts[key].callback();
				delete this.timers.timeouts[key];
			}
		}
		const intervals = Object.getOwnPropertySymbols(this.timers.intervals);
		for (let i = 0; i < intervals.length; i++) {
			const key = intervals[i];
			this.timers.intervals[key].time -= dt;
			if (this.timers.intervals[key].time <= 0) {
				this.timers.intervals[key].callback();
				this.timers.intervals[key].time = this.timers.intervals[key].duration;
			}
		}
		return;
	}
	
	// Панель разработчика
	devs = {
		ready: false,
		info: {
			field: null,
			text: null
		},
		console: {
			field: null,
			text: null,
			input: null,
			button: null,
			buttonText: null,
			comment: '',
		},
		texts: {
			field: null,
			texts: []
		}
	}
	
	// Показать информацию для разработчиков
	async devInfo() {
		if (this.devs.info.field === null) {
			this.dispatch('development', 'hideConsole');
			this.dispatch('development', 'hideTexts');
			this.isDev = true;
			this.devs.info.field = await HTMLPicture.create('devInfo', 960, 150);
			this.devs.info.text = await GameText.create('devInfo', [960, 150], `<p class="text black vmin2"><b>Краткая инструкция для тестеров:</b><br><br>Показать/убрать дополнительную информацию - кнопка <b>F1</b><br>Показать/убрать консоль для написания комментариев - кнопка <b>F2</b><br>Получить информацию о работе игры (необходимо при возникновении ошибок или каждый раз перед закрытием приложения) - кнопка <b>F3</b><br>Показать/убрать экран для редактирования текста (если заметили ошибку в тексте) - кнопка <b>F4</b><br>Получить текстовый файл отредактированных текстов (необходимо каждый раз перед закрытием приложения) - кнопка <b>F5</b></p>`);
			
			const end = function() {
				this.deleteEvent('development', 'hideInfo')
				this.devs.info.field.destroy();
				this.devs.info.field = null;
				this.devs.info.text.destroy();
				this.devs.info.text = null;
			}.bind(this);
			
			this.addEvent('development', 'hideInfo', end);		
		} else {
			this.isDev = false;
			this.dispatch('development', 'hideInfo');
		}
		return;
	}
	
	// Показать консоль для ввода комментариев
	async devConsole() {
		if (this.devs.console.field === null) {
			this.dispatch('development', 'hideInfo');
			this.dispatch('development', 'hideTexts');
			this.isDev = true;
			this.devs.console.field = await HTMLPicture.create('devConsole', 960, 150);
			this.devs.console.text = await GameText.create('devConsole', [960, 80], `<p class="text black vmin2">Если есть какие-то замечания/предложения по игре, введи текст и нажми на кнопку "Добавить комментарий" (редактировать текст нужно через кнопку <b>F4</b>). Не забудь получить информацию об игре каждый раз перед закрытием - кнопка <b>F3</b>, тогда мы точно получим замечения и предложения:)</p>`);
			this.devs.console.input = this.runtime.objects.devConsole.createInstance('ui', 510, 160);
			this.devs.console.input.text = this.devs.console.comment;
			this.devs.console.button = await HTMLPicture.create('addSetB', 960, 320);
			this.devs.console.buttonText = await GameText.create('menuText', [960, 320], `<p class="text white vmin2">Добавить комментарий</p>`);
			
			const clicked = function() {
				if (this.devs.console.input.text === '') return;
				logger.add({type: 'tester', text: this.devs.console.input.text});
				this.devs.console.input.text = '';
				this.devs.console.comment = '';
			}.bind(this);
			
			this.devs.console.button.addEventListener('clicked', clicked);
			
			uiManager.addButton(this.devs.console.button, 'clicked', 'special-noanimation-hover-sound(c-button)')
			
			const end = function() {
				this.deleteEvent('development', 'hideConsole');
				this.devs.console.comment = this.devs.console.input.text;
				this.devs.console.field.destroy();
				this.devs.console.field = null;
				this.devs.console.text.destroy();
				this.devs.console.text = null;
				this.devs.console.input.destroy();
				this.devs.console.input = null;
				this.devs.console.button.destroy();
				this.devs.console.button = null;
				this.devs.console.buttonText.destroy();
				this.devs.console.buttonText = null;
			}.bind(this);
			
			this.addEvent('development', 'hideConsole', end);
		} else {
			this.isDev = false;
			this.dispatch('development', 'hideConsole');
		}
		return;
	}
	
	// Редактироование текста
	async devText() {
		if (GameText.currentInstances.length !== 0 && this.devs.texts.field === null) {
			this.dispatch('development', 'hideInfo');
			this.dispatch('development', 'hideConsole');
			this.isDev = true;
			this.devs.texts.field = await HTMLPicture.create('devText', 960, 540);
			for (let i = 0; i < GameText.currentInstances.length; i++) {
				const text = this.runtime.objects.devTextInput.createInstance('ui', 460, 200+150*i);
				[text.width, text.height] = [1000, 150];
				text.text = GameText.currentInstances[i].textContent;
				text.scrollToBottom();
				this.devs.texts.texts.push(text);
			}
			
			const end = function() {
				this.deleteEvent('development', 'hideTexts');
				for (let i = 0; i < GameText.currentInstances.length; i++) {
					const text = this.devs.texts.texts[i];
					if (GameText.currentInstances[i].textContent !== text.text) {
						logger.addText(text.text);
					}
					globalThis.nextTick(()=> text.destroy());
				}
				this.devs.texts.texts = [];
				this.devs.texts.field.destroy();
				this.devs.texts.field = null;
			}.bind(this);
			
			this.addEvent('development', 'hideTexts', end);			
		} else if (this.devs.field !== null) {
			this.isDev = false;
			this.dispatch('development', 'hideTexts');
		}
		return;
	}
	
	//--------------------Cобытийные методы
	addEvent(name, eventName, fn) {
		try {
			if (!this.listeners.hasOwnProperty(name)) {
				this.listeners[name] = [];
			}
			this.listeners[name].push({
				eventName: eventName,
				callback: fn
			});
			this.addEventListener(`${eventName}_${name}`, fn);
		} catch(e) {
			console.error(e.message);
		}
		return;
 	}
	
	deleteEvent(name, eventName) {
		try {
			if (this.listeners.hasOwnProperty(name)) {
				for (let i = 0; i < this.listeners[name].length; i++) {
					if (this.listeners[name][i].eventName === eventName) {
						this.removeEventListener(`${eventName}_${name}`, this.listeners[name][i].callback);
						this.listeners[name] = this.listeners[name].filter((elem, index) => index !== i);
						break;
					}
				}
			}
		} catch(e) {
			console.error(e.message);
		}
		return;
	}
	
	dispatch(name, eventName) {
		const e = new Event(`${eventName}_${name}`);
		this.dispatchEvent(e);
		return;
	}
	
	//--------------------Таймеры
	// Добавить таймер
	addTimer(name, time, callback) {
		if (name.description.startsWith('delay')) {
			this.timers.delays[name] = {
				time: time,
				callback: callback
			}
		} else if (name.description.startsWith('timeout')) {
			this.timers.timeouts[name] = {
				time: time,
				callback: callback
			}
		} else if (name.description.startsWith('interval')) {
			this.timers.intervals[name] = {
				time: time,
				callback: callback,
				duration: time
			}			
		}
		return;
	}
	
	delay(sec) {
		const time = sec < 0.05 ? 50 : sec*1000;
		return new Promise((resolve, reject) => {
			const date = Date.now();
			
			const endPromise = function() {
				resolve();
			}.bind(this);
			
			const name = Symbol(`delay-${date}-time:${time}`);
			
			this.addTimer(name, time, endPromise);
		});
	}
	
	timeout(sec, props) {
		const date = Date.now();
		const time = sec < 0.05 ? 50 : sec*1000;
		const callback = function() {
			const script = `(async ()=> {\n${props}})();`;
			eval(script);
		}.bind(this);
		const name = Symbol(`timeout-${date}-time:${time}`);
		
		this.addTimer(name, time, callback);
		return;
	}
	
	interval(bool, userName, sec, props) {
		const intervalName = `interval-${userName}`; // Имя интервала 
		if (bool) { // Устанавливаем интервал
			const time = sec < 0.05 ? 50 : sec*1000;
			const callback = function() {
				const script = `(async ()=> {\n${props}})();`;
				eval(script);
		}.bind(this);
		const name = Symbol(intervalName);
		
		this.addTimer(name, time, callback);
		
		} else { // Удаляем интервал
			const intervals = Object.getOwnPropertySymbols(this.timers.intervals);
			for (let i = 0; i < intervals.length; i++) {
				if (intervals[i].description === intervalName) {
					delete this.timers.intervals[intervals[i]];
					break;
				}
			} 
		}
		return;
	}
	
	addTemp(lines) {		
		options.temps.push({
			type: 'temp',
			line: 0,
			script: transformate(lines)
		});
		return;
	}
	
	// Создание дополнительных развилок
	async showLines(lines, loop = false) {
		if (lines[0].length === 0) { // Пустой show, пропускаем
			if (options.temps.length === 0) {
				++options.line;
			} else {
				++options.temps[options.temps.length-1].line;
			}
			this.running = false; // Делаем снова возможным чтение скрипта
			return await this.run(); // Запускаем скрипт
		}

		if (!loop) {
			if (options.temps.length != 0) {
				++options.temps[options.temps.length-1].line;
			} else {
				++options.line;
			}			
		}
		options.temps.push({
				type: 'show',
				line: 0,
				loop: loop,
				script: lines.slice()
		});
		this.running = false;
		return await this.run();
	}
	
	inputsTexts = []
	
	// Ввод текста
	async input(variable, text, caseIns) {
		// Создаем плашку для инпута
		const fieldInput = await this.add('fInput', 'preUi', 960, 540);
		// Создаем кнопку отправки
		const fieldButtonInput = await this.add('bInput', 'preUi', 960, 740);
		// Текст кнопки
		const fieldButtonInputText = await GameText.create('fieldButtonInputText', [960, 740], `<p class="text light">${this.inputs['playerInput'].buttonText[settingsManager.main.language]}</p>`, 'preUi');
		// Текст вопроса
		const fieldInputText = await GameText.create('fieldInputText', [960, 440], `<p class="text light">${text}</p>`, 'preUi');
		// Текст игрока
		const playerInputText = this.runtime.objects.TextInput.createInstance('preUi', 670, 512);
		
		this.inputsTexts.push(playerInputText);
		// Устанавливаем placeholder в соответствии с языком
		playerInputText.placeholder = this.inputs['playerInput'].placeholder[settingsManager.main.language];
		// Устанавливаем максимальную длину
		playerInputText.maxLength = this.inputs['playerInput'].maxLength;		

		// При нажатии кнопки - отправляем результт
		const inputDone = async function() {
			fieldButtonInput.removeEventListener('inputDone', inputDone);
			
			
			let playerText = !playerInputText.text || playerInputText.text.includes('Введите текст') ? 'Антуан Лапьер' : playerInputText.text.trim();
			
			if (caseIns) { // Требуется регистронезависимый инпут
				playerText = playerText.toLowerCase();
			}
			
			
			eval(`${variable} = '${playerText}'`);
			this.inputsTexts = this.inputsTexts.filter(elem => elem.uid !== playerInputText.uid);
			fieldInput.destroy();
			fieldButtonInput.destroy();
			fieldInputText.destroy();
			playerInputText.destroy();
			fieldButtonInputText.destroy();
			this.running = false;
			await this.run();
		}.bind(this);
		
		fieldButtonInput.addEventListener('inputDone', inputDone);
	}
	
	//--------------------Взаимодействие с персонажами
	// Показать персонажа
	async showPerson(name, position, effect='none', ...params) {
		await Person.show(name, this.positions[position].slice(), effect, ...params);
		return; 
	}
	
	// Убрать персонажа
	async hidePerson(name, effect='none', ...params) {
		await Person.hide(name, effect, ...params);
		return;
	}
	
	// Поменять значение у свойства у персонажа
	change(name, prop, value) {
		Person.change(name, prop, value);
		return;
	}
	
	// Спрятать актинг
	active(name, bool, once = false) {
		const person = Person.getPerson(name);
		const value = bool === 'true' ? true : false;
		// Если экземпляра еще нет
		if (person === null) {
			if (!once) {
				Person.addWait(name, {hideActive: [value]})
			}
			return;
		}
		
		if (once) {
			const date = Date.now();
			const returnActive = function() {
				person.hideActive(!value);
				this.deleteEvent(name, `endLineHideActive-${date}`);
			}.bind(this);
			
			this.addEvent(name, `endLineHideActive-${date}`, returnActive);
		}
		
		person.hideActive(value);
		return;
	}
	
	// Отразить персонажа
	mirror(name, once = false) {
		const person = Person.getPerson(name);
		
		// Если экземпляра еще нет
		if (person === null) {
			if (!once) {
				Person.addWait(name, {mirror: []})
			}
			return;
		}
		
		if (once) {
			const date = Date.now();
			const returnMirror = function() {
				person.mirror();
				this.deleteEvent(name, `endLineMirror-${date}`);
			}.bind(this);
			
			this.addEvent(name, `endLineMirror-${date}`, returnMirror);
		}
		
		person.mirror();
		return;
	}
	
	// Смена анимации
	animate(name, animationName, once = false) { // once = true, если только на одну реплику заменить
		
		const person = Person.getPerson(name);
		
		// Если экземпляра еще нет
		if (person === null) {
			if (!once) {
				Person.addWait(name, {animate: [animationName]});
			}
			return;
		}
		
		if (once) { // Лишь на одну фразу
			const oldAnimation = person.animationName;
			
			const date = Date.now();
			const returnAnimation = function() {
				person.animate(oldAnimation);
				this.deleteEvent(name, `endLineAnimation-${date}`);
			}.bind(this);
			
			this.addEvent(name, `endLineAnimation-${date}`, returnAnimation);
		}
		person.animate(animationName);
		return;
	}
	
	// Сделать персонажа тенью
	shadow(name, bool, once = false) {
		const person = Person.getPerson(name);
		const value = bool === 'true' ? true : false;
		
		if (person === null) {
			Person.addWait(name, {makeShadow: [value]})
			return;
		}
		
		if (once) { // Лишь на одну фразу		
			const date = Date.now();
			const returnShadow = function() {
				person.makeShadow(!value);
				this.deleteEvent(name, `endLineShadow-${date}`);
			}.bind(this);
			
			this.addEvent(name, `endLineShadow-${date}`, returnShadow);
		}
		
		person.makeShadow(value);
		return;
	}
	
	/*// Изменить прозрачность персонажа
	async opacity(name, value, once = false) {
		const personName = this.returnName(name);
		const person = this.runtime.objects[personName].getFirstInstance();
		
		if (options.acting.name === name) {
			await this.acting(name, false);
			options.acting.name = '';
		}
		
		if (once) {
			const oldValue = person.opacity;
			
			const date = Date.now();
			const returnOpacity = function() {
				person.opacity = oldValue;
				this.deleteEvent(name, `endLineOpacity-${date}`);
			}.bind(this);
			
			this.addEvent(name, `endLineOpacity-${date}`, returnOpacity);
		}
		person.opacity = value/100;
		return;
	}*/
	
	//--------------------Взаимодействие с Фоном
	// Показ фона
	async showBackground(name, style = 'none', params=[]) {
		await Background.show(name, style, params);		
		return;
	}
	
	// Удаление фона
	async hideBackground(name, style = 'none', params=[]) {
		await Background.hide(name, style, params);
		return;
	}
	
	// Работа с тенью на фоне
	shadowBackground(type, opacity = 0.9) {
		if (type === 'show') {
			if (this.shadowBack !== null) {
				this.shadowBackground('hide');
			}
			this.shadowBack = this.runtime.objects.light.createInstance('shadows', -100, -100);
			[this.shadowBack.x, this.shadowBack.y] = [960,540];
			this.shadowBack.opacity = opacity;
			this.shadowBackOpacity = opacity;
		} else if (type === 'hide') {
			if (this.shadowBack === null) return;
			this.shadowBack.destroy();
			this.shadowBack = null;
			this.shadowBackOpacity = 0;
		} else if (type === 'candleOn') {
			if (this.shadowBack !== null) {
				this.shadowBack.opacity = 1;
				this.shadowBack.setAnimation('candle')
			}
		} else if (type === 'candleOff') {
			if (this.shadowBack !== null) {
				this.shadowBack.opacity = this.shadowBackOpacity;
				[this.shadowBack.x, this.shadowBack.y] = [960,540];
				this.shadowBack.setAnimation('main');
			}
		} else if (type === 'return') {
			return this.shadowBack;
		}
		return;
	}
	//--------------------Работа с текстом
	
	// Для добавления только SpriteObject
	async add(name, layer, ...position) {
		return await SpriteObject.add(name, layer, ...position);
	}
	// Показать фразу
	async showPhrase(name, text) {
		const personName = await Person.getSpeaker(name);
		
		const field = await this.add('fsay', 'preUi', 960, 920);
		const fieldName = await this.add('fname', 'preUi', 960, 755);
		const textPhrase = await GameText.create('text', [960, 930], `<p class="text dark">${text}</p>`, 'preUi', true);

		const textName = await GameText.create('name', [960, 757], `<p class="text dark"><b>${personName.ru}</b></p>`, 'preUi');
		
		const date = Date.now();
		const deletePhrase = function() {
			field.destroy();
			fieldName.destroy();
			textPhrase.destroy();
			textName.destroy();
			this.deleteEvent(name, `endLinePhrase-${date}`);
		}.bind(this);
		
		this.addEvent(name, `endLinePhrase-${date}`, deletePhrase);
		return;
	}
	
	async choice(options, variants, loop = false) {
		let optVariants;
		// Иногда в какой-то момент возникает неочевидное и необъяснимое this.running = false во время выбора, что больно заканчивается
		/*if (!this.running) {
			this.running = true;
		} */
		controller.refresh();
		if (options.random) {
			optVariants = [];
			const length = variants.length
			for (let i = 0; i < length; i++) {
				for (let j = 0; j < variants.length; j++) {
					if (Math.random() >= 0.5 || j === variants.length-1) {
						optVariants.push(variants[j]);
						variants = variants.filter((elem, index) => index != j);
						break;
					}
				}
			}
		} else {
			optVariants = variants.slice();
		}
		if (options.type === 'usual') {
			return await this.showChoice(options.text, options.time, optVariants, loop);
		} else {
			if (options.settings === null) {
				return await this.showImageChoice(options.text, [960, 120], options.time, optVariants, loop)
			} else if (options.settings.startsWith('usual-image')) {
				const arr = options.settings.split('-').slice(2);
				const addOptions = {
					position: [],
					grid: []
				};
				let flag = '';
				for (let i = 0; i < arr.length; i++) {
					if (arr[i] === 'grid' || arr[i] === 'position') {
						flag = arr[i];
					} else {
						addOptions[flag].push(+arr[i]);
					}
				}
				return await this.showImageChoiceGrid(options.text, addOptions.position, addOptions.grid, options.time, optVariants, loop);
			} else if (options.settings.startsWith('scroll')) {
				const position = options.settings.split('-').slice(1).length !== 0  ? options.settings.split('-').slice(1).map(elem => elem !== '' ? Number(elem) : '') : [960, 90];
				if (position.length === 1) {
					position.push(90);
				} 
				for (let i = 0; i < position.length; i++) {
					if (!position[i]) {
						position[i] = i === 1 ? 90 : 960;
					}
				}
				return await this.showImageChoiceScroll(options.text, position, options.time, optVariants, loop);
			}
		}
	}
	
	// Показать обычный текстовый выбор
	async showChoice(text, bool, variants, loop = false) {
		if (variants.length === 0) { // Пустой выбор, без вариантов, пропускаем
			if (options.temps.length === 0) {
				++options.line;
			} else {
				++options.temps[options.temps.length-1].line;
			}
			this.running = false; // Делаем снова возможным чтение скрипта
			return this.run(); // Запускаем скрипт
		}
		
		await Person.getNarrator();
		
		let fieldY = 200;
		
		const date = Date.now();
		
		if (text !== null) {
			fieldY = variants.length < 3 ? 400 : 400 - 50*(variants.length - 2);
			/*const field = this.runtime.objects.fieldQuestion.createInstance('ui', 960, fieldY);*/
			const field = await this.add('fq', 'preUi', 960, fieldY);

			const textQuestion = await GameText.create('question', [960, fieldY], `<p class="text dark">${text}</p>`, 'preUi')

			const endChoice = function() { // Событие окончания демострации вопроса
				this.deleteEvent('choice', `endLineChoice-${date}`);
				//options.choices.options = [];
				//field.destroy();
				field.destroy();
				textQuestion.destroy();
			}.bind(this);

			this.addEvent('choice', `endLineChoice-${date}`, endChoice);		
		}
		
		for (let i = 0; i < variants.length; i++) {
			//const fieldAnswer = this.runtime.objects.fieldOption.createInstance('ui', 960, fieldY+250+(i*120));
			const fieldAnswer = await this.add('fOption', 'preUi', 960, fieldY+250+(i*120));
			const textAnswer = await GameText.create('option', [972, fieldY+250+(i*120)], `<p class="text dark">${variants[i][0]}</p>`, 'preUi');
			//options.choices.options.push(fieldAnswer);
			const deleteOption = function() { // Событие удаление плашки с ответом при переходе к следующей строке скрипта
				this.deleteEvent('choice', `endLineOption_${date}_${i}`);
				//fieldAnswer.destroy();
				fieldAnswer.destroy();
				textAnswer.destroy();
			}.bind(this);
			
			const chooseOption = async function() {
				fieldAnswer.removeEventListener('chooseOption', chooseOption);
				//options.choices.options = [];
				
				if (!loop) {
					if (options.temps.length === 0) {
						++options.line;
					} else {
						++options.temps[options.temps.length-1].line;
					}
				}

				
				if (variants[i][1][0].length !== 0) { // Пустой выбор, переходим на следующую строку
					options.temps.push({
						type: 'choice',
						loop: loop,
						line: 0,
						script: variants[i][1].slice()
					});
				} 
				globalThis.nextTick(()=> {
					this.running = false; // Делаем снова возможным чтение скрипта
					this.run(); // Запускаем скрипт					
				});

			}.bind(this);
			
			fieldAnswer.addEventListener('chooseOption', chooseOption); // Вешаем счетчик на событие выбора данного ответа
			this.addEvent('choice', `endLineOption_${date}_${i}`, deleteOption); // Привязываем все к полю текста вопроса
		}
		return;
	}
	
	// Показать обычный выбор с картинками 
	async showImageChoice(text, position, bool, variants, loop = false) {		
		if (variants.length === 0) { // Пустой выбор, без вариантов, пропускаем
			if (options.temps.length === 0) {
				++options.line;
			} else {
				++options.temps[options.temps.length-1].line;
			}
			this.running = false; // Делаем снова возможным чтение скрипта
			return await this.run(); // Запускаем скрипт
		}
		
		await Person.getNarrator();
		this.changeDisplay('show', 'black', 0.6);
		
		if (text !== null) { // Есть текст
			const field = await this.add('i-cq', 'preUi', ...position);
			const textQuestion = await GameText.create('question', position, `<p class="text dark">${text}</p>`, 'preUi')
			const date = Date.now();
			
			const endChoice = function() { // Событие окончания демострации вопроса
				this.deleteEvent('choice', `endLineChoice-${date}`);
				field.destroy();
				textQuestion.destroy();
			}.bind(this);
		
			this.addEvent('choice', `endLineChoice-${date}`, endChoice);
		}
		
		for (let i = 0; i < variants.length; i++) {
			let answerPosition = [];
			if (variants[i][0].length !== 4) { // Нет координат
				answerPosition.push(960 + (i-(variants.length-1)/2)*1800/variants.length);
				answerPosition.push(640);
			} else {
				answerPosition = variants[i][0].slice(2);
			}
		
			const fieldAnswer = await this.add(variants[i][0][0], 'preUi', ...answerPosition);
			fieldAnswer.setAnimation(variants[i][0][1]);
			
			const deleteOption = function() { // Событие удаление плашки с ответом при переходе к следующей строке скрипта
				this.deleteEvent('choice', `endLineOption_${i}`);
				fieldAnswer.destroy();
			}.bind(this);
			
			const chooseOption = function() {
				fieldAnswer.removeEventListener('chooseOption', chooseOption);
				
				if (!loop) {
					if (options.temps.length === 0) {
						++options.line;
					} else {
						++options.temps[options.temps.length-1].line;
					}
				}

				this.changeDisplay('hide');
				if (variants[i][1][0].length !== 0) { // Пустой выбор, переходим на следующую строку
					options.temps.push({
						type: 'choice',
						loop: loop,
						line: 0,
						script: variants[i][1].slice()
					});
				} 
				globalThis.nextTick(()=> {
					this.running = false; // Делаем снова возможным чтение скрипта
					this.run(); // Запускаем скрипт					
				});
			}.bind(this);
			
			fieldAnswer.addEventListener('chooseOption', chooseOption); // Вешаем счетчик на событие выбора данного ответа
			this.addEvent('choice', `endLineOption_${i}`, deleteOption); // Привязываем все к полю текста вопроса
		}
		
		return;
		
	}
	
	// Показать выбор с картинками с гридом
	async showImageChoiceGrid(text, position, grid, bool, variants, loop = false) {
		if (variants.length === 0) { // Пустой выбор, без вариантов, пропускаем
			if (options.temps.length === 0) {
				++options.line;
			} else {
				++options.temps[options.temps.length-1].line;
			}
			this.running = false; // Делаем снова возможным чтение скрипта
			return await this.run(); // Запускаем скрипт
		}
	}
	
	// Показать выбор с картинками со скроллом
	async showImageChoiceScroll(text, position, bool, variants, loop = false) {
		if (variants.length === 0) { // Пустой выбор, без вариантов, пропускаем
			if (options.temps.length === 0) {
				++options.line;
			} else {
				++options.temps[options.temps.length-1].line;
			}
			this.running = false; // Делаем снова возможным чтение скрипта
			return await this.run(); // Запускаем скрипт
		}
		
		await Person.getNarrator();
		
		this.changeDisplay('show', 'black', 0.6);
		
		if (text !== null) { // Есть текст
			const field = await this.add('menuB', 'preUi', ...position);
			const textQuestion = await GameText.create('question', position, `<p class="text white">${text}</p>`, 'preUi')
			const date = Date.now();
			
			const endChoice = function() { // Событие окончания демострации вопроса
				this.deleteEvent('choice', `endLineChoice-${date}`);
				field.destroy();
				textQuestion.destroy();
			}.bind(this);
		
			this.addEvent('choice', `endLineChoice-${date}`, endChoice);
		}
		

		const leftArrow = await this.add('arrow', 'preUi', -500, -500);
		leftArrow.setAnimation('left');
		const rightArrow = await this.add('arrow', 'preUi', -500, -500);
		rightArrow.setAnimation('right');
		uiManager.addButton(leftArrow, `leftClick`, 'noanimation');
		uiManager.addButton(rightArrow, `rightClick`, 'noanimation');
		
		if (variants.length <= 1) {
			leftArrow.isVisible = false;
			rightArrow.isVisible = false;
		}
		
		let chosen = 0;
		const images = [];
		
		function changeChosen(newChosen) {
			for (let k = 0; k < images[chosen].length; k++) {
				if (images[chosen][k] !== null && images[newChosen][k] !== null) {
					images[chosen][k].isVisible = false;
					images[newChosen][k].isVisible = true;					
				}
			}
			chosen = newChosen;
		}
		
		const leftClick = function() {
			if (chosen === 0) {
				changeChosen(variants.length - 1);
			} else {
				changeChosen(chosen - 1);
			}
		}.bind(this);
		
		const rightClick = function() {
			if (chosen === variants.length - 1) {
				changeChosen(0);
			} else {
				changeChosen(chosen + 1);
			}		
		}.bind(this);
		
		leftArrow.addEventListener('leftClick', leftClick);
		rightArrow.addEventListener('rightClick', rightClick);
		
		
		for (let i = 0; i < variants.length; i++) {
			const addOptions = {
				name: variants[i][0].shift(),
				animation: variants[i][0].shift(),
				frame: typeof(variants[i][0][0]) === 'number' ?  variants[i][0].shift() : 0,
				text: variants[i][0].shift(),
				button: variants[i][0].shift(),
				position: !variants[i][0].length ? [960, 540] : variants[i][0]			
			}

			const fieldAnswer = await this.add(addOptions.name, 'preUi', -960, -540); 
			if (i !== 0) {
				fieldAnswer.isVisible = false;
			}
			[fieldAnswer.x, fieldAnswer.y] = addOptions.position;
			fieldAnswer.setAnimation(addOptions.animation);
			fieldAnswer.animationFrame = addOptions.frame;
			
			let fieldAnswerPhrase = null;
			let answerPhrase = null;
			if (addOptions.text !== '') {
				fieldAnswerPhrase = await this.add('menuB', 'ui', -960, -540);
				answerPhrase = await GameText.create('menuButtonText', [-960, -540], `<p class="text white">${addOptions.text.split(',').join(' ')}</p>`, 'ui');
			}
			
			const fieldAnswerText = await this.add('i-csb', 'ui', -960, -540);
			const answerText = await GameText.create('imageOption', [-960, -540], `<p class="text dark">${addOptions.button.split(',').join(' ')}</p>`, 'ui');
			
			images.push([fieldAnswer, fieldAnswerText, answerText, fieldAnswerPhrase, answerPhrase])
			
			if (chosen !== i) {
				fieldAnswerText.isVisible = false;
				answerText.isVisible = false;
				if (fieldAnswerPhrase !== null && answerPhrase !== null) {
					fieldAnswerPhrase.isVisible = false;
					answerPhrase.isVisible = false;
				}
			} else {
				leftArrow.x = fieldAnswer.x - fieldAnswer.width/2 - 100;
				leftArrow.y = fieldAnswer.y;
				rightArrow.x = fieldAnswer.x + fieldAnswer.width/2 + 100;
				rightArrow.y = fieldAnswer.y;
			}
			
			if (fieldAnswerPhrase !== null && answerPhrase !== null) {
				[fieldAnswerPhrase.x, fieldAnswerPhrase.y] = [addOptions.position[0], addOptions.position[1] + fieldAnswer.height/2-80];
				globalThis.nextTick(()=> {
					[answerPhrase.x, answerPhrase.y] = [addOptions.position[0], addOptions.position[1] + fieldAnswer.height/2-80]
				})
			}
			
			[fieldAnswerText.x, fieldAnswerText.y] = [addOptions.position[0], addOptions.position[1] + fieldAnswer.height/2+10];
			globalThis.nextTick(()=> {
				[answerText.x, answerText.y] = [fieldAnswerText.x, fieldAnswerText.y]
			});
			
			const hover = async function(bool) {
				if (bool) {
					await answerText.setContent(`<p class="text dark text-hover">${addOptions.button.split(',').join(' ')}</p>`);
				} else {
					await answerText.setContent(`<p class="text dark">${addOptions.button.split(',').join(' ')}</p>`);
				}
			}
			
			fieldAnswerText.addEventListener('hoverTrue', ()=> hover(true));
			fieldAnswerText.addEventListener('hoverFalse', ()=> hover(false));
			
			const deleteOption = function() { // Событие удаление плашки с ответом при переходе к следующей строке скрипта
				this.deleteEvent('choice', `endLineOption_${i}`);
				fieldAnswer.destroy();
				fieldAnswerText.destroy();
				answerText.destroy();
				if (fieldAnswerPhrase !== null && answerPhrase !== null) {
					fieldAnswerPhrase.destroy();
					answerPhrase.destroy();
				}
			}.bind(this);
			
			const chooseOption = function() {
				fieldAnswer.removeEventListener('chooseOption', chooseOption);
				leftArrow.destroy();
				rightArrow.destroy();
				this.changeDisplay('hide');
				
				if (!loop) {
					if (options.temps.length === 0) {
						++options.line;
					} else {
						++options.temps[options.temps.length-1].line;
					}
				}

				
				if (variants[i][1][0].length !== 0) { // Пустой выбор, переходим на следующую строку
					options.temps.push({
						type: 'choice',
						loop: loop,
						line: 0,
						script: variants[i][1].slice()
					});
				} 
				
				globalThis.nextTick(()=> {
					this.running = false; // Делаем снова возможным чтение скрипта
					this.run(); // Запускаем скрипт					
				});
			}.bind(this);
			
			fieldAnswerText.addEventListener('chooseOption', chooseOption); // Вешаем счетчик на событие выбора данного ответа
			this.addEvent('choice', `endLineOption_${i}`, deleteOption); // Привязываем все к полю текста вопроса
		}
		
		return;
		
	}
	
	end() {
		if (options.temps.length === 0) {
			throw new Error('gameManager Error: Идет выполнение основого сценария');
		}
		if (options.temps[options.temps.length-1].type === 'choice' || options.temps[options.temps.length-1].type === 'show') {	
			const prevTemp = options.temps.pop();
			const add = prevTemp.loop;
			if (add) { // Если выбор был повторяющимся
				if (options.temps.length === 0) {
					++options.line;
				} else {
					++options.temps[options.temps.length-1].line;
				}
			}
			this.running = false; 
			return this.run();
		} 
	}
	
	// Показать текст от лица рассказчика
	async showNarrator(text) {
		await Person.getNarrator();
		const field = await this.add('fnrt', 'preUi', 960, 920);
		
		const textPhrase = await GameText.create('text', [960, 930], `<p class="text light">${text}</p>`, 'preUi', true);
		
		const date = Date.now();
		const deletePhrase = function() {
			this.deleteEvent('narrator', `endLineNarrator-${date}`);
			field.destroy();
			textPhrase.destroy();
		}.bind(this);
		
		this.addEvent('narrator', `endLineNarrator-${date}`, deletePhrase);
		return;
	}
	
	//--------------------Работа с изображениями

	// Показать картинку
	async showImage(name, x, y, layer=false) {
		// Если картинка останавливает run, то получаем в waiting true, при ошибке
		await Picture.show(name, [x, y], true, layer)
			.then((result) => this.waiting = result)
			.catch((e) => errorManager.handle(e))
		return;
	}
	
	// Убрать картинку
	async hideImage(name) {
		await Picture.hide(name);
		return;	
	}
	
	async switchImage(name, bool) {
		await Picture.switch(name, bool)
			.then((result) => this.waiting = result)
			.catch((e) => errorManager.handle(e))
		return;
	}
	
	// Показать svg картинку
	async showSVGImage(name, x, y) {
		this.waiting = await SVGPicture.show(name, [x, y]);
		console.log('WAITING --- ', this.waiting);
		return;
	}
	
	// Убрать svg картинку
	hideSVGImage(name) {
		SVGPicture.hide(name);
		return;
	}
	
	
	
	// Затемнение экрана
	changeDisplay(type='hide', color='', opacity=1, timer=1) {
		
		// Вспомогательная функция, помогающая определить массив значений цвета по названию
		function defineColor(colorValue) {
			const list = {
				'black' : [0,0,0],
				'white' : [1, 1, 1],
			}
			return list[colorValue] || [0,0,0]
		}
		
		// Получаем цвет в виде массива
		const colorArr = defineColor(color);
		
		return new Promise(async (resolve, reject) => {
			// Изменение видимости
			const changeOpacity = function(value) {
				this.display.back.opacity += value;
				if (type === 'show' && this.display.back.opacity >= opacity) {
					this.dispatch('display', 'endStart');
					resolve();
				} else if (type === 'hide' && this.display.back.opacity <= 0) {
					this.display.back.destroy();
					this.display.back = null;
					this.display.color = [];
					this.display.opacity = -1;
					this.dispatch('display', 'destroyScreen');
					resolve();
				} else {
					globalThis.nextTick(()=> changeOpacity(value));
				}
			}.bind(this);

			if (type === 'show') {	
				// Появление фона
				const startDisplay = function() {
					this.deleteEvent('display', 'destroyScreen');
					const background = this.runtime.objects.colorBackground.createInstance('screen', -100, -100);
					background.colorRgb = colorArr;
					background.opacity = 0;
					[background.width, background.height] = [1920, 1080];
					[background.x, background.y] = [0,0];
					this.display.back = background;
					this.display.color = color;
					this.display.opacity = opacity;				
					changeOpacity(0.05);
				}.bind(this);

				// Если уже есть какой-то экран
				if (this.display.back !== null) {
					// Проверяем, не хотим ли еще такой же продемонстрировать, если нет, то удаляем предудыщий и ждем, пока он удалится, чтобы запустить наш
					if (color !== this.display.color && opacity !== this.display.opacity) {
						this.addEvent('display', 'destroyScreen', startDisplay);
						await this.changeDisplay('hide');
					}
				} else { // Другого экрана нет, запускаем
					startDisplay();
				}

			} else if (type === 'hide') {
				if (this.display.back !== null) {
					changeOpacity(-0.05);
				}
			} else if (type === 'blink') {
				this.addEvent('display', 'endStart', ()=> this.addTimer('delayHide', 1000*timer, async ()=> {
					await this.changeDisplay('hide');
					resolve();
				}));	
				await this.changeDisplay('show', color, opacity);
			}			
		});
		

	}
}