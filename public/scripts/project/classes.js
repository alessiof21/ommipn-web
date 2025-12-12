import { managerGame, errorManager, options, settingsManager, main, logger, controller } from './main.js';

export function classesTick() {
	try {
		SpriteObject.Tick();
		Person.Tick();
		Picture.Tick();
		SVGPicture.Tick();
	} catch(e) {
		errorManager.handle(e);
	}
	return;
}

export function saveClasses() {
	const saves = {};
	saves.background = Background.save();
	saves.persons = structuredClone(Person.save());
	saves.pictures = JSON.parse(JSON.stringify(Picture.save()));
	saves.svgPictures = JSON.parse(JSON.stringify(SVGPicture.save()));
	return saves;
}

export async function loadClasses(loads) {
	try {
		await Background.load(loads.background);
		await Person.load(loads.persons);
		await Picture.load(loads.pictures);
		await SVGPicture.load(loads.svgPictures);
		logger.add({type: 'info', text: 'end loading classes'});	
	} catch(e) {
		errorManager.handle(e);
		logger.add({type: 'info', text: 'fail loading classes'});
	}
	return;
}

export function clearInstances() {
	SpriteObject.currentInstances = {};
	Background.currentBackground = null;
	Background.dynamicBackgrounds = {};
	Person.currentInstances = {};
	Person.currentAct = null;
	GameText.currentInstances = [];
	Picture.currentInstances = {};
	SVGPicture.currentInstances = {};
	SVGPicture.showedInstances = {};
	HTMLPicture.currentInstances = [];
	return;
	
}

// Предзагрузка спрайтов для того, чтобы в игре они быстрее грузились
export async function preloadAllImages() {
	// Классы, состоящие из спрайтов, которые надо предзагрузить
	const classes = {
		SpriteObject: SpriteObject,
		Background: Background,
		Person: Background,
		Picture: Picture
	}
	
	for (const kind in classes) {
		for (const name in classes[kind].instances) {
			await classes[kind].loadImage(classes[kind].instances[name].instance)
				.catch((e) => errorManager.handle(e));
			console.log(`c/d ${kind} ${name}`)
		}
		console.log(`preload all ${kind}`);
	}
	console.log('preload all images');
	return;
}

// Предзагрузка svg, чтобы они быстрее прогружались в игре
export async function preloadBigImages() {
	try {
		logger.add({type: 'info', text: 'start preload big images'});
		logger.add({type: 'info', text: 'start preload svg images'});
		await SVGPicture.loadImages();
		logger.add({type: 'info', text: 'end preload svg images'});
		logger.add({type: 'info', text: 'start preload dynamic backgrounds'});
		await Background.loadImages();
		logger.add({type: 'info', text: 'end preload dynamic backgrounds'});
		logger.add({type: 'info', text: 'end preload big images'});	
	} catch(e) {
		errorManager.handle(e);
	}
	return;
}

export class SpriteObject extends globalThis.ISpriteInstance {

	// Храним все объекты класса и их описание 
	static instances = {}
	
	// Храним существующие на сцене объекты
	static currentInstances = {}
	
	/*static loadImage(inst) {
		return new Promise((resolve, reject) => {
			try {
				const creating = function() {
					inst.removeEventListener("instancecreate", creating);
					inst.getFirstInstance().destroy();
				}

				const destroying = function() {
					inst.removeEventListener("instancedestroy", destroying);
					resolve();
				}

				inst.addEventListener("instancecreate", creating);
				inst.addEventListener("instancedestroy", destroying);
				inst.createInstance('ui', -960, -540);			
			} catch(e) {
				reject(e)
			}
		});
	} */
	
	// Назначаем класс объекту
	static setClass(instance, info) {
		instance.setInstanceClass(this);
		this.instances[info.name] = {instance: instance};
		for (const key in info) {
			if (key === 'name' || key === 'nrt') {
				continue;
			} else if (key === 'dictionary') {
				this.instances[info.name][key] = structuredClone(info[key]);
			} else {
				this.instances[info.name][key] = info[key];
			}
		}		
		return;
	}
	
	static Tick() {
		for (const key in SpriteObject.currentInstances) {
			for (let i = 0; i < SpriteObject.currentInstances[key].length; i++) {
				const inst = SpriteObject.currentInstances[key][i];
				inst.tick();
			}
		}
		return;
	}
	
	static add(name, layer, ...position) {
		// Для другого класса
		if (this !== SpriteObject || !SpriteObject.instances.hasOwnProperty(name)) {
			return null;
		}
		return new Promise((resolve, reject) => {
			const inst = SpriteObject.instances[name].instance;
			
			// Будущий экземпляр
			let objInst = null;
			
			const endPromise = function() {
				inst.removeEventListener("instancecreate", endPromise);
				if (!objInst) {
					globalThis.nextTick(()=> endPromise());
				} else {
					objInst.name = name;
					if (!SpriteObject.currentInstances.hasOwnProperty(name)) {
						SpriteObject.currentInstances[name] = [];
					}
					SpriteObject.currentInstances[name].push(objInst);
					if (SpriteObject.instances[name].functions) {
						SpriteObject.instances[name].functions.start(objInst); 
					}
					resolve(objInst);
				}
			}
		
			inst.addEventListener("instancecreate", endPromise);
			

			objInst = inst.createInstance(layer, ...position);
			
			objInst.addEventListener('destroy', ()=> {
				objInst.functions = {};
				SpriteObject.currentInstances[name] = SpriteObject.currentInstances[name].filter(elem => elem.uid !== objInst.uid);
			})
		})
			/*.then((objInst)=> {
				//alert(objInst.name)
				objInst.name = name;
				if (!SpriteObject.currentInstances.hasOwnProperty(name)) {
					SpriteObject.currentInstances[name] = [];
				}
				SpriteObject.currentInstances[name].push(objInst);
				
				if (SpriteObject.instances[name].functions) {
					SpriteObject.instances[name].functions.start(objInst); 
				}
				return objInst;
			})*/
	}
	
	constructor() {
		super();
	}
	
	variables = {}
	functions = {}
	
	tick() {
		for (const key in this.functions) {
			try { // Попробуем вызвать тиковую функцию
				this.functions[key](this);
			} catch(e) { // Если ее вызов прошел с ошибкой, то обрабатываем ее и удаляем функцию
				errorManager.handle(e);
				delete this.functions[key];
			}

		}
		return;
	}
	
	changing = 'none'
	
	destroy() {
		this.isVisible = false;
		if (this.changing === 'none') {
			super.destroy();
		} else {
			this.addEventListener(`change${this.changing}Ended`, ()=> super.destroy());
		}
		return;
	}
	
	changeOpacity(startV = 0, endV = 1, time = 0.3) {
		if (!this.isVisible) return;
		this.changing = 'Opacity';
		const dO = (endV - startV)/(time*20);
		this.opacity = startV;
			
		const step = function() {
			if ((dO > 0 && this.opacity + dO >= endV) || (dO < 0 && this.opacity + dO <= endV)) {
				this.opacity = endV;
				const e =  new C3.Event('changeOpacityEnded', true);
				this.dispatchEvent(e);
				this.changing = 'none';
			} else {
				this.opacity += dO;
				globalThis.nextTick(step);
			}
		}.bind(this);
		
		step();
		return;
	}
	
}

export class Background extends SpriteObject {
	// Храним все объекты класса и их описание 
	static instances = {}
	
	// Текущий фон (null если нет)
	static currentBackground = null
	
	// Храним заранее 
	static dynamicBackgrounds = {}
	
	static Tick() {}
	
	static save() {
		return Background.currentBackground?.name || null;
	}
	
	static async loadImages() {
		if (!settingsManager.main.power) return;
		for (const name in Background.instances) {
			if (!Background.instances[name].hasOwnProperty('power')) continue;
			await Background.create(name);
		}
		return;
	}
	
	static create(name) {
		return new Promise((resolve, reject) => {
			try {
				const inst = Background.getInstance(name);
				// Запускается после создания объекта
				const end = function() {
					inst.removeEventListener('instancecreate', end);
					const back = inst.getFirstInstance();
					back.name = name;
					back.stopAnimation();
					back.isVisible = false;
					Background.dynamicBackgrounds[name] = back;
					resolve();
				}
				// Добавляем событие на создание
				inst.addEventListener('instancecreate', end);
				// Создаем экземпляр объекта
				inst.createInstance('backgrounds', -960, -540);
			} catch(e) {
				errorManager.handle(e);
				reject();
			}			
		})			
	}
	 
	static async load(name) {
		await Background.show(name);
		return;
	}
	
	// Возвращает объект под запрашиваемым именем или выдает ошибку
	static getInstance(name) {
		if (!Background.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist backgound with name ${name}`));
			return;
		}
		return Background.instances[name].instance;
	}
	
	static async show(name, style = 'none', params=[]) {
		if (name === null) {
			return;
		}
		// Проверяем, есть ли вообще фон с таким именем
		if (!Background.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist backgound with name ${name}`));
			return;
		}	
	
		// Проверяем, демонстрируется ли какой-то другой фон
		if (Background.currentBackground !== null) { // Демонстрируется ли какой-то фон
			if (Background.currentBackground.name !== name) { // Демонстрируется не запрашиваемый фон
				await Background.currentBackground.hide(style, params);
			} else {
				return;
			}
		}
		
		if (Background.instances[name].power && settingsManager.main.power) {
			const back = Background.dynamicBackgrounds[name];
			back.startAnimation();
			back.isVisible = true;
			if (style !== 'none') {
				await back[style](true, params);
			} else {
				back.x = 960;
				back.y = 540;
				back.opacity = 1;
			}
			Background.currentBackground = back;
			return;
		}
		
		// Сделать пересылку на другой фон, если power
		if (Background.instances[name].power && !settingsManager.main.power) {
			return await Background.show(`${name}Static`, style, params);
		}
		
		return new Promise((resolve, reject) => {
			
			// Определяем объект
			const inst = Background.getInstance(name);
			
			// Запускается после создания объекта
			const endPromise = async function() {
				inst.removeEventListener('instancecreate', endPromise);
				const back = inst.getFirstInstance();
				back.name = name;
				if (style !== 'none') {
					await back[style](true, params);
				} else {
					back.x = 960;
					back.y = 540;
				}
				Background.currentBackground = back;
				resolve();
			}
		
			// Добавляем событие на создание
			inst.addEventListener('instancecreate', endPromise);
			// Создаем экземпляр объекта
			inst.createInstance('backgrounds', -960, -540);
		});
		
		

	}
	
	static async hide(name, style = 'none', params=[]) {
		// Проверяем, есть ли вообще фон с таким именем
		if (!Background.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist background with name ${name}`));
			return;
		}
		// Проверяем, демонстрируется ли фон, который мы хотим убрать
		if (Background.currentBackground !== null) { // Демонстрируется ли какой-то фон
			if (Background.currentBackground.name === name || Background.currentBackground.name === `${name}Static`) { // Демонстрируется именно наш фон или его статичный аналог
				await Background.currentBackground.hide(style, params);
			} 
		}
		return;
	}
	
	constructor() {
		super();
	}
	
	// Убрать фон
	async hide(style = 'none', params=[]) {
		if (this === null) {
			errorManager.handle(new Error(`fail to hide background: instance don't exist`));
			return;
		}
		
		if (Background.instances[this.name].power && settingsManager.main.power) {
			if (style !== 'none') {
				await this[style](false, params);
			} else {
				this.x = 960;
				this.y = 540;
			}
			this.isVisible = false;
			this.stopAnimation();
			Background.currentBackground = null;
			return;
		}
		
		return new Promise( async(resolve, reject) => {
		
			// Определяем объект
			const inst = Background.getInstance(this.name);
			
			// Запускается после создания объекта
			const endPromise = async function() {
				inst.removeEventListener('instancedestroy', endPromise);
				resolve();
			}
			
			// Особое действие с исчезающим фоном
			if (style !== 'none') { 
				await this[style](false, params); 
			}
			
			inst.addEventListener('instancedestroy', endPromise);
			Background.currentBackground = null;
			this.destroy();
		});
		
	}
	
	// Постепенно исчезнование
	fogging(bool) {
		const final = bool ? 1 : 0;
		const dO = bool ? 0.025 : -0.025;

		if (bool) { // Если фог на появление, то сделаем прозрачность 0 и переместим в центр
			this.opacity = 0;
			this.x = 960;
			this.y = 540;
		}
		
		return new Promise((resolve, reject) => {
			const step = function() {
				if (this === null) {
					reject();
				}
				if ((final === 1 && this.opacity + dO >= final) || (final === 0 && this.opacity + dO <= final)) {
					resolve();
				} else {
					this.opacity += dO;
					globalThis.nextTick(step);
				}
			}.bind(this);
			
			step();
		});
	}
}

export class Person extends SpriteObject {
	// Храним все объекты класса и их описание 
	static instances = {};
	
	// Текущий выделенный персонаж
	static currentAct = null
	
	static nrt = [];
	
	// Текущие созданные персонажи (кто есть на сцене)
	static currentInstances = {};
	
	// Список ожиданий (что надо сделать, когда создастся экземпляр класса)
	static waitings = {};
	
	// Назначаем класс объекту
	static setClass(instance, info) {
		super.setClass(instance, info);
		if (info.nrt) {
			Person.nrt.push(info.name);
		}
		/*instance.setInstanceClass(Person);
		Person.instances[info.name] = {
			instance: instance,
			nick: info.nick,
			dictionary: structuredClone(info.dictionary),
		}
		// Персонаж может быть рассказчиком
		if (info.nrt) {
			Person.nrt.push(info.name);
		} */
		return;
	}
	
	/*static loadImage(inst) {
		return new Promise((resolve, reject) => {
			try {
				const creating = function() {
					inst.removeEventListener("instancecreate", creating);
					inst.getFirstInstance().destroy();
				}

				const destroying = function() {
					inst.removeEventListener("instancedestroy", destroying);
					resolve();
				}

				inst.addEventListener("instancecreate", creating);
				inst.addEventListener("instancedestroy", destroying);
				inst.createInstance('persons', -960, -540);			
			} catch(e) {
				reject(e)
			}
		});
	}*/
	
	static change(name, prop, value) {
		Person.instances[name][prop] = value;
		return;
	}
	
	static save() {
		const saves = {persons: [], waitings: structuredClone(Person.waitings), nicks: {}};
		for (const name in Person.currentInstances) {
			saves.persons.push(
				{
					name: name,
					position: [Person.currentInstances[name].x, Person.currentInstances[name].y]
				}
			)
			if (Person.currentAct?.uid === Person.currentInstances[name].uid) {
				if (!saves.waitings.hasOwnProperty(name)) { // Нет ожиданий для этого персонажа
					saves.waitings[name] = [];
				}
				saves.waitings[name].push({acting: [true]});
			}
		}
		for (const name in Person.instances) {
			saves.nicks[name] = Person.instances[name].nick;
		}
		return saves;
	}
	
	static async load(loads) {
		Person.waitings = structuredClone(loads.waitings);
		for (const name in loads.nicks) {
			Person.instances[name].nick = loads.nicks[name];
		}
		for (let i = 0; i < loads.persons.length; i++) {
			await Person.show(loads.persons[i].name, loads.persons[i].position);
		}
		return;
	}
	
	// Возвращает объект под запрашиваемым именем или выдает ошибку
	static getInstance(name) {
		if (!Person.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist person with name ${name}`));
			return;
		}
		return Person.instances[name].instance;
	}
	
	// Возвращает человека на сцене
	static getPerson(name) {
		if (!Person.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist person with name ${name}`));
			return;
		}
		if (!Person.currentInstances.hasOwnProperty(name)) {
			return null;
		}
		return Person.currentInstances[name];
	}
	
	static addWait(name, obj) {
		if (!Person.waitings.hasOwnProperty(name)) {
			Person.waitings[name] = [];
		}
		Person.waitings[name].push(obj);
		return;
	}
	
	static async getSpeaker(name) {
		if (!Person.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist person with name ${name}`));
			return;
		}
		if (Person.currentInstances.hasOwnProperty(name)) {
			await Person.currentInstances[name].acting(true);
		}
		return Person.instances[name].dictionary[Person.instances[name].nick];
	}
	// Возвращает рассказчика
	static async getNarrator() {
		for (let i = 0; i < Person.nrt.length; i++) {
			if (Person.currentInstances.hasOwnProperty(Person.nrt[i])) {
				await Person.currentInstances[Person.nrt[i]].acting(true);
				return true; 
			}
		}
		return false;
	}
	
	static async show(name, position, effect='none', ...params) {
		if (!Person.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist person with name ${name}`));
			return;
		}
		if (!Person.currentInstances.hasOwnProperty(name)) {
			await Person.create(name, position);
		} 
		const person = Person.currentInstances[name];
		
		if (effect === 'none') {
			[person.x, person.y] = position;
		} else {
			await person[effect](position, ...params);
		}
		return;
	}
	
	static async hide(name, effect='none', ...params) {
		if (!Person.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist person with name ${name}`));
			return;
		}
		if (Person.currentInstances.hasOwnProperty(name)) {
			const person = Person.currentInstances[name];
			
			if (Person.currentAct !== null && person.uid === Person.currentAct.uid) {  // Если уходит выделенный персонаж
				await person.acting(false); // Убираем
			}
			 
			if (effect === 'none') {
				[person.x, person.y] = [person.x >= 960 ? 2880: -960, 1080];
			} else {
				await person[effect]([person.x >= 960 ? 2880: -960, 1080], ...params);
			}
			await person.removeInst();
			return;
		}
	}
	
	static create(name, position) {
		return new Promise(async (resolve, reject) => {
			const inst = Person.getInstance(name);

			const endPromise = async function() {
				await inst.removeEventListener('instancecreate', endPromise);
				const person = inst.getFirstInstance();
				person.name = name;
				await person.createShadow();
				await person.createAct();	
				Person.currentInstances[name] = person;
				
				// Выполняем отложенные события
				if (Person.waitings.hasOwnProperty(name)) {
					for (let i = 0; i < Person.waitings[name].length; i++) {
						for (const key in Person.waitings[name][i]) {
							person[key](...Person.waitings[name][i][key]);
						}
					}
					Person.waitings[name] = [];
				}
				
				resolve();
			}
			
			inst.addEventListener('instancecreate', endPromise);
			inst.createInstance('persons', position[0] < 960 ? -480 - position[0] : 2400 + position[0], 1080);
			
		});
	}
	
	static Tick() {
		for (const key in Person.currentInstances) {
			const person = Person.currentInstances[key];
			person.tick();
		}
	}
	
	constructor() {
		super();
	}
	
	// Cоздаем тень 
	createShadow() {
		return new Promise((resolve, reject) => { 
			const inst = Person.getInstance(this.name);
			
			const endPromise = async function() {
				await inst.removeEventListener('instancecreate', endPromise);
				this.shadow.colorRgb = [0,0,0];
				this.shadow.opacity = 0.4;
				resolve();
			}.bind(this);
			
			inst.addEventListener('instancecreate', endPromise);
			this.shadow = inst.createInstance('shadows', this.x+20, this.y-5);
		});
	}
	
	// Создаем подсветку
	createAct() {
		return new Promise((resolve, reject) => { 
			const inst = Person.getInstance(this.name);
			
			const endPromise = async function() {
				await inst.removeEventListener('instancecreate', endPromise);
				this.active.colorRgb = [0,0,0];
				this.active.opacity = 0.3;
				resolve();
			}.bind(this);
			
			inst.addEventListener('instancecreate', endPromise);
			this.active = inst.createInstance('actings', this.x, this.y);
		});	
	}
	
	// Удаляем персонажа
	async removeInst() {
		delete Person.currentInstances[this.name];
		await this.destroyShadow();
		await this.destroyAct();
		
		return new Promise((resolve, reject) => {
			const inst = Person.getInstance(this.name);
			
			const endPromise = function() {
				inst.removeEventListener('instancedestroy', endPromise);
				resolve();
			}
			
			inst.addEventListener('instancedestroy', endPromise);
			this.destroy();
		});
	}
	
	// Удаляем тень
	destroyShadow() {
		return new Promise((resolve, reject) => {
			const inst = Person.getInstance(this.name);
			
			const endPromise = function() {
				inst.removeEventListener('instancedestroy', endPromise);
				this.shadow = null;
				resolve();
			}
			
			inst.addEventListener('instancedestroy', endPromise);
			this.shadow.destroy();
		});
	}
	
	// Удаляем подсветку
	destroyAct() {
		return new Promise((resolve, reject) => {
			const inst = Person.getInstance(this.name);
			
			const endPromise = function() {
				inst.removeEventListener('instancedestroy', endPromise);
				this.active = null;
				resolve();
			}
			
			inst.addEventListener('instancedestroy', endPromise);
			this.active.destroy();
		});	
	}
	
	async acting(bool) {
		// Есть выделенный персонаж
		if (Person.currentAct !== null) {
			if (Person.currentAct.uid !== this.uid) { // Другой персонаж выделен
				await Person.currentAct.acting(false); // Убираем другого персонажа
			} else if (Person.currentAct.uid === this.uid && bool) { // Хотим выделить уже выделенного персонажа
				return;
			}
		}

		const width = bool ? Math.round(this.width * 1.1) : Math.round(this.width/1.1);
		const height = bool ? Math.round(this.height * 1.1) : Math.round(this.height/1.1);
		const dW = (width - this.width)/10;
		const dH = (height - this.height)/10;
		if (bool && !this.isShadow && !this.hidenActive) {
			this.active.opacity = 0;
		}
		return new Promise((resolve, reject) => {
			const step = function() {
				if (this !== null) {
					this.width += dW;
					this.height += dH;
					this.shadow.width += dW;
					this.shadow.height += dH;
					if (Math.abs(width-this.width) <= Math.abs(dW) || Math.abs(height-this.height) <= Math.abs(dH)) {
						this.width = width;
						this.height = height;
						this.shadow.width = width;
						this.shadow.height = height;
						if (!bool && !this.isShadow && !this.hidenActive) {
							this.active.opacity = 0.3;
						}
						Person.currentAct = bool ? this : null;	
						resolve();
					} else {
						globalThis.nextTick(step);
						//globalThis.requestAnimationFrame(()=> step());
					}
				} else {
					reject();
				}
			}.bind(this);
			
			step();
		});
	}
	
	// left, right, up, down,
	async moving(position, ...params) {
		let dX = 0;
		const directions = ['left', 'right', 'up', 'down', 'upleft', 'upright', 'downleft', 'downright']; // Все возможные направления
		let direction = '';
		for (let i = 0; i < params.length; i++) {
			if (directions.includes(params[i])) {
				direction = params[i];
				break;
			}
		}
		if (!direction) { // Направления нет
			if (this.x > position[0]) {
				dX = -40;
			} else if (this.x < position[0]) {
				dX = 40;
			}
		} else {
			if (direction === 'left') {
				if (position[0] < 0 || position[0] > 1920) { // Уходим со сцены
					position[0] = -960;
				} else {
					if (this.x < 0 || this.x > 1920) {
						this.x = 2400 + position[0];	
					}
				}
				dX = -40;
			} else if (direction === 'right') {
				if (position[0] < 0 || position[0] > 1920) { // Уходим со сцены
					position[0] = 2880;
				} else {
					if (this.x < 0 || this.x > 1920) {
						this.x = -480 - position[0];
					}
				}
				dX = 40;
			}
		}

		return new Promise((resolve, reject) => {
			const step = function() {
				if (this !== null) {
					this.x += dX * (this.runtime.dt/0.0166);
					if (Math.abs(position[0] - this.x) < 40) {
						resolve();
					} else {
						globalThis.nextTick(step);
						//globalThis.requestAnimationFrame(()=> step());
					}				
				} else {
					reject();
				}
			}.bind(this)
			
			step();
		});
	}
	// Отразить
	mirror() {
		this.width *= -1;
		this.shadow.width *= -1;
		this.active.width *= -1;
		return;
	}
	
	// Смена анимации
	animate(animationName) {
		this.setAnimation(animationName);
		this.shadow.setAnimation(animationName);
		this.active.setAnimation(animationName);
		return;
	}
	
	// Сделать персонажа тенью
	makeShadow(bool) {
		this.isShadow = bool;
		if (bool) {
			this.colorRgb = [0, 0, 0];
			this.opacity = 0.8;
			this.shadow.opacity = 0;
			this.active.opacity = 0;
		} else {
			this.colorRgb = [1, 1, 1];
			this.opacity = 1;
			this.shadow.opacity = 0.5;
			this.active.opacity = 0.3;
		}
		return;
	}
	
	hideActive(bool) {
		this.active.opacity = bool ? 0 : 0.3;
		this.hidenActive = bool;
		return;
	}
	
	// Для привязки координат тени и подсвета к координатам персонажа
	tick() {
		if (this.shadow !== undefined && this.shadow !== null) {
			this.shadow.x = this.x+20;
			this.shadow.y = this.y-5;
		}
		if (this.active !== undefined && this.active !== null) {
			this.active.x = this.x;
			this.active.y = this.y;		
		}
		return;
	}
	
}

export class Picture extends SpriteObject {
	// Храним все объекты класса и их описание 
	static instances = {};
	
	// Текущие созданные картинки (которые есть на сцене)
	static currentInstances = {};
	
	static Tick() {
		for (const key in Picture.currentInstances) {
			const pic = Picture.currentInstances[key];
			if (pic.isVisible) {
				pic.tick();			
			} 
		}
		return;
	}
	
	/*static loadImage(inst) {
		return new Promise((resolve, reject) => {
			try {
				const creating = function() {
					inst.removeEventListener("instancecreate", creating);
					inst.getFirstInstance().destroy();
				}

				const destroying = function() {
					inst.removeEventListener("instancedestroy", destroying);
					resolve();
				}

				inst.addEventListener("instancecreate", creating);
				inst.addEventListener("instancedestroy", destroying);
				inst.createInstance('ui', -960, -540);			
			} catch(e) {
				reject(e)
			}
		});
	} */
	
	static save() {
		const saves = [];
		for (const name in Picture.currentInstances) {
			saves.push(
				{
					name: name,
					isVisible: Picture.currentInstances[name].isVisible,
					position: [Picture.currentInstances[name].x, Picture.currentInstances[name].y]
				}
			)
		}
		return saves;
	}
	
	static async load(loads) {
		for (let i = 0; i < loads.length; i++) {
			await Picture.show(loads[i].name, loads[i].position, loads[i].isVisible);
		}
		return;
	}
	
	// Возвращает объект под запрашиваемым именем или выдает ошибку
	static getInstance(name) {
		if (!Picture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist image with name ${name}`));
			return;
		}
		return Picture.instances[name].instance;
	}
	
	static getSize(name) {
		if (!Picture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist image with name ${name}`));
			return;
		}
		return [Picture.currentInstances[name].width/2, Picture.currentInstances[name].height/2]; 
	}
	
	static getDescription(name) {
		if (!Picture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist image with name ${name}`));
			return;
		}		
		return Picture.instances[name].dictionary[settingsManager.main.language] ?? null;
	}
	
	// Показать картинку
	static async show(name, position, isVisible = true, layer=false) {
		if (!Picture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist image with name ${name}`));
			return false;
		}
		
		if (Picture.currentInstances.hasOwnProperty(name)) {
			await Picture.hide(name);
		}
		

		return new Promise((resolve, reject) => {
			try {
				const inst = Picture.getInstance(name);
			
				const endPromise = async function() {
					inst.removeEventListener('instancecreate', endPromise);
					// Если картинка останавливает выполнение скрипта
					const pic = inst.getFirstInstance();
					if (!managerGame.isInventory && managerGame.working) {
						await managerGame.changeDisplay('show', 'black', 0.8);
						pic.addEventListener('destroy', async ()=> await managerGame.changeDisplay('hide'));
					}
					[pic.x, pic.y] = position;
					pic.changeOpacity();
					pic.name = name;
					Picture.currentInstances[name] = pic;
					if (!isVisible) {
						pic.isVisible = false;
					}
					if (Picture.instances[name].functions !== null) {
						// Запускаем стартовую функцию
						Picture.instances[name].functions.start(pic); 
					}
					
					if (Picture.instances[name].inventory) {
						managerGame.addToInventory(name, 'pic');
					}
					if (!isVisible) {
						resolve(false);
					} 
					if (!managerGame.isInventory) {
						resolve(Picture.instances[name].stop);					
					} 
					resolve(false);

				}

				inst.addEventListener('instancecreate', endPromise);
				if (!layer) {
					inst.createInstance(Picture.instances[name].layer, -1000, -1000);
				} else {
					inst.createInstance(layer, -1000, -1000);
				}
			} catch(e) {
				reject(e);
			}
		});
	}
	
	static async hide(name) {
		if (!Picture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist image with name ${name}`));
			return;
		}
		
		if (!Picture.currentInstances.hasOwnProperty(name)) {
			return;
		}
		
		return new Promise((resolve, reject) => {
			
			const inst = Picture.getInstance(name);
			
			const endPromise = function() {
				inst.removeEventListener('instancedestroy', endPromise);
				delete Picture.currentInstances[name];
				managerGame.waiting = false;
				resolve();
			}			
			
			inst.addEventListener('instancedestroy', endPromise);
			Picture.currentInstances[name].destroy();
		});
	}
	
	static switch(name, bool) {
		return new Promise((resolve, reject) => {
			const pic = Picture.currentInstances[name];	
			if (pic === undefined) {
				reject(new Error(`Don't exist image on layout with name ${name}`));
			}
			pic.isVisible = bool;
			if (bool && Picture.instances[name].stop) {
				resolve(true)
			}
			resolve(false);
		});
	}
	
	variables = {}
	functions = {}
	
	constructor() {
		super();
	}
	
	async hide() {
		await Picture.hide(this.name);
		return;
	}
	
	tick() {
		for (const key in this.functions) {
			try {
				this.functions[key](this);
			} catch(e) {
				errorManager.handle(e);
				delete this.functions[key];
			}
		}
		return;
	}
}

export class GameText extends globalThis.IHTMLElementInstance {
	
	static instances = {};
	
	static currentInstances = [];
	
	static instance = null;
	
	static setClass(instance, opts) {
		instance.setInstanceClass(GameText);
		GameText.instance = instance;
		for (const type in opts) {
			GameText.instances[type] = structuredClone(opts[type]);			
		}
		return;
	}
	
	static async create(type, position, phrase, layer='ui', speed=false) {
		// Создаем текст в виде div
		const text = GameText.instance.createInstance(layer, -1000, -1000);
		text.type = type;
		// Занесем текст в список
		GameText.currentInstances.push(text);
		
		let deleted = false;
		
		// При удалении объекта убираем из списка
		text.addEventListener('destroy', ()=> {
			deleted = true;
			GameText.currentInstances = GameText.currentInstances.filter((elem) => elem.uid !== text.uid);
		})
		
		// Передаем текст в div 
		if (!speed || (speed && settingsManager.main.text)) {
			await text.setContent(phrase);			
		} else {
			const start = phrase.match(/<p(.[^<]+)>/g)[0];
			const end = '</p>';
			const preSpeech = phrase.replace(end, '').replace(start, '').split('');
			const speech = [];
			let char = '';
			for (let i = 0; i < preSpeech.length; i++) {
  				if (preSpeech[i] === '<') {
    				char = '<';
				} else if (preSpeech[i] === '>') {
					char += '>';
					speech.push(char);
					char = '';
				} else if (char !== '') {
					char += preSpeech[i];
				} else {
					speech.push(preSpeech[i]);
				}
			}
			
			
			let click = false;
			
			controller.wait('blockClick', 'endAddText', ()=> click = true);
			
			const tags = {
				i: false,
				b: false,
			};
			
			let count = 0;
			const step = async function() {
				if (deleted) return;
				if (count > speech.length || click) {
					controller.deleteWait('blockClick', 'endAddText');
					return await text.setContent(start+speech.join('')+end);
				}	
				if (speech[count] === '<i>') {
					tags.i = true;
				} else if (speech[count] === '<b>') {
					tags.b = true;
				} 
				
				const endTags = '' + tags.i ? '</i>' : '' + tags.b ? '</b>' : ''; 
				
				await text.setContent(start+speech.slice(0, count).join('')+ endTags + '<span class="opac">'+speech.slice(count, speech.length+1).join('')+'</span>'+end);
				++count;
				while (count < speech.length - 1 && speech[count].startsWith('</')) {
					if (speech[count] === '</i>') {
						tags.i = false;
					} else if (speech[count] === '</b>') {
						tags.b = false;
					}
					++count;
				}
				globalThis.nextTick(async ()=> await step());
			}
			
			await step();
		}

		[text.width, text.height] = GameText.instances[type].size;
		let fadeParams = [0, 1, 0.3];
		if (GameText.instances[type].otherFade) {
			fadeParams = GameText.instances[type].otherFade.slice();
		}
		// Прорисовка
		globalThis.nextTick(async () => {
			[text.x, text.y] = position;
			if (!speed || (speed && settingsManager.main.text)) {
				await text.changeOpacity(...fadeParams);				
			}
			text.created = true;
		});
		
		// Возвращаем текст
		return text;
	}
	
	static isVisible(bool) {
		for (let i = 0; i < GameText.currentInstances.length; i++) {
			const text = GameText.currentInstances[i];
			text.isVisible = bool;
		}
		return;
	}
	
	constructor() {
		super();
	}
	
	async edit(html, ...params) {
		await this.setContent(html);
		await this.changeOpacity(...params);
		return;
	}
	
	created = false
	changing = 'none'
	
	destroy() {
		this.isVisible = false;
		if (!this.created) {
			globalThis.nextTick(()=> this.destroy());
			return;
		}
		if (this.changing === 'none') {
			super.destroy();
		} else {
			this.addEventListener(`change${this.changing}Ended`, ()=> super.destroy());
		}
		return;
	}
	
	async changeOpacity(startV = 0, endV = 1, time = 0.3) {
		if (!this.isVisible) return;
		this.changing = 'Opacity';
		await this.setContentCssStyle('opacity', `${startV}`, '');
		let sV = startV;
		const dO = (endV - startV)/(time*20);
		
		const step = async function() {
			if ((dO > 0 && sV + dO >= endV) || (dO < 0 && sV +dO <= endV)) {
				await this.setContentCssStyle('opacity', `${endV}`, '');
				const e =  new C3.Event('changeOpacityEnded', true);
				this.dispatchEvent(e);
				this.changing = 'none';
			} else {
				sV += dO;
				await this.setContentCssStyle('opacity', `${sV}`, '');
				globalThis.nextTick(step);
			}
		}.bind(this);
		
		step();
		return;
	}
}

export class SVGPicture extends globalThis.IHTMLElementInstance {
	
	static instance = null;
	
	static instances = {};
	
	static currentInstances = {};
	
	static showedInstances = {};
	
	static getInstance(name) {
		if (!SVGPicture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist svg-image with name ${name}`));
			return;
		}
		if (!SVGPicture.currentInstances.hasOwnProperty(name)) {
			return null;
		}
		return SVGPicture.currentInstances[name];
	}
	
	static getSize(name) {
		if (!SVGPicture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist svg-image with name ${name}`));
			return;
		}
		return [SVGPicture.instances[name].size[0]/2, SVGPicture.instances[name].size[1]/2];
	}
	
	static getDescription(name) {
		if (!SVGPicture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist svg-image with name ${name}`));
			return;
		}		
		return SVGPicture.instances[name].dictionary[settingsManager.main.language] ?? null;
	}
	
	static setClass(instance, info) {
		instance.setInstanceClass(SVGPicture);
		SVGPicture.instance = instance;
		for (const key in info) {
			SVGPicture.instances[key] = {
				name: info[key].name,
				stop: info[key].stop,
				size: info[key].size.slice(),
				alt: info[key].alt,
				dictionary: structuredClone(info[key].dictionary),
				inventory: info[key].inventory,
				functions: info[key].functions
			}
		}
		return;
	}
	
	static async loadImages() {
		for (const name in SVGPicture.instances) {
			try {
				await SVGPicture.create(name);
				SVGPicture.instances[name].preload = true;
			} catch(e) {
				errorManager.handle(e);
			}
		}
		return;
	}
	
	static save() {
		const saves = [];
		for (const name in SVGPicture.showedInstances) {
			saves.push(
				{
					name: name,
					position: [SVGPicture.showedInstances[name].x, SVGPicture.showedInstances[name].y]
				}
			)
		}
		
		return saves;
	}
	
	static async load(loads) {
		for (let i = 0; i < loads.length; i++) {
			await SVGPicture.show(loads[i].name, loads[i].position);
		}	
		return;
	}
	
	static Tick() {
		for (const key in SVGPicture.currentInstances) {
			const svgPic = SVGPicture.currentInstances[key];
			svgPic.tick();
		}
		return;
	}
	
	static isVisible(bool) {
		for (const key in SVGPicture.currentInstances) {
			const svgPic = SVGPicture.currentInstances[key];
			svgPic.isVisible = bool;
		}
		return;
	}
	
	static async create(name) {
		if (!SVGPicture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist svg-image with name ${name}`));
			return false;
		}
		const inst = SVGPicture.instance; 
		const size = SVGPicture.instances[name].size.slice();
		const svgImage = inst.createInstance('preUi', -1000, -1000);
		
		return new Promise(async (resolve, reject) => {
			try {
				await svgImage.setContent(`<img id="img_svg" src="https://s3.twcstorage.ru/fd0dc0bd-caravan-game-ommipn/svg/${SVGPicture.instances[name].name}.svg">`);
				svgImage.setSize(...size);
				svgImage.name = name;
				SVGPicture.currentInstances[name] = svgImage;
				svgImage.isVisible = false;
				/*if (SVGPicture.instances[name].functions !== null && SVGPicture.preload) {
					SVGPicture.instances[name].functions.start(svgImage);
				} */
				/*if (SVGPicture.instances[name].inventory && SVGPicture.preload) {
					managerGame.addToInventory(name, 'svg');
				} */
				
				/*globalThis.nextTick(async ()=> {
					[svgImage.x, svgImage.y] = position;
					await svgImage.changeOpacity();
					if (!managerGame.isInventory && managerGame.working) {
						managerGame.changeDisplay('show', 'black', 0.8);
						svgImage.addEventListener('destroy', ()=> managerGame.changeDisplay('hide'));
					}
					svgImage.created = true;
				})*/
				resolve();				
			} catch(e) {
				reject(e);
			}
		});		
	}
	
	static async show(name, position) {
		if (!SVGPicture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist svg-image with name ${name}`));
			return false;
		}
		if (SVGPicture.currentInstances.hasOwnProperty(name)) {
			SVGPicture.hide(name);
		}
		
		if (!SVGPicture.instances[name].preload) {
			return await Picture.show(SVGPicture.instances[name].alt, position);
		}
		
		const svgImage = SVGPicture.currentInstances[name];
		SVGPicture.showedInstances[name] = svgImage;
		if (SVGPicture.instances[name].functions !== null) {
			SVGPicture.instances[name].functions.start(svgImage);
		}
		if (SVGPicture.instances[name].inventory) {
			managerGame.addToInventory(name, 'svg');
		}
		if (!managerGame.isInventory && managerGame.working) {
			await managerGame.changeDisplay('show', 'black', 0.8);
			svgImage.addEventListener('hidden', async ()=> await managerGame.changeDisplay('hide'));
		}
		[svgImage.x, svgImage.y] = position;
		svgImage.isVisible = true;
		svgImage.created = true;
		await svgImage.changeOpacity();
		if (!managerGame.isInventory) {
			return SVGPicture.instances[name].stop;		
		} 
		return false;

		
		/*
		const inst = SVGPicture.instance; 
		const size = SVGPicture.instances[name].size.slice();
		
		const svgImage = inst.createInstance('preUi', -1000, -1000);

		return new Promise(async (resolve, reject) => {
			try {
				await svgImage.setContent(`<img id="img_svg" src="./svg/${SVGPicture.instances[name].name}.svg">`);
				svgImage.setSize(...size);
				svgImage.name = name;
				SVGPicture.currentInstances[name] = svgImage;
				if (SVGPicture.instances[name].functions !== null && SVGPicture.preload) {
					SVGPicture.instances[name].functions.start(svgImage);
				}
				if (SVGPicture.instances[name].inventory && SVGPicture.preload) {
					managerGame.addToInventory(name, 'svg');
				}
				
				globalThis.nextTick(async ()=> {
					[svgImage.x, svgImage.y] = position;
					await svgImage.changeOpacity();
					if (!managerGame.isInventory && managerGame.working) {
						managerGame.changeDisplay('show', 'black', 0.8);
						svgImage.addEventListener('destroy', ()=> managerGame.changeDisplay('hide'));
					}
					svgImage.created = true;
				})
				resolve(SVGPicture.instances[name].stop);				
			} catch(e) {
				reject(e);
			}
		});	*/
	}
	
	static hide(name) {
		if (!SVGPicture.instances.hasOwnProperty(name)) {
			errorManager.handle(new Error(`Don't exist svg-image with name ${name}`));
			return false;
		}
		const svgImage = SVGPicture.getInstance(name);
		if (svgImage === null) {
			if (!SVGPicture.instances[name].preload) {
				return Picture.hide(SVGPicture.instances[name].alt);
			}
			return false;
		}
		delete SVGPicture.showedInstances[name];
		svgImage.functions = {};
		svgImage.variables = {};
		[svgImage.x, svgImage.y] = [-1000, -1000];
		svgImage.isVisible = false;
		const e = new C3.Event('hidden', true);
		svgImage.dispatchEvent(e);

		/*if (svgImage === null) {
			return;
		}
		delete SVGPicture.currentInstances[name];
		svgImage.destroy();*/
		if (SVGPicture.instances[name].stop) {
			managerGame.waiting = false;		
		}
		return;
	}
	
	variables = {}
	functions = {}
	
	constructor() {
		super();
	}
	
	async hide() {
		SVGPicture.hide(this.name);
		return;
	}
	
	tick() {
		for (const key in this.functions) {
			try {
				this.functions[key](this);			
			} catch(e) {
				errorManager.handle(e);
				delete this.functions[key];
			}
		}
		return;
	}
	
	created = false;
	changing = 'none'
	
	destroy() {
		if (!this.created) {
			globalThis.nextTick(()=> this.destroy());
			return;
		}
		if (this.changing === 'none') {
			super.destroy();
		} else {
			this.addEventListener(`change${this.changing}Ended`, ()=> super.destroy());
		}
		return;
	}
	
	async changeOpacity(startV = 0, endV = 1, time = 0.3) {
		if (!this.isVisible) return;
		this.changing = 'Opacity';
		await this.setContentCssStyle('opacity', `${startV}`, '');
		let sV = startV;
		const dO = (endV - startV)/(time*20);
		
		const step = async function() {
			if ((dO > 0 && sV + dO >= endV) || (dO < 0 && sV +dO <= endV)) {
				await this.setContentCssStyle('opacity', `${endV}`, '');
				const e =  new C3.Event('changeOpacityEnded', true);
				this.dispatchEvent(e);
				this.changing = 'none';
			} else {
				sV += dO;
				await this.setContentCssStyle('opacity', `${sV}`, '');
				globalThis.nextTick(step);
			}
		}.bind(this);
		
		step();
		return;
	}
}

export class HTMLPicture extends globalThis.IHTMLElementInstance {
	
	static instances = {}
	
	static currentInstances = [];
	
	static instance = null;
	
	static setClass(instance, opts) {
		instance.setInstanceClass(HTMLPicture);
		HTMLPicture.instance = instance;
		for (const type in opts) {
			HTMLPicture.instances[type] = structuredClone(opts[type]);			
		}
		return;
	}
	
	static async create(type, x, y) {
		// Создаем картинку в виде div
		const pic = HTMLPicture.instance.createInstance('ui', -1000, -1000);
		pic.type = type;
		// Проверим поведения
		if (!HTMLPicture.instances[type].drag) {
			pic.behaviors.DragDrop.isEnabled = false;
		}
		// Занесем текст в список
		HTMLPicture.currentInstances.push(pic);
		
		// При удалении объекта убираем из списка
		pic.addEventListener('destroy', ()=> {
			HTMLPicture.currentInstances = HTMLPicture.currentInstances.filter((elem) => elem.uid !== pic.uid);
		})
		
		if (HTMLPicture.instances[type].hover) {
			pic.addEventListener('hoverTrue', ()=> pic.hover(true));
			pic.addEventListener('hoverFalse', ()=> pic.hover(false));
		}
		
		// Передаем текст в div 
		await pic.setContent(`<img class="${HTMLPicture.instances[type].class}" src="${HTMLPicture.instances[type].src}">`);
		let size = HTMLPicture.instances[type].size.slice();
		let position = [x, y];
		if (HTMLPicture.instances[type].hasOwnProperty('mobile') && main.type !== 'pc') {
			const rel = HTMLPicture.instances[type].mobile;
			if (x < 960) {
				position[0] -= (size[0]/2 - size[0]*rel/1.75);
			} else {
				position[0] += (size[0]/2 - size[0]*rel/1.75);
			}
			if (y < 540) {
				position[1] -= (size[1]/2 - size[1]*rel/1.75);
			} else {
				position[1] += (size[1]/2 - size[1]*rel/1.75);
			}
			size = size.map((elem) => elem*rel);
		}
		[pic.width, pic.height] = size;
		let fadeParams = [0, 1, 0.3];
		if (HTMLPicture.instances[type].otherFade) {
			fadeParams = HTMLPicture.instances[type].otherFade.slice();
		}
		// Прорисовка
		globalThis.nextTick(async () => {
			[pic.x, pic.y] = position;
			await pic.changeOpacity(...fadeParams);
			pic.created = true;
		}); 
		
		// Возвращаем текст
		return pic;
	}
	
	async hover(bool) {
		if (this.isHovered === bool) {
			return;
		}
		this.isHovered = bool;
		if (bool) {
			this.width *= 1.1;
			this.height *= 1.1;
		} else {
			this.width /= 1.1;
			this.height /= 1.1;
		}
		return;
	}
	
	isHovered = false;
	
	created = false
	changing = 'none'
	
	destroy() {
		this.isVisible = false;
		if (!this.created) {
			globalThis.nextTick(()=> this.destroy());
			return;
		}
		if (this.changing === 'none') {
			super.destroy();
		} else {
			this.addEventListener(`change${this.changing}Ended`, ()=> super.destroy());
		}
		return;
	}
	
	async changeOpacity(startV = 0, endV = 1, time = 0.3) {
		if (!this.isVisible) return;
		this.changing = 'Opacity';
		await this.setContentCssStyle('opacity', `${startV}`, '');
		let sV = startV;
		const dO = (endV - startV)/(time*20);
		
		const step = async function() {
			if ((dO > 0 && sV + dO >= endV) || (dO < 0 && sV +dO <= endV)) {
				await this.setContentCssStyle('opacity', `${endV}`, '');
				const e =  new C3.Event('changeOpacityEnded', true);
				this.dispatchEvent(e);
				this.changing = 'none';
			} else {
				sV += dO;
				await this.setContentCssStyle('opacity', `${sV}`, '');
				globalThis.nextTick(step);
			}
		}.bind(this);
		
		step();
		return;
	}
}

