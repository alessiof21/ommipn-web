import { options, managerGame, uiManager } from '../main.js'; 
import { GameText } from '../classes.js';
import { chapters } from '../scripts.js';

export function main(n) {
	managerGame.waiting = true;
	const newCQ = `question${n}`
	if (data.currentQ === newCQ) {
		data[data.currentQ].motive.v = [];
		data[data.currentQ].opportunity.v = [];
	}
	data.currentQ = newCQ;
	data.start(managerGame.runtime);
	return;
}

const data = {
	start(runtime) {
		this.runtime = runtime;
		// Создаем фон
		this.inst.back = runtime.objects.backsForTest.createInstance('preUi', 960, 540);
		// Плашка Жилина
		this.inst.field = runtime.objects.zhilinTestField2.createInstance('preUi', 960, 252);
		// Все тексты
		(async() => {
			// Текст вопроса
			this.inst.text = await GameText.create('testText2', [this.inst.field.getImagePointX('text'), this.inst.field.getImagePointY('text')], `<p class="text light">Так-так...Какая информация поможет мне определить мотив и возможность?</p>`);
			// Шкала мотивов
			this.inst.motText = await GameText.create('clueTestText', [300, 600], `<p class="clue light">0/${this[this.currentQ].motive.length}</p>`);
			// Шкала возможностей
			this.inst.oppText = await GameText.create('clueTestText', [1620, 600], `<p class="clue light">0/${this[this.currentQ].opportunity.length}</p>`);	
		})();
		// Кнопка подтверждения
		this.inst.button = runtime.objects.testButton.createInstance('preUi', 1620, 350);
		this.inst.button.setAnimation('nonactive');
		this.inst.button.addEventListener('clicked', ()=> data.end());
		uiManager.addButton(this.inst.button, 'clicked', 'active');
		// Плашка обвиняемого
		this.inst.person = runtime.objects.testPerson.createInstance('preUi', 1140, 190);
		this.inst.person.setAnimation(this[this.currentQ].person);
		// Шкала мотива
		this.inst.mot = runtime.objects.scales.createInstance('preUi', 300, 600);
		this.inst.mot.setAnimation('motive');
		// Шкала возможности
		this.inst.opp = runtime.objects.scales.createInstance('preUi', 1620, 600);
		this.inst.opp.setAnimation('opportunity');
		for (const key in this[this.currentQ].answers) {
			const answer = runtime.objects[`${this.currentQ}Test2`].createInstance('preUi', ...this[this.currentQ].answers[key]);
			answer.setAnimation(key);
			// Задаем обработчик события начала drag
			answer.behaviors.DragDrop.addEventListener("dragstart", ()=> this.startDrag(answer));
			// Задаем обработчик события drop 
			answer.behaviors.DragDrop.addEventListener("drop", ()=> this.drop(answer));
		}
		return;
	},
	runtime: null,
	currentQ: '',
	question1: {
		person: 'mus',
		answers: {
			'motive1': [840, 600], 
			'motive2': [580, 600],
			'motive3': [810, 1000],
			'false4': [1150, 1000],
			'false5': [1160, 750],
			'false6': [830, 340],
			'false7': [800, 480],
			'false8': [860, 870],
			'false9': [770, 730],
			'opportunity10': [1170, 860],
		},
		motive: {
			v: [],
			length: 3
		},
		opportunity: {
			v: [],
			length: 1
		},
	},
	question2: {
		person: 'sap',
		answers: {
			'false1': [750, 520], 
			'false2': [660, 730],
			'motive3': [830, 850],
			'false4': [780, 970],
			'false5': [870, 640],
			'opportunity6': [1040, 750],
			'false7': [1110, 1000],
			'false8': [1200, 880],
			'false9': [1300, 710],
			'false10': [1360, 570],
		},
		motive: {
			v: [],
			length: 1
		},
		opportunity: {
			v: [],
			length: 1
		},	
	},
	question3: {
		person: 'tat',
		answers: {
			'false1': [1070, 640], 
			'false2': [1350, 550],
			'opportunity3': [940, 820],
			'false4': [1200, 990],
			'false5': [1180, 840],
			'false6': [700, 850],
			'false7': [680, 710],
			'false8': [810, 970],
			'motive9': [1300, 710],
			'motive10': [800, 480],
		},
		motive: {
			v: [],
			length: 2
		},
		opportunity: {
			v: [],
			length: 1
		},		
	},
	question4: {
		person: 'nat',
		answers: {
			'motive1': [780, 500], 
			'motive2': [1340, 560],
			'opportunity3': [600, 610],
			'opportunity4': [960, 980],
			'false5': [890, 630],
			'false6': [1185, 660],
			'false7': [690, 890],
			'false8': [735, 740],
			'false9': [1225, 940],
			'false10': [935, 840],
			'false11': [1210, 800]
		},
		motive: {
			v: [],
			length: 2
		},
		opportunity: {
			v: [],
			length: 2
		},	
	},
	question5: {
		person: 'zac',
		answers: {
			'motive1': [1140, 580], 
			'motive2': [800, 1000],
			'false3': [600, 680],
			'false4': [820, 480],
			'false5': [860, 610],
			'false6': [1220, 720],
			'false7': [880, 765],
			'opportunity8': [670, 880],
			'false9': [1370, 540],
			'false10': [1260, 970],
			'false11': [1040, 900]
		},
		motive: {
			v: [],
			length: 2
		},
		opportunity: {
			v: [],
			length: 1
		},	
	},
	question6: {
		person: 'sci',
		answers: {
			'opportunity1': [1140, 615], 
			'false2': [840, 445],
			'false3': [585, 580],
			'false4': [750, 950],
			'false5': [840, 635],
			'false6': [655, 740],
			'false7': [1395, 540],
			'false8': [1240, 760],
			'false9': [1190, 970],
			'motive10': [1020, 860],
			'motive11': [940, 760],
		},
		motive: {
			v: [],
			length: 2
		},
		opportunity: {
			v: [],
			length: 1
		},
	},
	question7: {
		person: 'hm',
		answers: {
			'opportunity1': [815, 500], 
			'opportunity2': [1360, 595],
			'false3': [1080, 630],
			'false4': [585, 620],
			'false5': [655, 770],
			'false6': [870, 700],
			'false7': [720, 1000],
			'false8': [770, 890],
			'motive9': [1190, 770],
			'motive10': [1045, 880],
			'false11': [1170, 1000],
			'false12': [850, 350]
		},
		motive: {
			v: [],
			length: 2
		},
		opportunity: {
			v: [],
			length: 2
		},	
	},
	startDrag(answer) {
		if (this.runtime.timeScale === 0) {
			answer.behaviors.DragDrop.drop();
			return;
		}
		answer.animationFrame = 1;
		this[this.currentQ].motive.v = this[this.currentQ].motive.v.filter(elem => elem !== answer.animationName);
		this[this.currentQ].opportunity.v = this[this.currentQ].opportunity.v.filter(elem => elem !== answer.animationName);
		this.refresh();
		return;
	},
	drop(answer) {
		if (this.runtime.timeScale === 0) {
			return;
		}
		answer.animationFrame = 0;
		if (answer.testOverlap(this.inst.mot)) {
			if (this[this.currentQ].motive.v.length === this[this.currentQ].motive.length) { // Ячейка уже переполнена, вернуть назад
				[answer.x, answer.y] = this[this.currentQ].answers[answer.animationName];
				return;
			}
			this[this.currentQ].motive.v.push(answer.animationName);
		} else if (answer.testOverlap(this.inst.opp)) {
			if (!this[this.currentQ].opportunity.v.includes(answer.animationName)) {
				if (this[this.currentQ].opportunity.v.length === this[this.currentQ].opportunity.length) { // Ячейка уже переполнена, вернуть назад
					[answer.x, answer.y] = this[this.currentQ].answers[answer.animationName];
					return;
				}
				this[this.currentQ].opportunity.v.push(answer.animationName);
			}	
		} 
		this.refresh();
		return;	
	},
	check() {
		if (this[this.currentQ].motive.v.length === this[this.currentQ].motive.length && this[this.currentQ].opportunity.v.length === this[this.currentQ].opportunity.length) {
			this.inst.button.setAnimation('active');
		} else {
			this.inst.button.setAnimation('nonactive');
		}
		return;
	},
	end() {
		let motive = this[this.currentQ].motive.length;
		for (let i = 0; i < this[this.currentQ].motive.v.length; i++) {
			if (this[this.currentQ].motive.v[i].startsWith('motive')) {
				--motive;
			}
		}
		let opportunity = this[this.currentQ].opportunity.length;
		for (let i = 0; i < this[this.currentQ].opportunity.v.length; i++) {
			if (this[this.currentQ].opportunity.v[i].startsWith('opportunity')) {
				--opportunity;
			}
		}
		if (motive === 0 && opportunity === 0) {
			chapters.chapter10.dependency.variables.answers[this.currentQ] = true;
			++chapters.chapter10.dependency.variables.result;			
		}
		for (const key in this.inst) {
			this.inst[key].destroy();
		}
		for (const answer of this.runtime.objects[`${this.currentQ}Test2`].getAllInstances()) {
			answer.destroy();
		}
		this[this.currentQ].motive.v = [];
		this[this.currentQ].opportunity.v = [];
		managerGame.waiting = false;
		managerGame.run();			
	},
	refresh() {
		// Обновляем тексты мотива и возможности
		this.inst.motText.setContent(`<p class="clue light">${this[this.currentQ].motive.v.length}/${this[this.currentQ].motive.length}</p>`);
		this.inst.oppText.setContent(`<p class="clue light">${this[this.currentQ].opportunity.v.length}/${this[this.currentQ].opportunity.length}</p>`);
		
		for (const answer of this.runtime.objects[`${this.currentQ}Test2`].getAllInstances()) {
			const scale = {
				type: null,
				index: null,
				point: null
			}
			if (this[this.currentQ].motive.v.includes(answer.animationName)) {
				scale.type = 'mot';
				scale.index = this[this.currentQ].motive.v.indexOf(answer.animationName) + 1;
				scale.point =  this[this.currentQ].motive.v.length === 1 ? 'mono' : this[this.currentQ].motive.v.length === 2 ? 'di' : 'tre';
			} else if (this[this.currentQ].opportunity.v.includes(answer.animationName)) {
				scale.type = 'opp';
				scale.index = this[this.currentQ].opportunity.v.indexOf(answer.animationName) + 1;				
				scale.point =  this[this.currentQ].opportunity.v.length === 1 ? 'mono' : this[this.currentQ].opportunity.v.length === 2 ? 'di' : 'tre';
			}
			if (scale.type !== null) {
				[answer.x, answer.y] = [this.inst[scale.type].getImagePointX(`${scale.point}${scale.index}`), this.inst[scale.type].getImagePointY(`${scale.point}${scale.index}`)];
			} else { // Бросили где попало
				[answer.x, answer.y] = this[this.currentQ].answers[answer.animationName]
			}
		}
		this.check();
	},
	inst: {
		back: null,
		button: null,
		field: null,
		text: null,
		person: null,
		mot: null,
		motText: null,
		opp: null,
		oppText: null,			
	}	
}