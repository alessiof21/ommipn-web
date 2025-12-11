import { controller, settingsManager, logger, managerGame } from './main.js';
import { containPoint, areaContainPoint } from './usefulFunctions.js';


export default class UiManager extends EventTarget {
	constructor(runtime) {
		if (UiManager._instance === undefined) {
			super();
			this.runtime = runtime;
			UiManager._instance = this;
			logger.add({type: 'info', text: 'Successfully: uiManager was initialized'})
		} else {
			return UiManager._instance;
		}
	}
	
	buttons = {
		/*
			Тип перечисляется через - и пишется в кавычках
			
			// Базовые типы
			usual - обычная кнопка, не работающая во время паузы, меняющая кадр при наведении (стоит по умолчанию)
			special - как usual, только работает во время паузы, может быть скомбинирован с любыми другими базовыми типами, кроме usual (так как не имеет смысла)
			active - работает как usual, когда имя анимации === 'active', иначе не работает
			noanimation - как usual, но нет смены кадра при наведении
			
			// Дополнительные параметры
			hover - при наведении диспатчит событие 'hoverTrue', при убирании - 'hoverFalse'
			cursor - при наведении меняет вид курсора на true, при убирании - на false
			
			// Работа со звуком
			sound(soundName) - при клике будет проигран звук с именем soundName
			
		*/
	}
	
	
	// Метод, вызываемый каждый тик
	tick() {
		// Работа с кнопками
		for (const type in this.buttons) {
			if (!type.includes('dialog') && settingsManager.dialogMode) {
				continue;
			}
			if (!type.includes('special') && settingsManager.isPaused) {
				continue;
			}
			if (type.includes('noninventory') && managerGame.isInventory) {
				continue;
			}
			for (const key in this.buttons[type]) {
				const button = this.buttons[type][key][0];
				if (type === 'active' && button.animationName !== 'active') {
					continue;
				}
				const event = this.buttons[type][key][1];
				if (controller.type === 'mouse') {
					const mouseArr = controller.getPosition();
					if (button && button.isVisible && mouseArr && button.containsPoint(... mouseArr)) {
						if (!type.includes('noanimation')) {
							if (button.animationFrame !== 1) {
								button.animationFrame = 1;
								if (type.includes('cursor')) {
									controller.setCursor(true);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverTrue', true);
									button.dispatchEvent(e);
								}
							}							
						} else {
							if (!this.buttons[type][key][2]) {
								this.buttons[type][key][2] = true;
								if (type.includes('cursor')) {
									controller.setCursor(true);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverTrue', true);
									button.dispatchEvent(e);
								}
							}
						}
						if (!type.includes('noclicked')) {
							const pointer = controller.isClicked();
							if (pointer.clicked) {
								const e = new C3.Event(event, true);
								button.dispatchEvent(e);
								if (type.includes('sound')) {
									const sound = type.match(/sound\(.+\)/gm);
									const soundName = sound[0].slice(6, sound[0].length-1);
									managerGame.audio('play', soundName);
								}
							}								
						}
					} else if (button && button.isVisible) {
						if (!type.includes('noanimation')) {
							if (button.animationFrame === 1) {
								button.animationFrame = 0;
								if (type.includes('cursor')) {
									controller.setCursor(false);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverFalse', true);
									button.dispatchEvent(e);
								}
							}
						} else {
							if (this.buttons[type][key][2]) {
								this.buttons[type][key][2] = false;
								if (type.includes('cursor')) {
									controller.setCursor(false);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverFalse', true);
									button.dispatchEvent(e);
								}
							}
						}
					}
				} else {
					if (button && button.isVisible) {
						if ((!type.includes('noanimation') && button.animationFrame === 0) || (type.includes('noanimation') && !this.buttons[type][key][2])) {	
							const touchDown = controller.isClicked();
							if (touchDown.clicked && button.containsPoint(...touchDown.position)) {
								if (!type.includes('noanimation')) {
									button.animationFrame = 1;
								} else {
									this.buttons[type][key][2] = true;
								}
								if (type.includes('cursor')) {
									controller.setCursor(true);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverTrue', true);
									button.dispatchEvent(e);						
								}
							}
						}
						if ((!type.includes('noanimation') && button.animationFrame === 1) || (type.includes('noanimation') && this.buttons[type][key][2])) {
							const touchUp = controller.isUp();
							if (touchUp.event) {
								/* containsPoint плохо, так как с маленькими элементами сложно
								if (button.containsPoint(...touchUp.position)) {
									const e = new C3.Event(event, true);
									button.dispatchEvent(e);
								} */
								/*
								Может нужно сделать элементы больше, просто картинку внутри них делать на половину меньше?
								*/
								if (button.containsPoint(...touchUp.position)/*Math.abs(button.x - touchUp.position[0]) <= button.width*2 &&  Math.abs(button.y - touchUp.position[1]) <= button.height*2*/) {
									const e = new C3.Event(event, true);
									button.dispatchEvent(e);
								}
								if (type.includes('cursor')) {
									controller.setCursor(false);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverFalse', true);
									button.dispatchEvent(e);						
								}
								if (!type.includes('noanimation')) {
									button.animationFrame = 0;							
								} else {
									this.buttons[type][key][2] = false;
								}	
							}
							/*if (touchUp.event && button.containsPoint(...touchUp.position)) { // Отпустили там, где кнопка выбора
								const e = new C3.Event(event, true);
								button.dispatchEvent(e);	
							} else if (touchUp.event && !button.containsPoint(...touchUp.position)) { // Отпустили не там, где кнопка
	
							} else if (touchUp.event) {
								if (type.includes('cursor')) {
									controller.setCursor(false);
								}
								if (type.includes('hover')) {
									const e = new C3.Event('hoverFalse', true);
									button.dispatchEvent(e);						
								}
								if (!type.includes('noanimation')) {
									button.animationFrame = 0;							
								} else {
									this.buttons[type][key][2] = false;
								}
							}*/

						}
					}	
				}
			}			
		}
		// Работа с кликерами
		for (const uid in this.clickers) {
			const clicker = this.clickers[uid][0];
			const area = this.clickers[uid][1];
			if (this.clickers[uid][2]) { // Был нажат
				if (controller.type === 'mouse') { // Мышь
					const isUp = controller.isUp();
					if (isUp) {
						this.clickers[uid][2] = false;
						const e = new C3.Event('uped', true);
						clicker.dispatchEvent(e);
						break;
					}
				} else {
				
				}
			} else { // Не был нажат
				if (controller.type === 'mouse') { // Мышь
					const mouseArr = controller.getPosition();
					if (clicker && clicker.isVisible && areaContainPoint(mouseArr, area)) {
						const pointer = controller.isClicked();
						if (pointer.clicked) {
							this.clickers[uid][2] = true;
							const e = new C3.Event('clicked', true);
							clicker.dispatchEvent(e);
						}
					}
				} else {
				
				}
			}
		}
		return;
	}
	
	destroys = {};
	
	addButton(button, event, type='usual') {
		const uid = `${button.uid}`;
		if (!this.buttons.hasOwnProperty(type)) {
			this.buttons[type] = {};
		}
		if (this.buttons[type].hasOwnProperty(uid)) return;
		this.buttons[type][uid] = [button, event];
		if (type.includes('noanimation')) {
			this.buttons[type][uid].push(false);
		}
		
		const destroyed = function() {
			delete this.buttons[type][uid];
			delete this.destroys[uid];
			if (type.includes('cursor')) {
				controller.setCursor(false);
			}
		}.bind(this)
		
		button.addEventListener('destroy', destroyed);
		this.destroys[uid] = destroyed;
		return;
	}
	
	deleteButton(button) {
		for (const type in this.buttons) {
			for (const uid in this.buttons[type]) {
				if (+uid === button.uid) {
					delete this.buttons[type][uid];
					button.removeEventListener('destroy',  this.destroys[uid]);
					delete this.destroys[uid];
					return;
				}
			}
		}
		return;
	}
	
	clickers = {}
	
	addClicker(clicker, area) {
		const uid = `${clicker.uid}`;
		if (this.clickers.hasOwnProperty(uid)) return;
		this.clickers[uid] = [clicker, area, false];
		
		const destroyed = function() {
			delete this.clickers[uid];
			delete this.destroys[uid];
		}.bind(this);
		
		clicker.addEventListener('destroy', destroyed);
		this.destroys[uid] = destroyed;
		return;
	}
	
	deleteClicker(clicker) {
		for (const uid in this.clickers) {
			if (+uid === clicker.uid) {
				delete this.clickers[uid];
				clicker.removeEventListener('destroy', this.destroys[uid]);
				delete this.destroys[uid];
				return;
			}
		}
		return;
	}
}