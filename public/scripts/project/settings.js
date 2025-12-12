// Для создания модальных окон, управления настройками и тд
import { main, uiManager, controller, errorManager, logger, managerGame, videoManager, audioManager } from './main.js';
import { SpriteObject, GameText, SVGPicture, HTMLPicture } from './classes.js';
import { chapters } from './scripts.js';
import { saveMain, loadMain } from './saveload.js';

export default class SettingsManager extends EventTarget {
	constructor(runtime, settings) {
		if (SettingsManager._instance === undefined) {
			super();
			this.runtime = runtime;
			SettingsManager._instance = this;
			for (const language in settings?.languages) {
				this.languagesList[language] = settings.languages[language];
				this.languages.push(language);
			}
			this.addEvent('startGameLayout',  async ()=> await this.prepareGameLayout());
			logger.add({type: 'info', text: 'Successfully: settingsManager was initialized'});
		} else {
			return SettingsManager._instance;
		}
	}
	
	tick() {
		for (const key in this.functions) {
			this.functions[key]();
		}
	}
	languages = [] // Языки по индексам
	languagesList = {} // Список языков по ключам
	main = {
		language: 'ru',
		power: true,
		text: false,
	}
	
	devs = {
		loadingStartTime: 0 
	}
	
	loadName = '' // Имя загрузки сохранения
	isPaused = false // Нажата ли пауза
	
	// События
	events = {}
	
	functions = {}
	
	dialogMode = false;
	
	dialogText = {
		error: {
			text: `К сожалению, произошла критическая ошибка работы игры. После сохранения информации игра будет закрыта.`,
			buttons: [
				`Дела-а...`
			]
		},
		tester: {
			text: `Уважаемый тестер! Тебе доступна редакторская консоль, чтобы узнать подробнее, нажми кнопку <b>F1</b>.`,
			buttons: [
				`Ок`
			]
		},
		choiceLoadChapter: {
			text: 'Перезапустить главу? Прогресс последующих глав будет потерян',
			buttons: [
				'Так точно!',
				'Ну уж нет!'
			]
		},
		choiceStartNow: {
			text: 'Начать расследование заново? Весь достигнутый прогресс будет потерян',
			buttons: [
				'Так точно!',
				'Ну уж нет!'
			]			
		}
	}
	
	saveTypes = {
		/*'text': [{description: "Text file", accept: { "text/plain": [".txt"] }}],
		'json': [{description: "JSON file", accept: { "application/json" : [".json"]}}] */
		"text" : ["text/plain", ".txt", "Text file"],
		"json" : ["application/json", ".json", "JSON file"],
		"save" : ["application/json", ".save", "Saving file"]
	}
	
	// Пока примерно так будем создавать диалоговые окна...
	async createDialog(type, ...params) {
		if (this.dialogMode) return;
		return new Promise(async (resolve, reject) => {
			// Режим диалогового окна, все остальное - не работает
			this.dialogMode = true;
			const dialog = await HTMLPicture.create('dialog', 960, 540);
			const text = await GameText.create('dialogText', [960, 496], `<p class="text black">${this.dialogText[type].text}</p>`);
			
			// Все кнопки
			const buttons = [];
			// Все тексты
			const buttonTexts = [];

			for (let i = 0; i < this.dialogText[type].buttons.length; i++) {
				// Получаем imagePoint на плашке dialog для кнопки
				const x = this.dialogText[type].buttons.length === 1 ? 960 : 820 + i*280;
				// Создаем кнопку и сохраняем ее
				const button = await HTMLPicture.create('dialogB', x, 647);
				buttons.push(button);
				// Получаем класс текста для надписи на кнопке
				const btClass = this.dialogText[type].buttons[i].length > 4 ? 'dialog2' : 'dialog3';
				// Создаем текст и сохраняем его
				const buttonText = await GameText.create('dialogBText', [x, 637], `<p class="text black ${btClass}">${this.dialogText[type].buttons[i]}</p>`);
				buttonTexts.push(buttonText)

				// Выделение кнопки
				const hoverButton = async function(bool) {
					if (bool) {
						await buttonText.setContent(`<p class="text black ${btClass}Hover">${this.dialogText[type].buttons[i]}</p>`);
					} else {
						await buttonText.setContent(`<p class="text black ${btClass}">${this.dialogText[type].buttons[i]}</p>`);
					}
				}.bind(this);

				// Навешиваем события на кнопку
				button.addEventListener('hoverTrue', ()=> hoverButton(true));
				button.addEventListener('hoverFalse', ()=> hoverButton(false));
				uiManager.addButton(button, 'clickButton', 'special-hover-dialog-sound(c-button)');

				let end;
				
				// Зависимость от типа
				if (type === 'error') { // Сообщение об ошибке, нужно сохранить логи и выйти из игры		
					end = function() {
						this.dialogMode = false;
						logger.getLogs('closeApp');
						resolve();
					}.bind(this);
				} else if (type === 'tester') { // Сообщение для тестеров
					end = function() {
						button.destroy();
						buttonText.destroy();
						dialog.destroy();
						text.destroy();
						this.dispatch('readNotice', true);
						this.dialogMode = false;
						resolve();
					}.bind(this);
				} else if (type.startsWith('choice')) {
					end = function() {
						dialog.destroy();
						text.destroy();
						// Уничтожаем кнопки с текстом
						for (let j = 0; j < buttons.length; j++) {
							buttons[j].destroy();
							buttonTexts[j].destroy();
						}
						this.dialogMode = false;
						resolve(i === 0);
					}.bind(this);
				}
				button.addEventListener('clickButton', ()=> globalThis.nextTick(end));
			}
		});		
	}
		/*
		// Создаем кнопку
		const button = await this.add('dialogB', 'ui', dialog.getImagePointX('button1'), dialog.getImagePointY('button1'));
		
		// Текст на кнопке
		const btClass = this.dialogText[type].buttonText.length > 4 ? 'dialog2' : 'dialog3';
		const buttonText = await GameText.create('dialogBText', [button.getImagePointX('text'), button.getImagePointY('text')], `<p class="text black ${btClass}">${this.dialogText[type].buttonText}</p>`);
			
		const hoverButton = async function(bool) {
			if (bool) {
				await buttonText.setContent(`<p class="text black ${btClass}Hover">${this.dialogText[type].buttonText}</p>`);
			} else {
				await buttonText.setContent(`<p class="text black ${btClass}">${this.dialogText[type].buttonText}</p>`);
			}
		}.bind(this);
		
		button.addEventListener('hoverTrue', ()=> hoverButton(true));
		button.addEventListener('hoverFalse', ()=> hoverButton(false));
		uiManager.addButton(button, 'clickButton', 'special-hover');
		if (type === 'error') { // Сообщение об ошибке, нужно сохранить логи и выйти из игры		
			button.addEventListener('clickButton', ()=> logger.getLogs('closeApp'));
		} else if (type === 'tester') { // Сообщение для тестеров
			button.addEventListener('clickButton', ()=> {
				button.destroy();
				buttonText.destroy();
				dialog.destroy();
				text.destroy();
				this.dispatch('readNotice', true);
			});
		}
	}*/
	
	
	// Для добавления только SpriteObject
	async add(name, layer, ...position) {
		return await SpriteObject.add(name, layer, ...position);
	}
	
	menu = {
		new: {
			buttons: [
				{ 
					text: 'Начать расследование', 
					pos: [960, 840],
					do() {
						this.startLoadGame();					
					}
				},
				{
					text: 'Выйти из игры', 
					pos: [960, 980],
					do() {
						managerGame.prepareEndGame();					
					}
				}
			]
		}, // Кнопки, которые есть только при новой игре
		continue: {
			buttons: [
				{
					text: 'Продолжить',
					pos: [640, 840],
					async do() {
						await this.startLoadGame('autosave');
					}
				},
				{
					text: 'Выбрать главу',
					pos: [640, 980],
					async do() {
						await this.chooseChapter();
						return;
					}
				},
				{
					text: 'Начать заново',
					pos: [1280, 840],
					async do() {
						if (await this.createDialog('choiceStartNow')) {
							const saves = await this.runtime.storage.keys();
							console.log(saves)
							for (let i = 0; i < saves.length; i++) {
								if (saves[i].includes('chapter')) {
									await this.runtime.storage.removeItem(saves[i]);
								}
							}
							await this.runtime.storage.removeItem('prevAutosave');
							await this.runtime.storage.removeItem('autosave');
							console.log(await this.runtime.storage.keys())
							this.startLoadGame();							
						}						
						return;
					}
				},
				{
					text: 'Выйти из игры', 
					pos: [1280, 980],
					do() {
						managerGame.prepareEndGame();					
					}
				}
			]
		}, // Кнопки, которые есть только при загрузке
		usual: {
			buttons: [
				{
					name: 'pauseButton',
					pos: [1800, 100],
					do() {
						if (!this.menu.usual.settingsScreen) {
							this.menu.usual.openSettings.call(this);
						} else {
							this.menu.usual.closeSettings.call(this);
						}
					}
				},
			], 
			texts: [
				{
					text: 'Громкость звука',
					class: 'text white',
					pos: [960, 220],
				},
				{
					text: 'Громкость музыки',
					class: 'text white',
					pos: [960, 340]
				},
				{
					text: 'Выбор языка',
					class: 'text white',
					pos: [960, 460]
				},
				{
					text: 'Оптимизация игры',
					class: 'text white',
					pos: [900, 610]					
				},
				{
					text: 'Плавный текст',
					class: 'text white',
					pos: [900, 710],
				},
				{
					text: 'Поддержка',
					class: 'text white',
					pos: [960, 810]
				},
				/*{
					text: 'Авторы',
					class: 'text white',
					pos: [960, 810]
				},*/
				{
					text: `Версия приложения: ${main?.version ?? 'none'}`,
					class: 'text white dialog',
					pos: [960, 900]
				}
				
			],
			settings: [
				{
					name: "back", 
					async start() {
						// Создаем стрелку возврата
						const arrowBack = await HTMLPicture.create('return', 580, 200);
						uiManager.addButton(arrowBack, 'closeMenu', 'special-noanimation-hover-sound(c-button)');
						arrowBack.addEventListener('closeMenu', ()=> this.menu.usual.closeSettings.call(this));
						return arrowBack;
					}
				},
				{
					name: "sound",
					async start() {
						const soundScale = await HTMLPicture.create('audioScale', 960, 280);
						const soundX = 760 + 400*audioManager.volume.sound;
						const soundButton = await HTMLPicture.create('audioButton', soundX, 278);
						soundButton.behaviors.DragDrop.axes = 'horizontal';
						
						const tick = function() {
							const direction = controller.getDirection() || [0,0];
							if (soundButton.behaviors.DragDrop.isDragging) {
								if (soundButton.x - 20 < 760 && direction[0] === 1) {
									soundButton.behaviors.DragDrop.drop();
									soundButton.x = 760;	
								} else {
									if (soundButton.x + 20 > 1160 && direction[0] === -1) {
										soundButton.behaviors.DragDrop.drop();
										soundButton.x = 1160;	
									}
								}								
							} else {
								if (soundButton.x < 760) {
									soundButton.x = 760;
								} else if (soundButton.x > 1160) {
									soundButton.x = 1160;
								}
							}

							audioManager.changeSound((soundButton.x-760)/400);
						}
						
						this.functions[`settingsSound`] = tick;
						
						return [soundScale, soundButton];
					}
				},
				{
					name: "music",
					async start() {
						const musicScale = await HTMLPicture.create('audioScale', 960, 400);
						const musicX = 760 + 400*audioManager.volume.music;
						const musicButton = await HTMLPicture.create('audioButton', musicX, 398);
						musicButton.behaviors.DragDrop.axes = 'horizontal';
						
						const tick = function() {
							const direction = controller.getDirection() || [0,0];
							if (musicButton.behaviors.DragDrop.isDragging) {
								if (musicButton.x - 20 < 760 && direction[0] === 1) {
									musicButton.behaviors.DragDrop.drop();
									musicButton.x = 760;	
								} else {
									if (musicButton.x + 20 > 1160 && direction[0] === -1) {
										musicButton.behaviors.DragDrop.drop();
										musicButton.x = 1160;	
									}
								}								
							} else {
								if (musicButton.x < 760) {
									musicButton.x = 760;
								} else if (musicButton.x > 1160) {
									musicButton.x = 1160;
								}
							}
							audioManager.changeMusic((musicButton.x-760)/400);
						}
						
						this.functions[`settingsMusic`] = tick;
						
						return [musicScale, musicButton];					
					}			
				},
				{
					name: 'language',
					async start() {
						const leftArrow = await HTMLPicture.create('langAL', 710, 520);
						const rightArrow = await HTMLPicture.create('langAR', 1210, 520);
						const language = await GameText.create('language', [960, 520], `<p class="text white medium"><i>${this.languagesList[this.main.language]}</i></p>`);

						uiManager.addButton(rightArrow, 'clickArrow', 'special-noanimation-hover-sound(c-button)');
						uiManager.addButton(leftArrow, 'clickArrow', 'special-noanimation-hover-sound(c-button)');
						
						const changeLanguage = async function(x) {
							const index = this.languages.indexOf(this.main.language);
							if (x === -1) {
								if (index === 0) {
									this.main.language = this.languages[this.languages.length-1];
								} else {
									this.main.language = this.languages[index-1];
								}
							} else {
								if (index === this.languages.length-1) {
									this.main.language = this.languages[0];
								} else {
									this.main.language = this.languages[index+1];
								}
							}
							await language.setContent(`<p class="text white medium"><i>${this.languagesList[this.main.language]}</i></p>`);
						}.bind(this);
						
						leftArrow.addEventListener('clickArrow', ()=> changeLanguage(-1));
						rightArrow.addEventListener('clickArrow', ()=> changeLanguage(1));						
						return [leftArrow, rightArrow, language];
					}
				},
				{
					name: 'powerScale',
					async start() {
						const powerScale = await HTMLPicture.create('powerScale', 1150, 610);
						const buttonX = this.main.power? 1130 : 1170;
						const powerButton = await HTMLPicture.create('powerButton', buttonX, 610);
						
						const click = async function() {
							if (this.main.power) {
								this.main.power = false;
								powerButton.x = 1170;
							} else {
								this.main.power = true;
								powerButton.x = 1130;
							}
						}.bind(this)
						
						powerButton.addEventListener('clickButton', click);
						
						uiManager.addButton(powerButton, 'clickButton', 'special-noanimation-sound(c-button)');
						return [powerScale, powerButton];
					}
				},
				{
					name: 'powerInfo',
					async start() {
						const powerInfo = await HTMLPicture.create('powerInfo', 1280, 610);
						
						const powerField = await HTMLPicture.create('powerField', 1480, 610);
						const powerText = await GameText.create('powerText', [1480, 610], `<p class="text light vmin1_7">Для улучшения производительности все динамические элементы будут отключены</p>`);
						
						powerField.hoverSensitive = true;
						powerText.hoverSensitive = true;
						
						const changeV = function(bool) {
							powerField.isVisible = bool;
							powerText.isVisible = bool;
						}
						
						changeV(false);
						
						powerInfo.addEventListener("hoverTrue", ()=> changeV(true));
						powerInfo.addEventListener("hoverFalse", ()=> changeV(false));
						
						uiManager.addButton(powerInfo, '', 'special-noanimation-hover-noclicked')
						return [powerInfo, powerText, powerField];
					}
				},
				{
					name: 'textScale',
					async start() {
						const textScale = await HTMLPicture.create('powerScale', 1150, 710);
						const buttonX = this.main.text? 1130 : 1170;
						const textButton = await HTMLPicture.create('powerButton', buttonX, 710);
						
						const click = async function() {
							if (this.main.text) {
								this.main.text = false;
								textButton.x = 1170;
							} else {
								this.main.text = true;
								textButton.x = 1130;
							}
						}.bind(this)
						
						textButton.addEventListener('clickButton', click);
						
						uiManager.addButton(textButton, 'clickButton', 'special-noanimation-sound(c-button)');
						return [textScale, textButton];
					}
				},
				{
					name: 'textInfo',
					async start() {
						const textInfo = await HTMLPicture.create('powerInfo', 1280, 710);
						
						const textField = await HTMLPicture.create('powerField', 1480, 710);
						const textText = await GameText.create('powerText', [1480, 710], `<p class="text light vmin1_7">Текст в диалогах<br/> и монологах появляется постепенно, как на печатной машинке</p>`);
						
						textField.hoverSensitive = true;
						textText.hoverSensitive = true;
						
						const changeV = function(bool) {
							textField.isVisible = bool;
							textText.isVisible = bool;
						}
						
						changeV(false);
						
						textInfo.addEventListener("hoverTrue", ()=> changeV(true));
						textInfo.addEventListener("hoverFalse", ()=> changeV(false));
						
						uiManager.addButton(textInfo, '', 'special-noanimation-hover-noclicked')
						return [textInfo, textText, textField];
					}
				},
				{
					name: 'support',
					async start() {					
						const support = await HTMLPicture.create('addSetB', 960, 810);
						uiManager.addButton(support, 'clickSupport', 'special-noanimation-hover-sound(c-button)');
						
						const clickButton = function() {			
							this.dispatch('hideSettings');
							this.menu.usual.showSupport.call(this);
						}.bind(this);
						
						support.addEventListener('clickSupport', clickButton);			
						return support;
					},
				},
				/*{
					name: 'credits',
					async start() {					
						const credits = await HTMLPicture.create('addSetB', 960, 810);
						uiManager.addButton(credits, 'clickCredits', 'special-noanimation-hover-sound(c-button)');
						
						const clickButton = function() {
							this.dispatch('hideSettings');
							this.menu.usual.showCredits.call(this);
						}.bind(this);
						
						credits.addEventListener('clickCredits', clickButton);			
						return credits;
					},
				},*/
				{
					name: 'settingsMenuLine',
					pos: [960, 870]
				},
			],
			elements: [],
			settingsScreen: false, // Демонстрируется ли экран настроек
			async showCredits() {
				// Создаем плашку меню
				const menu = await HTMLPicture.create('settingsMenu', 960, 540);
				// Создаем стрелку возврата
				const arrowBack = await HTMLPicture.create('return', 580, 200);
				// Текст титров
				const creditsText = await GameText.create('longMenuText', [960, 540], `<p class="text white vmin2">Авторы идеи<br/><span class="vmin3 bold">Антон Лапенко<br/>Алексей Смирнов</span><br/><br/>Сценарист<br/><span class="vmin3 bold">Виктория Федоренко</span><br/><br/>Редактор<br/><span class="vmin3 bold">Алексей Федоренко</span><br/><br/>Программист<br/><span class="vmin3 bold">Алексей Федоренко</span><br/><br/>Художник<br/><span class="vmin3 bold">Виктория Федоренко</span></p>`);
				
				// Функция, срабатывающая при нажатии на возвратную стрелку
				const closeCredits = function() {
					this.deleteEvent('closeCredits');
					this.deleteEvent('alreadyVisible');
					arrowBack.destroy();
					creditsText.destroy();
					menu.destroy();
				}.bind(this);
				
				uiManager.addButton(arrowBack, 'closeCredits', 'special-noanimation-hover-sound(c-button)');
				arrowBack.addEventListener('closeCredits', ()=> this.dispatch('showSettings'));
				
				this.addEvent('alreadyVisible', closeCredits);
				this.addEvent('closeCredits', closeCredits);
			},
			async showSupport() {
				// Создаем плашку меню
				const menu = await HTMLPicture.create('settingsMenu', 960, 540);
				// Создаем стрелку возврата
				const arrowBack = await HTMLPicture.create('return', 580, 200);
				// Текст поддержки
				const supportText = await GameText.create('longMenuText', [960, 540],`<p class="text white">Дорогой игрок!<br/><br/>При возникновении ошибок, сообщите об этом на нашу почту <b>caravan.comand@gmail.com</b>. Также можно приложить файл логов, который Вы можете получить, нажав на кнопку ниже <b>Логи</b>.Мы стараемся быть лучше, спасибо за понимание!<br/><br/>Всегда Ваши, Caravan Games.</p>`);
				// Кнопка и текст логов
				const getLog =  await HTMLPicture.create('addSetB', 960, 860);
				const logText = await GameText.create('menuText', [960, 860], `<p class="text white">Логи</p>`);
				// Навешиваем обработчик событий на кнопку логов
				uiManager.addButton(getLog, 'getLogs', 'special-noanimation-hover-sound(c-button)');
				
				getLog.addEventListener('getLogs', ()=> logger.getLogs());
				
				const closeSupport = function() {
					this.deleteEvent('closeSupport');
					this.deleteEvent('alreadyVisible');
					getLog.destroy();
					logText.destroy();
					supportText.destroy();
					arrowBack.destroy();
					menu.destroy();
				}.bind(this);
				
				uiManager.addButton(arrowBack, 'closeSupport', 'special-noanimation-hover-sound(c-button)');
				
				arrowBack.addEventListener('closeSupport', ()=> this.dispatch('showSettings'));
				
				this.addEvent('alreadyVisible', closeSupport);
				this.addEvent('closeSupport', closeSupport);
				
			},
			async openSettings() {
				this.isPaused = true;
				const menu = await HTMLPicture.create('settingsMenu', 960, 540);	
				for (let i = 0; i < this.menu.usual.settings.length; i++) {
					let obj;
					if (this.menu.usual.settings[i].hasOwnProperty('start')) {
						obj = await this.menu.usual.settings[i].start.call(this);
					} else {
						obj = await HTMLPicture.create(this.menu.usual.settings[i].name,...this.menu.usual.settings[i].pos);
					}
					if (Array.isArray(obj)) { // Если массив объектов получили
						this.menu.usual.elements.push(...obj);
					} else {
						this.menu.usual.elements.push(obj);	
					}
				}
				
				for (let i = 0; i < this.menu.usual.texts.length; i++) {
					const text = await GameText.create('menuText', this.menu.usual.texts[i].pos, `<p class="${this.menu.usual.texts[i].class}">${this.menu.usual.texts[i].text}</p>`);
					this.menu.usual.elements.push(text);
				}
				
				const visible = function(bool) {
					for (let i = 0; i < this.menu.usual.elements.length; i++) {
						const inst = this.menu.usual.elements[i];
						if (inst.hasOwnProperty('hoverSensitive')) continue;
						inst.isVisible = bool;
					}
				}.bind(this);
				
				this.menu.usual.elements.push(menu);
	
				
				this.addEvent('showSettings', ()=> {
					visible(true);
					this.dispatch('alreadyVisible');
				});
				this.addEvent('hideSettings', ()=> visible(false));
				//this.dispatch('hidden');
				this.dispatch('closeChapters');

				this.addEvent('showSettings', ()=> {
					visible(true);
					this.dispatch('alreadyVisible');
				});
				this.addEvent('hideSettings', ()=> visible(false));
				this.menu.usual.settingsScreen = true;
				return;
			},	
			async closeSettings() {
				this.isPaused = false;
				for (let i = 0; i < this.menu.usual.elements.length; i++) {
					this.menu.usual.elements[i].destroy();
				}
				this.dispatch('closeSupport');
				this.dispatch('closeCredits');
				for (const key in this.functions) {
					if (key.startsWith('settings')) {
						delete this.functions[key];
					}
				}
				this.menu.usual.elements = [];
				this.menu.usual.screen = '';
				await this.runtime.storage.setItem('mainSettings', saveMain());
				this.deleteEvent('showSettings');
				this.deleteEvent('hideSettings');
				this.menu.usual.settingsScreen = false;
				return;
			},
		}, // Кнопки, которые есть всегда
		pause: {
			texts: [
				{
					text: 'Громкость звука',
					class: 'text white',
					pos: [960, 240],
				},
				{
					text: 'Громкость музыки',
					class: 'text white',
					pos: [960, 360]
				},
				{
					text: 'Плавный текст',
					class: 'text white',
					pos: [900, 500]
				},
				{
					text: 'Поддержка',
					class: 'text white',
					pos: [960, 595]
				},
				/*{
					text: 'Авторы',
					class: 'text white',
					pos: [960, 595]
				},*/
				{
					text: 'В главное меню',
					class: 'text white',
					pos: [960, 690]
				},
				{
					text: 'Выйти из игры',
					class: 'text white',
					pos: [960, 785]
				},
				{
					text: `Версия приложения: ${main?.version ?? 'none'}`,
					class: 'text white dialog',
					pos: [960, 900]
				}
			],
			settings: [
				{
					name: "back",
					async start() {
						// Создаем стрелку возврата
						const arrowBack = await HTMLPicture.create('return', 580, 200);
						uiManager.addButton(arrowBack, 'closePause', 'special-noanimation-hover-sound(c-button)');
						arrowBack.addEventListener('closePause', ()=> this.pause());
						return arrowBack;
					}
				},
				{
					name: "sound",
					async start() {
						const soundScale = await HTMLPicture.create('audioScale', 960, 300);
						const soundX = 760 + 400*audioManager.volume.sound;
						const soundButton = await HTMLPicture.create('audioButton', soundX, 298);
						soundButton.behaviors.DragDrop.axes = 'horizontal';
						
						const tick = function() {
							const direction = controller.getDirection() || [0,0];
							if (soundButton.behaviors.DragDrop.isDragging) {
								if (soundButton.x - 20 < 760 && direction[0] === 1) {
									soundButton.behaviors.DragDrop.drop();
									soundButton.x = 760;	
								} else {
									if (soundButton.x + 20 > 1160 && direction[0] === -1) {
										soundButton.behaviors.DragDrop.drop();
										soundButton.x = 1160;	
									}
								}								
							} else {
								if (soundButton.x < 760) {
									soundButton.x = 760;
								} else if (soundButton.x > 1160) {
									soundButton.x = 1160;
								}
							}
							audioManager.changeSound((soundButton.x-760)/400);
						}
						
						this.functions[`settingsSound`] = tick;
						
						return [soundScale, soundButton];
					}
				},
				{
					name: "music",
					async start() {
						const musicScale = await HTMLPicture.create('audioScale', 960, 420);
						const musicX = 760 + 400*audioManager.volume.music;
						const musicButton = await HTMLPicture.create('audioButton', musicX, 418);
						musicButton.behaviors.DragDrop.axes = 'horizontal';
						
						const tick = function() {
							const direction = controller.getDirection() || [0,0];
							
							if (musicButton.behaviors.DragDrop.isDragging) {
								if (musicButton.x - 20 < 760 && direction[0] === 1) {
									musicButton.behaviors.DragDrop.drop();
									musicButton.x = 760;	
								} else {
									if (musicButton.x + 20 > 1160 && direction[0] === -1) {
										musicButton.behaviors.DragDrop.drop();
										musicButton.x = 1160;	
									}
								}								
							} else {
								if (musicButton.x < 760) {
									musicButton.x = 760;
								} else if (musicButton.x > 1160) {
									musicButton.x = 1160;
								}
							}

							audioManager.changeMusic((musicButton.x-760)/400);
						}
						
						this.functions[`settingsMusic`] = tick;
						
						return [musicScale, musicButton];					
					}			
				},
				{
					name: 'textScale',
					async start() {
						const textScale = await HTMLPicture.create('powerScale', 1150, 500);
						const buttonX = this.main.text? 1130 : 1170;
						const textButton = await HTMLPicture.create('powerButton', buttonX, 500);
						
						const click = async function() {
							if (this.main.text) {
								this.main.text = false;
								textButton.x = 1170;
							} else {
								this.main.text = true;
								textButton.x = 1130;
							}
						}.bind(this)
						
						textButton.addEventListener('clickButton', click);
						
						uiManager.addButton(textButton, 'clickButton', 'special-noanimation-sound(c-button)');
						return [textScale, textButton];
					}
				},
				{
					name: 'textInfo',
					async start() {
						const textInfo = await HTMLPicture.create('powerInfo', 1280, 500);
						
						const textField = await HTMLPicture.create('powerField', 1480, 500);
						const textText = await GameText.create('powerText', [1480, 500], `<p class="text light vmin1_7">Текст в диалогах<br/> и монологах появляется постепенно, как на печатной машинке</p>`);
						
						textField.hoverSensitive = true;
						textText.hoverSensitive = true;
						
						const changeV = function(bool) {
							textField.isVisible = bool;
							textText.isVisible = bool;
						}
						
						changeV(false);
						
						textInfo.addEventListener("hoverTrue", ()=> changeV(true));
						textInfo.addEventListener("hoverFalse", ()=> changeV(false));
						
						uiManager.addButton(textInfo, '', 'special-noanimation-hover-noclicked')
						return [textInfo, textText, textField];
					}
				},
				{
					name: 'support',
					async start() {					
						const support = await HTMLPicture.create('addSetB', 960, 595);
						uiManager.addButton(support, 'clickSupport', 'special-noanimation-hover-sound(c-button)');
						
						const clickButton = function() {			
							this.dispatch('hideSettings');
							this.menu.usual.showSupport.call(this);
						}.bind(this);
						
						support.addEventListener('clickSupport', clickButton);			
						return support;
					},
				},
				/*{
					name: 'credits',
					async start() {					
						const credits = await HTMLPicture.create('addSetB', 960, 595);
						uiManager.addButton(credits, 'clickCredits', 'special-noanimation-hover-sound(c-button)');
						
						const clickButton = function() {
							this.dispatch('hideSettings');
							this.menu.usual.showCredits.call(this);
						}.bind(this);
						
						credits.addEventListener('clickCredits', clickButton);			
						return credits;
					},
				},*/
				{
					name: 'mainMenu',
					async start() {					
						const mainMenu = await HTMLPicture.create('addSetB', 960, 690);
						uiManager.addButton(mainMenu, 'clickMainMenu', 'special-noanimation-hover-sound(c-button)');
						mainMenu.addEventListener('clickMainMenu', ()=> {
							/*this.menu.pause.closePause.call(this);
							audioManager.stopAll();
							this.runtime.goToLayout('menu');
							this.runtime.timeScale = 1;
							this.isPaused = false;*/
							this.pause();
							globalThis.nextTick(()=> {
								audioManager.stopAll();
								this.runtime.goToLayout('menu');					
							});
						})
						return mainMenu;
					}
				},
				{
					name: 'exit',
					async start() {					
						const exit = await HTMLPicture.create('addSetB', 960, 785);
						uiManager.addButton(exit, 'clickExit', 'special-noanimation-hover-sound(c-button)');
						exit.addEventListener('clickExit', ()=> managerGame.prepareEndGame());
						return exit;
					}
				},
				{
					name: 'settingsMenuLine',
					pos: [960, 850]
				},
			],
			elements: [],
			async openPause() {
				const menu = await HTMLPicture.create('settingsMenu', 960, 540);	
				for (let i = 0; i < this.menu.pause.settings.length; i++) {
					let obj;
					if (this.menu.pause.settings[i].hasOwnProperty('start')) {
						obj = await this.menu.pause.settings[i].start.call(this);
					} else {
						obj = await HTMLPicture.create(this.menu.pause.settings[i].name,...this.menu.pause.settings[i].pos);
					}
					if (Array.isArray(obj)) { // Если массив объектов получили
						this.menu.pause.elements.push(...obj);
					} else {
						this.menu.pause.elements.push(obj);	
					}
				}
				
				for (let i = 0; i < this.menu.pause.texts.length; i++) {
					const text = await GameText.create('menuText', this.menu.pause.texts[i].pos, `<p class="${this.menu.pause.texts[i].class}">${this.menu.pause.texts[i].text}</p>`);
					this.menu.pause.elements.push(text);
				}
				
				const visible = function(bool) {
					for (let i = 0; i < this.menu.pause.elements.length; i++) {
						const inst = this.menu.pause.elements[i];
						inst.isVisible = bool;
					}
				}.bind(this);
				
				this.menu.pause.elements.push(menu);
				//this.menu.pause.screen = 'main';	
				
				this.addEvent('showSettings', ()=> {
					visible(true);
					this.dispatch('alreadyVisible');
				});
				this.addEvent('hideSettings', ()=> visible(false));					
			},
			async closePause() {
				for (let i = 0; i < this.menu.pause.elements.length; i++) {
					this.menu.pause.elements[i].destroy();
				}
				this.dispatch('closeSupport');
				this.dispatch('closeCredits');
				for (const key in this.functions) {
					if (key.startsWith('settings')) {
						delete this.functions[key];
					}
				}
				this.menu.pause.elements = [];
				this.menu.pause.screen = '';
				await this.runtime.storage.setItem('mainSettings', saveMain());
				this.deleteEvent('showSettings');
				this.deleteEvent('hideSettings');
				return;
			}
		},
		type: 'new',// Тип меню
	}
	
	addEvent(event, callback) {
		this.events[event] = callback;
		this.addEventListener(event, callback);
		return;
	}
	
	dispatch(event, once = false) {
		const e = new Event(event);
		globalThis.nextTick(()=> {
			this.dispatchEvent(e);
			if (once) {
				this.deleteEvent(event);	
			}		
		})
		return;
	}
	
	deleteEvent(event) {
		this.removeEventListener(event, this.events[event]);
		delete this.events[event];
		return;
	}
	
	async prepareUiButton() { // Делаем все кнопки, которые есть на игровом экране
		const clickPause = function() {
			//controller.dispatch('click');
			this.pause();
		}.bind(this);
		
		const button = await HTMLPicture.create('pauseButton', 128, 80);
		button.addEventListener('clicked', clickPause);
		uiManager.addButton(button, 'clicked', 'special-noanimation-hover-sound(c-button)');
		await managerGame.prepareUiButton();
		return;
	}
	
	async prepareGameLayout() { // Подготовка игровой сцены перед загрузкой игры
		try {
			if (this.loadName !== '') {
				await managerGame.load(this.loadName);
			}
			await this.prepareUiButton();
			managerGame.working = true;
			managerGame.mode = 'game';
			this.dispatch('endLoadingScreen');
			logger.add({type: 'info', text: 'end loading gamelayout'});
			logger.add({type: 'info', text: `loading time: ${Date.now()-this.devs.loadingStartTime}ms`});
			this.devs.loadingStartTime = 0;
			await managerGame.run();		
		} catch(e) {
			errorManager.handle(e);
		}

		return;
	}
	
	// Запуск игрового layout
	async startGameLayout() {
		audioManager.stopAll();
		this.functions = {};
		for (const key in this.events) {
			if (key !== 'startGameLayout') {
				this.deleteEvent(key);								
			}
		} 
		this.isPaused = false;
		await this.showLoadingScreen();
		this.devs.loadingStartTime = Date.now();
		logger.add({type: 'info', text: 'start loading gamelayout'});
		this.runtime.goToLayout('gameLayout');
		return;
	}
	
	// Экран загрузки
	async showLoadingScreen() {
		const loadingScreen = this.runtime.objects.loading.getFirstInstance();
		[loadingScreen.width, loadingScreen.height] = [1920, 1080];
		await loadingScreen.setContentClass('add', ['loading'], '');
		[loadingScreen.x, loadingScreen.y] = [960, 540];
		
		const end = async function() {
			this.deleteEvent('endLoadingScreen');
			await loadingScreen.setContentClass('remove', ['loading'], '');
			[loadingScreen.x, loadingScreen.y] = [-960, -540];
		}.bind(this);
		
		this.addEvent('endLoadingScreen', end);
	}
		
	// Создание и функционал меню выбора главы
	async chooseChapter() { 
		this.isPaused = true;
		const menu = await HTMLPicture.create('settingsMenu', 960, 540);
		// Создаем стрелку возврата
		const arrowBack = await HTMLPicture.create('return', 580, 200);
		uiManager.addButton(arrowBack, 'closeChapters', 'special-noanimation-hover-sound(c-button)');
			
		const chaptersList = {};
		
		const closeChapters = function() {
			this.deleteEvent('closeChapters');
			menu.destroy();
			arrowBack.destroy();
			for (const key in chaptersList) {
				chaptersList[key].destroy();				
			}
		}.bind(this);
		
		arrowBack.addEventListener('closeChapters', ()=> {
			this.isPaused = false;
			closeChapters();
		});
		
		this.addEvent('closeChapters', closeChapters);
		
		const keys = await this.runtime.storage.keys();
		logger.add({type: 'info', text: `All saves: ${keys.join(', ')}`});
		for (let i = 0; i < keys.length; i++) {
			if (keys[i].includes('chapter')) {
				const index = +(keys[i].replace('chapter', ''));
				const button = await GameText.create('chapterText', [960, 336.5+62*(index-2)], `<p class="text chapter">Глава ${chapters[keys[i]].info.volume}. ${chapters[keys[i]].info.title}</p>`);
				button.addEventListener('clickButton', async ()=> {
					if (await this.createDialog('choiceLoadChapter')) {
						this.startLoadGame(keys[i])
					}
				});
				chaptersList[keys[i]] = button;
				uiManager.addButton(button, 'clickButton', 'special-noanimation-sound(c-button)');
			}
		}
		return;
	}
	
	// Запуск игры при загрузке
	startLoadGame(name = '') {
		this.loadName = name;
		if (name.includes('chapter')) {
			logger.add({type: 'info', text: `Start Loading ${name}`});
			this.deleteNextLoads(name);
		}
		this.startGameLayout();
		return;	
	}
	
	async deleteNextLoads(chapter) {
		const N = Number(chapter.replace('chapter', '')); // Номер главы, который загружаем, после него все надо удалить
		const keys = await this.runtime.storage.keys();
		for (let i = 0; i < keys.length; i++) {
			if (keys[i].includes('chapter')) {
				if (Number(keys[i].replace('chapter', '')) > N) {
					await this.runtime.storage.removeItem(keys[i]);
					logger.add({type: 'info', text: `Delete load ${keys[i]}`});
				}
			}
		}
		logger.add({type: 'info', text: `End Loading ${chapter}`});
	}
	
	savingFile = '';
	
	// Сохранение файлов
	async saveFiles(name, data, type, callback, errCallback) {
		if (main.type === 'pc') {
			if (this.savingFile !== '') { // Операция идет, надо ждать
				return; 
			}
			this.savingFile = data;

			const opts = {
				suggestedName: name,
				types: this.saveTypes[type],
			};

			// В случае успешного сохранения
			const successSave = async function(handle) {
				logger.add({type: 'info', text: `FilePicker for save ${type} file opened successfully`})
				logger.add({type: 'info', text: `${type} file saved successfully`});
				this.savingFile = '';
				try {
					callback(); 		
				} catch(e) {
					logger.add({type: 'info', text: 'An exception occurred while calling callback after saved file'});
					errorManager.handle(e)
				}
			}.bind(this);

			// В случае неуспешного сохранения
			const failSave = function() {
				logger.add({type: 'info', text: `FilePicker for save ${type} file failed to open`});
				//errorManager.handle(new Error('FileSystem Error: failed to save file'));
				this.savingFile = '';
				errCallback();
			}.bind(this);

			this.addEvent('successSave', successSave);
			this.addEvent('failSave', failSave);

			this.runtime.callFunction('saveFile', opts.suggestedName, ...opts.types);
		} else if (main.type === 'mobile') {
			// Вроде такое работает
			const text = logger.logs;
			const code = `
				const link = document.createElement('a');
				link.download = 'logs.txt';
				const blob = new Blob([\`${text}\`], {type: 	'text/plain'})
				link.href = URL.createObjectURL(blob);
	
				link.click();
	
				URL.revokeObjectURL(link.href);
			`
			globalThis.mainScript(this.runtime, code);
		}
		return;		
	}
	
	async startGame() {
		if (this.state === 'error') return; // Если произошла ошибка, не запускать игру
		if (this.state === 'alreadyRun') return await this.startMenu(); // Вышли в главное меню из игры
		const endLogo = async function() {
			this.deleteEvent('logoend');
			this.state = 'alreadyRun';
			const loads = await this.runtime.storage.getItem('mainSettings');
			if (loads !== null) {
				loadMain(loads);
			}
			
			const disclaimer = this.runtime.objects.disclaimer.createInstance('ui', 960, 540);
			disclaimer.opacity = 0;
			
			const gotoMenu = async function() {
				disclaimer.destroy();
				if (main.env !== 'development') {
					await this.startMenu();
				} else {
					const readNotice = async function() {
						managerGame.devs.ready = true;
						await this.startMenu();
					}.bind(this);
					
					this.addEvent('readNotice', readNotice);
					
					await this.createDialog('tester')
				}
			}.bind(this);
			
			const step = function() {
				disclaimer.opacity += 0.02;
				if (disclaimer.opacity !== 1) {
					globalThis.nextTick(()=> step());
				} else {
					controller.wait('click', `show-disclaimer`, gotoMenu, 16);
				}
				return;
			}
			
			step();
		}.bind(this);
		
		this.addEvent('logoend', endLogo);
		
		videoManager.play('logo', 'ui', [960, 540], false, {manager: 'settingsManager', event: 'logoend'});
		return;
	}
	
	async startMenu() {
		videoManager.play('menu', 'preUi', [960, 540], true);
		audioManager.play('int', 1, true);
		const change = [];
		await this.runtime.storage.getItem('autosave')
			.then((result)=> {
				if (result !== null) {
					this.menu.type = 'continue';
				} else {
					this.menu.type = 'new'
				}
			})
		for (let i = 0; i < this.menu[this.menu.type].buttons.length; i++) {
			const button = await HTMLPicture.create('menuB', ...this.menu[this.menu.type].buttons[i].pos);
			const text = await GameText.create('menuButtonText', this.menu[this.menu.type].buttons[i].pos, `<p class="text light">${this.menu[this.menu.type].buttons[i].text}</p>`);
			button.addEventListener('clickButton', this.menu[this.menu.type].buttons[i].do.bind(this));
			uiManager.addButton(button, 'clickButton', 'noanimation-hover-sound(c-button)');
			change.push(button, text);
		}
				
		for (let i = 0; i < this.menu.usual.buttons.length; i++) {
			const button = await HTMLPicture.create(this.menu.usual.buttons[i].name, ...this.menu.usual.buttons[i].pos);
			button.addEventListener('clickButton',this.menu.usual.buttons[i].do.bind(this));
			uiManager.addButton(button, 'clickButton', 'special-noanimation-hover-sound(c-button)');
		}
		return;
	}
	
	pauseCursor = '';
	
	// Взаимодействие с кнопкой паузы, включение/выключение
	pause() {
		if (this.runtime.timeScale === 0) {
			audioManager.pauseAll(false);
			this.isPaused = false;
			this.menu.pause.closePause.call(this);
			this.runtime.timeScale = 1;
			if (this.pauseCursor !== '') {
				controller.setCursor(this.pauseCursor);
				this.pauseCursor = '';
			}
			globalThis.nextTick(()=> managerGame.working = true);				
		} else {
			if (managerGame.isInventory) {
				managerGame.interactInventory();
			}
			audioManager.pauseAll(true);
			this.isPaused = true;
			this.menu.pause.openPause.call(this);
			this.runtime.timeScale = 0;
			if (controller.prevCursor !== 'true') {
				this.pauseCursor = controller.prevCursor;
				controller.setCursor('true');
			}
			managerGame.working = false;
		}
		return;
	}
}