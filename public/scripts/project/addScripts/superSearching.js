import { managerGame, uiManager, controller, audioManager, settingsManager, options } from '../main.js'; 
import { HTMLPicture, SpriteObject } from '../classes.js';
import transformate from '../transformator.js';

// Функция запуска мини-игры с взломом замка
export function mainDoor() {
	managerGame.waiting = true; // Ждем выполнения миссии
	controller.setCursor('lock');
	door.start(managerGame.runtime);
}

// Объект - мини-игра взлом замка в комнату Малинина
const door = {
	// Запуск мини-игры, генерация картинок и тд
	start(runtime) {
		this.field = runtime.objects.malininField.createInstance('ui', 960, 540);
		this.lockMain = runtime.objects.lockMain.createInstance('ui', 960, 540);
		for (const key in this.locks) {
			audioManager.play('r-lock', 1, true);
			audioManager.pause('r-lock', true, true);
			this.locks[key].inst = runtime.objects[key].createInstance('ui', 960, 540);
			// Определим знак
			const P = Math.random() >= 0.5 ? 1 : -1;
			// Получим случайный угол
			this.locks[key].inst.angle = (180 + P*Math.ceil(Math.random()*120))*Math.PI/180;
			this.locks[key].inst.addEventListener('clicked',  () => {
				this.locks[key].active = true;
				audioManager.play('t-lock');
				audioManager.pause('r-lock', false, true);
			});
			this.locks[key].inst.addEventListener('uped', ()=> {
				this.locks[key].active = false;
				audioManager.pause('r-lock', true, true)
			}); 
			uiManager.addClicker(this.locks[key].inst, this.areas[key]);
		}
		this.tick();
	},
	// Проверка, решена ли загадка со взломом
	check() {
		for (const name in this.locks) {
			const angle = this.locks[name].inst.angle*180/Math.PI;
			if (angle > 5 && angle < 355) {
				return false;
			}
		}
		return true;
	},
	// Тиковая функция
	tick() {
		if (managerGame.working && !settingsManager.isPaused) { // Нужно ли, ведь паузу не нажмем же без отщелкивания кнопки?
			if (this.check()) {
				return this.end();
			}
			for (const name in this.locks) {
				if (this.locks[name].active) {
					this.methods[name].call(this);
					break;
				}
			}			
		}
		if (managerGame.mode === 'game') {
			globalThis.nextTick(()=> this.tick());			
		}
	},
	// Завершили выполнение взлома
	end() {
		this.field.destroy();
		this.lockMain.destroy();
		this.field = null;
		this.lockMain = null;
		for (const name in this.locks) {
			this.locks[name].inst.destroy();
			this.locks[name].inst = null;
			this.locks[name].active = false;
		}
		controller.setCursor('true');
		audioManager.stop('r-lock');
		audioManager.play('o-lock');
		managerGame.waiting = false;
		managerGame.run();
	},
	methods: {
		lock1() {
			this.locks.lock1.inst.angle += Math.PI/180;
			this.locks.lock2.inst.angle += Math.PI/180;
		},
		lock2() {
			this.locks.lock2.inst.angle += Math.PI/180;	
		},
		lock3() {
			this.locks.lock3.inst.angle += Math.PI/180;
			this.locks.lock1.inst.angle -= Math.PI/180;
		},
		lock4() {
			this.locks.lock1.inst.angle += Math.PI/180;
			this.locks.lock2.inst.angle -= Math.PI/180;
			this.locks.lock3.inst.angle -= Math.PI/180;	
			this.locks.lock4.inst.angle += Math.PI/180;
		}
	},
	field: null,
	lockMain: null,
	// Щитки
	locks: {
		lock4: {
			inst: null,
			active: false,
		},
		lock3: {
			inst: null,
			active: false,
		},
		lock2: {
			inst: null,
			active: false,
		},
		lock1: {
			inst: null,
			active: false,
		},
	},
	// Зоны для касания
	areas: {
		lock4: {
			type: 'subtraction',
			objects: [
				{
					type: 'circle',
					centr: [960, 540],
					radius: 273
				},
				{
					type: 'circle',
					centr: [960, 540],
					radius: 241				
				}
			]
		},
		lock3: {
			type: 'subtraction',
			objects: [
				{
					type: 'circle',
					centr: [960, 540],
					radius: 238
				},
				{
					type: 'circle',
					centr: [960, 540],
					radius: 206				
				}
			]
		},
		lock2: {
			type: 'subtraction',
			objects: [
				{
					type: 'circle',
					centr: [960, 540],
					radius: 204
				},
				{
					type: 'circle',
					centr: [960, 540],
					radius: 172				
				}
			]
		},
		lock1: {
			type: 'subtraction',
			objects: [
				{
					type: 'circle',
					centr: [960, 540],
					radius: 170
				},
				{
					type: 'circle',
					centr: [960, 540],
					radius: 138				
				}
			]
		},
	}

};

// Функция запуска мини-игры с обыском
export function mainSearch() {
	managerGame.waiting = true; // Ждем выполнения миссии
	managerGame.allowSaving = false; // Не позволим сохраняться, чтобы не было ошибок
	controller.setCursor('nonactive');
	search.start(managerGame.runtime);
}

const search = {
	runtime: null,
	key: false, // Ключ для сундука Малинина
	report: '',
	async start(runtime) {
		this.ending = 6;
		this.functions = false;
		this.key = false;
		this.report = '';
		this.runtime = runtime;		
		audioManager.play('l-candle', 0.7);
		managerGame.shadowBackground('candleOn');
		this.light = managerGame.shadowBackground('return');
		
		const clicked = function(zoneName) {
			if (!managerGame.waiting || this.functions) return;
			this.zones[zoneName].clicked(this);
		}.bind(this);
		
		// Изменения курсора
		const changeCursor = function(name) {
			if (managerGame.waiting && !this.functions) {
				controller.setCursor(name)
			}
		}.bind(this);
		
		// Создаем зоны
		for (const zoneName in this.zones) {
			this.zones[zoneName].inst = runtime.objects.zone.createInstance('ui', ...this.zones[zoneName].pos);
			[this.zones[zoneName].inst.width, this.zones[zoneName].inst.height] = this.zones[zoneName].size;
			this.zones[zoneName].inst.addEventListener('hoverTrue', ()=> changeCursor('active'));
			this.zones[zoneName].inst.addEventListener('hoverFalse', ()=> changeCursor('nonactive'));
			this.zones[zoneName].inst.addEventListener('clicked', ()=> clicked(zoneName));
			uiManager.addButton(this.zones[zoneName].inst, 'clicked', 'noanimation-hover');
		}
		this.tick();
	},
	ending: 6,
	zones: {
		table: {
			size: [430, 160],
			pos: [220, 510],
			inst: null,
			clicked(self) {
				const end = function() {
					managerGame.deleteEvent('search', 'end');
					managerGame.shadowBackground('candleOn');
					controller.setCursor('nonactive');
					--self.ending;
				}
				managerGame.addEvent('search', 'end', end);
				this.inst.destroy();
				this.inst = null;
				managerGame.shadowBackground('candleOff');
				controller.setCursor('true');
				let script;
				if (self.report === '') {
					self.report = 'first';
					script = transformate(this.texts.first);
				} else {
					script = transformate(this.texts.second);
				}
				options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				managerGame.waiting = false;
			},
			texts: {
				first: 
`audio-play let 0.7
svg-on repF 960 540

svg-off repF
on zh left1
say zh '«Похоже, это бухгалтерия. Поразительно, но выглядит прилично. Не знал, я, конечно, что Господин Ядов в доле. Однако это и не удивляет.»'

off zh
wait true
dispatch search end`,
				second: 
`audio-play let 0.7
svg-on repF 960 540

svg-off repF
on zh left1
say zh '«Я даже несколько разочарован... Тоже просто бухгалтерия... Хотя... это же за тот же месяц! Только вот циферки-то совсем не те... Интересно, знает ли Господин Ядов, что от него дружок утаивает?»'

off zh
wait true
dispatch search end`
			},
		},
		pot: {
			size: [180, 180],
			pos: [575, 600],
			inst: null,
			clicked(self) {
				self.functions = true;
				
				const field = self.runtime.objects.clueMalinin1.createInstance('preUi', 960, 540);
				const key = self.runtime.objects.malKey.createInstance('preUi', 960, 470);
				
				const clickKey = function() {
					audioManager.play('t-thing');
					self.key = true;
					key.destroy();
					
					const end = function() {
						managerGame.deleteEvent('search', 'end');
						field.destroy();
						managerGame.shadowBackground('candleOn');
						controller.setCursor('nonactive');
						--self.ending;
					}
					
					managerGame.addEvent('search', 'end', end);
					const script = transformate(this.text);
					options.temps.push({
						type: 'temp',
						line: 0,
						script: script,
					});
					self.functions = false;
					managerGame.waiting = false;
				}.bind(this);
				
				this.inst.destroy();
				this.inst = null;
				managerGame.shadowBackground('candleOff');
				controller.setCursor('true');
				
				key.addEventListener('clicked', clickKey);
				uiManager.addButton(key, 'clicked', 'noanimation');
			},
			text: 
`say zh "«Я, копаться в земле люблю только в тех случаях, когда из нее что-нибудь растет. Ну, или хотя бы торчит и поблескивает. Придется сей урожай изъять»"

wait true
dispatch search end`
		},
		shelf: {
			size: [360, 180],
			pos: [950, 310],
			inst: null,
			clicked(self) {
				const end = function() {
					managerGame.deleteEvent('search', 'end');
					managerGame.shadowBackground('candleOn');
					controller.setCursor('nonactive');
					--self.ending;
				}
				managerGame.addEvent('search', 'end', end);
				this.inst.destroy();
				this.inst = null;
				managerGame.shadowBackground('candleOff');
				controller.setCursor('true');
				const script = transformate(this.text);
				options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				managerGame.waiting = false;
			},
			text: 
`i-on cMal2 960 540

say zh '«Похоже эта витрина используется для хранения револьвера. И сейчас его тут нет...»'

i-off cMal2
wait true
dispatch search end`
		},
		carpet: {
			size: [500, 200],
			pos: [1290, 950],
			inst: null,
			clicked(self) {
				const end = function() {
					managerGame.deleteEvent('search', 'end');
					managerGame.shadowBackground('candleOn');
					controller.setCursor('nonactive');
					--self.ending;
				}
				managerGame.addEvent('search', 'end', end);
				this.inst.destroy();
				this.inst = null;
				managerGame.shadowBackground('candleOff');
				controller.setCursor('true');
				const script = transformate(this.text);
				options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				managerGame.waiting = false;
			},
			text:
`audio-play i-carpet
audio-play b-wood
i-on cMal4 960 540

say zh "«А ларчик просто открывался! Вернее, коврик... тут у нас какой-то архивчик. Фотографии, записки... похоже, Малина был отменным шантажистом!»"

say zh "«А это... э... мое имя что ли? Не уверен, что хочу знать, что там, но это, конечно, вопиющая дерзость!»"

audio-play i-carpet
i-off cMal4
wait true
dispatch search end`
		},
		closet: { 
			size: [240, 340],
			pos: [1640, 250],
			inst: null,
			box: null,
			check() {
				const e = new C3.Event('active', true);
				this.box.dispatchEvent(e);
				return;
			},
			clicked(self) {
				self.functions = true;
				
				const field = self.runtime.objects.clueMalinin3.createInstance('screen', 960, 540);
				
				this.box = self.runtime.objects.malShelf5.createInstance('screen', 1030, 680);
				
				for (const name in this.ms) {
					this.ms[name].inst = self.runtime.objects[name].createInstance('screen', ...this.ms[name].pos);
					this.ms[name].inst.zElevation = this.ms[name].z;
					this.ms[name].inst.behaviors.DragDrop.isEnabled = false;
					
					// Отпустили
					this.ms[name].inst.behaviors.DragDrop.addEventListener('drop', ()=> {
						if (this.ms[name].inst.x >= 1610 || this.ms[name].inst.x <= 310 || this.ms[name].inst.y <= 140 || this.ms[name].inst.y >= 940) { // Удалили предмет 
							audioManager.play('m-tex');
							this.ms[name].end(this);
						} else {
							[this.ms[name].inst.x, this.ms[name].inst.y] = this.ms[name].pos;
						}
					});
 				}
				
				const start = function() {
					managerGame.deleteEvent('search', 'end');
					for (const name in this.ms) {
						this.ms[name].inst.behaviors.DragDrop.isEnabled = this.ms[name].enabled;
					}
				}.bind(this);
				
				managerGame.addEvent('search', 'end', start);
				const script = transformate(this.texts.start);
					options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				managerGame.waiting = false;
				
				const boxClicked = function() {
					this.box.removeEventListener('clicked', boxClicked);
					
					const end = function() {
						managerGame.deleteEvent('search', 'end');
						managerGame.shadowBackground('candleOn');
						controller.setCursor('nonactive');
						--self.ending;
						field.destroy();
						if (this.box !== null) {
							this.box.destroy();
							this.box = null;								
						}
					}.bind(this);
						
					managerGame.addEvent('search', 'end', end);
					const script = transformate(this.texts.end);
						options.temps.push({
						type: 'temp',
						line: 0,
						script: script,
					});
					self.functions = false;
					managerGame.waiting = false;
				}.bind(this);
				
				this.box.addEventListener('clicked', boxClicked);
					
				const activeBox = function() {
					this.box.removeEventListener('active', activeBox);
					uiManager.addButton(this.box, 'clicked', 'noanimation');
				}.bind(this);
				
				this.box.addEventListener('active', activeBox);
				
				this.inst.destroy();
				this.inst = null;
				managerGame.shadowBackground('candleOff');
				controller.setCursor('true');
			},
			ms: {
				malShelf1: {
					pos: [785, 690],
					z:5,
					inst: null,
					enabled: true,
					end(self) {
						this.inst.destroy();
						this.inst = null;
						self.ms.malShelf2.inst.behaviors.DragDrop.isEnabled = true;
						--self.things;
					}
				},
				malShelf2: {
					pos: [760, 760],
					z:4,
					inst: null,
					enabled: false,
					end(self) {
						this.inst.destroy();
						this.inst = null;
						--self.things;
						self.ms.malShelf3.inst.behaviors.DragDrop.isEnabled = true;
					}
				},
				malShelf3: {
					pos: [1050, 600],
					z:3,
					inst: null,
					enabled: false,
					end(self) {
						this.inst.destroy();
						this.inst = null;
						self.ms.malShelf4.inst.behaviors.DragDrop.isEnabled = true;
						--self.things;
					}
				},
				malShelf4: {
					pos: [1060, 680],
					z:2,
					inst: null,
					enabled: false,
					end(self) {
						this.inst.destroy();
						this.inst = null;
						--self.things;
						self.check();
					}
				},
			},
			texts: {
				start: 
`say zh "«Нехорошо чужие вещички трогать, но я б, конечно, посмотрел бы, что за ними прячется...»"

wait true
dispatch search end`,
				end: 
`audio-play let 0.7
svg-on letMal 960 540

svg-off letMal
say zh '«А вот и кое-какие криминальные подробности! Думаю, почти как доказательство пойдет, хоть и слабенькое...»'

wait true
dispatch search end`				
			} 		
		},
		chest: {
			size: [160, 140],
			pos: [1440, 680],
			inst: null,
			maps: {
				hor: ['front', 'right', 'back', 'left'],
				ver: ['front', 'top', 'back', 'bottom'],
			},
			async clicked(self) {
				// Пауза в поиске зон
				self.functions = true;
				// Сундук
				this.objects.chest = self.runtime.objects.chest.createInstance('preUi', 960, 540);
				
				const end = function() {
					managerGame.deleteEvent('search', 'end');
					this.start(self);
				}.bind(this);
				
				managerGame.addEvent('search', 'end', end);
				managerGame.shadowBackground('candleOff');
				controller.setCursor('true');
				
				const script = transformate(this.texts.start);
				options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				managerGame.waiting = false;
			},
			async start(self) {	
				this.objects.exitButton = await HTMLPicture.create('svgReturn', 129, 980);

				this.objects.exitButton.addEventListener('clicked', ()=> globalThis.nextTick(()=> this.end(self)));
				this.objects.exitButton.addEventListener('hoverTrue', ()=> controller.setCursor('true'));
				this.objects.exitButton.addEventListener('hoverFalse', ()=> controller.setCursor('nonactive'));
				uiManager.addButton(this.objects.exitButton, 'clicked', 'noanimation-hover-sound(c-button)');
				
				controller.setCursor('nonactive');
				// Управление перемещением сундука
				const route = function(dir, dif) {
					if (dir === 'hor' && (this.objects.chest.animationName === 'top' || this.objects.chest.animationName === 'bottom')) {
						if (dif > 0) {
							this.objects.chest.setAnimation('right');
						} else {
							this.objects.chest.setAnimation('left');
						}
					} else if (dir === 'ver' && (this.objects.chest.animationName === 'right' || this.objects.chest.animationName === 'left')) {
						if (dif > 0) {
							this.objects.chest.setAnimation('top');
						} else {
							this.objects.chest.setAnimation('bottom');
						}
					} else {
						const index = this.maps[dir].indexOf(this.objects.chest.animationName) + dif;
						if (index < 0) {
							this.objects.chest.setAnimation(this.maps[dir][3]);
						} else if (index > 3) {
							this.objects.chest.setAnimation(this.maps[dir][0]);
						} else {
							this.objects.chest.setAnimation(this.maps[dir][index]);
						}
						return;
					}
				}.bind(this);
				
				// Создание стрелок
				for (const arrow in this.objects.arrows) {
					this.objects.arrows[arrow].inst = self.runtime.objects.rotateArrow.createInstance('preUi', ...this.objects.arrows[arrow].pos);
					this.objects.arrows[arrow].inst.angle = this.objects.arrows[arrow].angle * Math.PI;
					this.objects.arrows[arrow].inst.addEventListener('clicked', ()=> route(...this.objects.arrows[arrow].args));
					this.objects.arrows[arrow].inst.addEventListener('hoverTrue', ()=> controller.setCursor('true'));
					this.objects.arrows[arrow].inst.addEventListener('hoverFalse', ()=> controller.setCursor('nonactive'));
					
					uiManager.addButton(this.objects.arrows[arrow].inst, 'clicked', 'usual-hover-sound(c-button)');
				}
				
				// Создание зон
				for (const zone in this.objects.zones) {
					this.objects.zones[zone].inst = self.runtime.objects.zone.createInstance('preUi', ...this.objects.zones[zone].pos);
					this.objects.zones[zone].inst.setSize(...this.objects.zones[zone].size);
					
					this.objects.zones[zone].inst.addEventListener('clicked', ()=> this.objects.zones[zone].clicked(self, this))
					this.objects.zones[zone].inst.addEventListener('hoverTrue', ()=> {
						if (managerGame.waiting && this.objects.chest.animationName === this.objects.zones[zone].animation) {
							controller.setCursor('active');
						}		
					});
					this.objects.zones[zone].inst.addEventListener('hoverFalse', ()=> {
						if (managerGame.waiting && this.objects.chest.animationName === this.objects.zones[zone].animation) {
							controller.setCursor('nonactive');
						}
					});
					uiManager.addButton(this.objects.zones[zone].inst, 'clicked', 'noanimation-hover');
				}
				return;				
			},
			objects: {
				chest: null,
				exitButton: null,
				arrows: {
					ra: {
						inst: null,
						pos: [1810, 540],
						angle: 0,
						args: ['hor', 1]
					},
					ba: {
						inst: null,
						pos: [960, 970],
						angle: 0.5,
						args: ['ver', -1]
					},
					la: {
						inst: null,
						pos: [110, 540],
						angle: 1,
						args: ['hor', -1]
					},
					ta: {
						inst: null,
						pos: [960, 110],
						angle: 1.5,
						args: ['ver', 1]
					},
				},
				zones: {
					fakeLock: {
						inst: null,
						pos: [960, 460],
						size: [150, 150],
						animation: 'front',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«Кажется, что это замок, открывающий и закрывающий этот сундук. Но самого замка тут и нет, это муляж!»"

wait true
dispatch search end`
					},
					quote: {
						inst: null,
						pos: [965, 590],
						size: [460, 150],
						animation: 'back',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«Какая-то слишком умная цитата для Малинина. Что же она может значить?»"

wait true
dispatch search end`
					},
					lock: {
						inst: null,
						pos: [1240, 400],
						size: [100, 100],
						animation: 'bottom',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							if (self.key) {
								parent.open(self);
							} else {
								parent.speak(this.text);
							}
						},
						text:
`say zh "«По форме очень похоже на отверствие для ключа, странно, был бы еще ключ на проверку... Или хотя бы отмычка...»"

wait true
dispatch search end`
					},
					screw2: {
						inst: null,
						pos: [680, 740],
						size: [100, 100],
						animation: 'bottom',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«Какое, однако, интересное отверствие для болта. Видна рука мастера.»"

wait true
dispatch search end`
					},
					screw3: {
						inst: null,
						pos: [1240, 740],
						size: [100, 100],
						animation: 'bottom',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«Интересно, болт такой же формы, как и отверствие под него?»"

wait true
dispatch search end`
					},
					screw1: {
						inst: null,
						pos: [680, 400],
						size: [100, 100],
						animation: 'bottom',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«Интересная выемка для болта, надо же как придумали!»"

wait true
dispatch search end`
					},
					top: {
						inst: null,
						pos: [970, 570],
						size: [360, 240],
						animation: 'top',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«На крышке сундука нет ничего примечательного. Совсем ничего.»"

wait true
dispatch search end`
					},
					bottom: {
						inst: null,
						pos: [970, 570],
						size: [360, 240],
						animation: 'bottom',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«Кажется, что дно этого сундука хранит какие-то секреты! Вот только разобраться бы какие.»"

wait true
dispatch search end`
					},
					left: {
						inst: null,
						pos: [940, 550],
						size: [340, 320],
						animation: 'left',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
						text:
`say zh "«При беглом осмотре на левой стенке сундука ничего интересного не было замечено.»"

wait true
dispatch search end`
					},
					right: {
						inst: null,
						pos: [940, 550],
						size: [340, 320],
						animation: 'right',
						clicked(self, parent) {
							if (parent.objects.chest.animationName !== this.animation || !managerGame.waiting) {
								return;
							}
							parent.speak(this.text);
						},
					text:
`say zh "«Правая сторона шкатулки не таит в себе ничего примечательного.»"

wait true
dispatch search end`
					},
				}
			},
			speak(text) {
				const end = function() {
					managerGame.deleteEvent('search', 'end');
					this.changeVisible(true);
					controller.setCursor('nonactive');
				}.bind(this);
				
				managerGame.addEvent('search', 'end', end);
				controller.setCursor('true');
				this.changeVisible(false);
				const script = transformate(text);
				options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				managerGame.waiting = false;
			},
			changeVisible(bool) {
				// Меняем видимость кнопки выхода
				this.objects.exitButton.isVisible = bool;
				// Меняем видимость стрелок
				for (const arrow in this.objects.arrows) {
					this.objects.arrows[arrow].inst.isVisible = bool
				}
				return;
			},
			open(self) {
				this.end(self,false);
				const end = function() {
					managerGame.deleteEvent('search', 'end');
					managerGame.shadowBackground('candleOn');
					controller.setCursor('nonactive');
					--self.ending;
				}
				managerGame.addEvent('search', 'end', end);
				this.inst.destroy();
				this.inst = null;
				controller.setCursor('true');
				let script;
				if (self.report === '') {
					self.report = 'first';
					script = transformate(this.texts.openFirst);
				} else {
					script = transformate(this.texts.openSecond);
				}
				options.temps.push({
					type: 'temp',
					line: 0,
					script: script,
				});
				self.functions = false;
				managerGame.waiting = false;
			},
			end(self, full = true) {
				this.objects.chest.destroy();
				if (this.objects.exitButton !== null) {
					this.objects.exitButton.destroy();
				}
				
				for (const arrow in this.objects.arrows) {
					if (this.objects.arrows[arrow].inst !== null) {
						this.objects.arrows[arrow].inst.destroy();
					}
				}
				
				for (const zone in this.objects.zones) {
					if (this.objects.zones[zone].inst !== null) {
						this.objects.zones[zone].inst.destroy();
					}
				}
				if (full) {
					self.functions = false;
					managerGame.shadowBackground('candleOn');
					controller.setCursor('nonactive');					
				}
				return;
			},
			texts: {
				start: 
`say zh "«Сундучок-то не простой, в нем замочек золотой! Ох, как рифма сегодня идет хорошо! Попробуем-ка из него что-нибудь вытащить.»"

wait true
dispatch search end`,
				openSecond:
`audio-play o-chest
i-on o_chest 960 540

i-off o_chest
on zh left1
say zh smile "«Дело яйца выеденного не стоит. Даже фазана.»"

off zh
audio-play let 0.7
svg-on repT 960 540

svg-off repT
on zh left1
say zh suspicious '«Я даже несколько разочарован... Тоже просто бухгалтерия... Хотя... это же за тот же месяц! Только вот циферки-то совсем не те... Интересно, знает ли Господин Ядов, что от него дружок утаивает?»'

off zh
wait true
dispatch search end`,
				openFirst: 
`audio-play o-chest
i-on o_chest 960 540

i-off o_chest
on zh left1
say zh smile "«Дело яйца выеденного не стоит. Даже фазана.»"

off zh
audio-play let 0.7
svg-on repT 960 540

svg-off repT
on zh left1
say zh suspicious '«Очевидно, это какая-то бухгалтерия. Отчет о доходах и расходах за этот месяц велся, прямо скажем, совсем не аккуратно. Мне бы сей документ показать было стыдно. Да и пометки относительно Господина нашего "Ядовитого" какие-то странные.»'

off zh
wait true
dispatch search end`
			}
		}
	},
	functions: false,
	tick() {
		if (this.light.animationName === 'candle') {
			const position = controller.getPosition();
			this.light.x = position[0] < 0 ? 0 : position[0] > 1920 ? 1920 : position[0];
			this.light.y = position[1] < 0 ? 0 : position[1] > 1080 ? 1080 : position[1];
		}
		if (this.ending === 0) {
			this.end();
			return;
		}
		globalThis.nextTick(()=> this.tick());
	},
	end() {
		managerGame.waiting = false; // Продолжаем сценарий
		managerGame.allowSaving = true; // Позволяем сохранять
		controller.setCursor('true');
		managerGame.shadowBackground('candleOff');
		this.light = null;
		managerGame.run();
	},
	light: null,
};
