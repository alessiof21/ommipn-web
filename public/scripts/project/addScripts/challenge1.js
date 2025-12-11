import { options, managerGame, controller, uiManager } from '../main.js'
import { GameText } from '../classes.js';

class challengeMap extends Map {
	getIndex() {
		let k = 1;
		const list = [...this.values()];
		for (let i = 0; i < list.length; i++) {
			if (k === list[i]) {
				++k;
				i = 0;
			}
		}
		return k;
	}
}

export function main() {
	managerGame.waiting = true; // Заблокировали выполнение скрипта дальше
	data.question = 'question1';
	data.list.clear();
	data.start(managerGame.runtime);
	return;
}

const data = {
	start(runtime) {
		this.runtime = runtime;
		// Создаем фон
		this.inst.back = runtime.objects.backsForTest.createInstance('preUi', 960, 540);
		// Плашка Жилина
		this.inst.field = runtime.objects.zhilinTestField.createInstance('ui', 960, 252);
		// Плашка под текст с уликами
		this.inst.clueField = runtime.objects.clueTestField.createInstance('ui', 180, 600);
		// Текст вопроса и текст количества улик
		(async() => {
			this.inst.text = await GameText.create('testText', [this.inst.field.getImagePointX('text'), this.inst.field.getImagePointY('text')], `<p class="text light">${this[this.question].text}</p>`);
			this.inst.clueText = await GameText.create('clueTestText', [180, 600], `<p class="clue light">0/${this[this.question].chosen.length}</p>`);
		})();
		this.test();
	},
	runtime: null,
	test() {
		// Функция проверки
		const check = function() {
			if (this.list.size === 0) return;
			let result = true; // Результат проверки
			for (const elem of this.list) {
				if (this[this.question].chosen.order) { // Важен порядок
					if (+elem[0] !== elem[1]) {
						result = false;
						break;
					}
				} else { // Важно только имя анимации
					if (elem[0].includes('false')) {
						result = false;
						break;
					}
				}
			}
			if (result) {
				this.end(); // Правильный ответ
			} else {
				this.fail(); // Неправильный ответ
			}
			return;
		}.bind(this);
		
		// Функция взаимодействия 
		const interact = function(pic) {
			if (this.list.has(pic.animationName)) { // Уже есть
				this.list.delete(pic.animationName); // Удаляем значение
				if (!pic.animationName.includes('true') &&  !pic.animationName.includes('false')) {
					uiManager.deleteButton(pic);
					globalThis.nextTick(()=> {
						pic.animationFrame = 0;
						[pic.x, pic.y] = this[this.question].answers[pic.animationName];
						uiManager.addButton(pic, 'clicked', 'usual');
					})
				} else {
					pic.animationFrame = 0;
				}

			} else {
				const value = this.list.getIndex();
				/*if (pic.animationFrame === 1) { // Есть перемещение
					pic.animationFrame = 2;
					[pic.x, pic.y] = this[this.question].position[value-1];
					uiManager.deleteButton(pic);
					uiManager.addButton(pic, 'clicked', 'noanimation');
				} else if (pic.animationFrame === 0) { // Без перемещения
					pic.animationFrame = 1;
				}*/
				if (!pic.animationName.includes('true') &&  !pic.animationName.includes('false')) {
					uiManager.deleteButton(pic);
					globalThis.nextTick(()=> {
						pic.animationFrame = 2;
						[pic.x, pic.y] = this[this.question].position[value-1];
						uiManager.addButton(pic, 'clicked', 'noanimation');
						this.list.set(pic.animationName, value);
						if (this.list.size === this[this.question].chosen.length) {
							check();
						}
					});
				} else {
					pic.animationFrame = 1;
					this.list.set(pic.animationName, value);
					if (this.list.size === this[this.question].chosen.length) {
						check();
					}
				}
			}
			// Обновляем плашку с уликами
			this.inst.clueText.edit(`<p class="clue light">${this.list.size}/${this[this.question].chosen.length}</p>`);
			return;
		}.bind(this);
		
		// Добавляем дополнительные объекты
		if (this[this.question].additional) {
			for (const animationName in this[this.question].additional) {
				const pic = this.runtime.objects[`${this.question}Clue`].createInstance('ui', ...this[this.question].additional[animationName]);
				pic.setAnimation(animationName);
			}
		}
		
		for (const animationName in this[this.question].answers) {
			const pic = this.runtime.objects[`${this.question}Clue`].createInstance('ui', ...this[this.question].answers[animationName]);
			pic.setAnimation(animationName);
			pic.addEventListener('clicked', ()=> interact(pic));
			let type = '';
			if (!animationName.includes('true') && !animationName.includes('false')) {
				type = 'usual';
			} else {
				type = 'noanimation';
			}
			uiManager.addButton(pic, 'clicked', type);
		}
	},
	list: new challengeMap(),
	question: '',
	question1: {
		text: 'Снотворное в комнате четы Сапоговых точно было выпито. Об этом говорит...',
		chosen: {
			length: 1
		},
		answers: {
			'false1': [570, 840],
			'false2': [1000, 630],
			'false3': [1410, 910],
			'true4': [1650, 600]			
		},
		speech: [
			'Верное наблюдение. Тате не может подтвердить алиби Ричарда, так как отсутствовала в комнате. А эта случайная деталь как раз-таки говорит, что Ричард был весьма честен.'
		]
	},
	question2: {
		text: 'Тут появляется новый вопрос: мог ли Ричард выйти из комнаты, вернуться и выпить снотворное до прихода Тате? Я бы осмелился сказать, что нет! Это может подтвердить...',
		chosen: {
			length: 2
		},
		answers: {
			'true1': [1575, 600],
			'false2': [920, 600],
			'true3': [600, 840],
			'false4': [1260, 840]			
		},
		speech: [
			'Ну все же логично! Ученый никого не видел от ухода и до возвращения Тате, а далее госпожа Сапогова обнаружила Ричарда уже спящим. Выходит, какое-никакое алиби.'
		]
	},
	question3: {
		text: 'Беспокоит меня загадка пятна на ковре от руки. И чувствую, что к этому причастен не кто иной, как я лично. Какой порядок найденных фактов поможет мне что-то вспомнить?',
		chosen: {
			length: 4,
			order: true,
			hidden: true,
		},
		additional: {
			"scale": [440, 780],
		},
		answers: {
			'1': [1500, 610],
			'2': [1000, 630],
			'3': [1660, 910],
			'4': [1130, 900]
		},
		position: [
			[231.5, 702],
			[393.5, 880],
			[509.5, 667],
			[631.5, 898]
		],
		speech: [
			'Проанализировав все хорошенько, я пришел к выводу, что этой ночью произошло следующее: приняв некоторый отравленный напиток, я потерял кое-какую часть рассудка и, судя по всему, решил зачем-то обследовать кухню.',
			'Факты указывают на то, что испачканными в варенье пальцами я и написал на двери ту обличающую, прямо скажем, надпись. А зная себя, я еще и пиджак мог отнести в прачечную. Стоит, пожалуй, осмотреть подсобное помещение.'
		]
	},
	question4: {
		text: 'Ученый вроде хороший парень, но есть одна деталь, которая явно выделяется на фоне всех находок. Это...',
		chosen: {
			length: 1
		},
		answers: {
			'false1': [1040, 850],
			'false2': [1400, 600],
			'true3': [1600, 860],
			'false4': [600, 900],
			'false5': [770, 630]
		},
		speech: [
			'Наблюдательно. Думаю, что эта вещица появилась там неслучайно. Сама по себе-то она не то чтобы привлекательна в каком-либо роде.'
		]
	},
	question5: {
		text: 'Однако один из фактов заставил меня насторожиться...',
		chosen: {
			length: 1
		},
		answers: {
			'false1': [1270, 900],
			'false2': [950, 600],
			'true3': [1600, 630],
			'false4': [650, 850],
		},
		speech: [
			'Есть такое предположение, что влажный платочек как-то связан с, так сказать, внезапным излиянием чувств.'
		]
	},
	question6: {
		text: 'То, что все время меня смущало в этом деле, так это сам момент убийства. Ни один из проживающих не упомянул, что слышал выстрелы. Может ли какая-то из находок это объяснить?',
		chosen: {
			length: 1
		},
		answers: {
			'false1': [385, 880],
			'true2': [1580, 600],
			'false3': [920, 620],
			'false4': [1120, 900],			
		},
		speech: [
			'Недаром меня называют лучшим детективом Катамарановска. Конкретно это было не так сложно постановить, но в общем-то и не так важно.'
		]
	},
	question7: {
		text: 'Я старался изо всех силенок распознать личность загадочного Л.Вайза, но чистосердечно никто не признался. Могу ли я сделать громкое предположение? Л.Вайз — это вполне вероятно...',
		chosen: {
			length: 1
		},
		additional: {
			'clue': [1750, 250],
		},
		answers: {
			'false1': [490, 640],
			'false7': [780, 610],
			'false4': [1080, 590],
			'false10': [1390, 600],
			'false6': [1720, 600],
			'false9': [320, 910],
			'true2' : [620, 910],
			'false3': [880, 900],
			'false11': [1150, 900],
			'false8': [1420, 910],
			'false5': [1720, 890]
		},
		speech: [
			'Интересное предположение...'
		]
	},
	question8: {
		text: 'Какие два факта могут это подтвердить?',
		chosen: {
			length: 2
		},
		additional: {
			'clue1': [1750, 250],
			'clue2': [1690, 480],	
		},
		answers: {			
			'false1': [820, 880],
			'true2': [680, 600],
			'false3': [1550, 870],
			'true4': [1260, 600]			
		},
		speech: [
			'Каким же я был дураком! Теперь и сам вижу, что никакой это не «Л.Вайз», а самый настоящий «Л.Роза»! А рядом — символ того самого цветка. К тому же та бумага в комнате может стать вещественным доказательством. Так-то! Все! Попались, голубчики!'
		]
	},
	question9: {
		text: 'Задала мне, конечно, задачку Малинина младшая своей выходкой. Сдается, что делишки тут творятся темные. Попахивает сообщничком-любовничком этого побега. Наверняка что-то из улик может это подтвердить!',
		chosen: {
			length: 1
		},
		answers: {
			'true1': [1330, 890],
			'false2': [860, 650],
			'false3': [670, 900],
			'false4': [1550, 620],			
		},
		speech: [
			'Да, многое в обстановке указывало на некие отношения, но то, что леди подавала сигнал в окно, уже почти криминальная подробность.'
		]
	},
	question10: {
		text: 'Еще этот Захар... Почти маньяческая личность! Кажется, есть несколько вещей, намекающих на его сговор с тайным ухажером Натальи.',
		chosen: {
			length: 2
		},
		answers: {
			'false1': [1350, 580],
			'true2': [670, 620],
			'false3': [580, 890],
			'false4': [1680, 850],
			'true5': [1170, 900]			
		},
		speech: [
			'А вот и вполне очевидный мотив. Судя по всему, Захар-то наш должен был решить какую-то проблему с Господином Малининым. Не о конфликте ли между Натальей и ее отцом речь?'
		]
	},
	question11: {
		text: 'Осталась еще одна неясная деталь. Как минимум два человека утаили некоторые моменты своего прошлого. Это...',
		chosen: {
			length: 2
		},
		answers: {
			'true1': [500, 640],
			'false6': [810, 655],
			'true4': [1130, 630],
			'false9': [1460, 640],
			'false8': [1750, 640],
			'false2' : [320, 920],
			'false3': [1350, 920],
			'false10': [655, 905],
			'false7': [1040, 905],
			'false5': [1690, 910]
		},
		speech: [
			'Все так. Одна особа обманула с фотографией, другая же умолчала о благородном происхождении матери. Если мотив горничной мне пока неясен, то причину фокуса с фотографией отца начинаю смутно понимать.'
		]
	},
	question12: {
		text: 'Видимо, девушка опасалась, что я могу узнать этого человечка. И не зря опасалась, кстати. Я думаю, что это...',
		chosen: {
			length: 1
		},
		additional: {
			'clue': [1680, 420],
		},
		answers: {
			'false1': [770, 630],
			'false2': [1300, 600],
			'true5': [550, 890],
			'false3': [1030, 900],
			'false4': [1530, 900]			
		},
		speech: [
			'Неожиданная разгадка! Одно лицо же просто! Но брошь со змеёй, конечно, доказательство посущественней.'
		]
	},
	fail() {
		const phrases = ['Это... что-то как-то не так, будто бы...', 'Что-то у меня сегодня голова не так работает как-то...', 'Вроде да, но нет...', 'А если еще чуток подумать?', 'Нет, ну это же совсем не годится!'];
		
		// Делаем Жилина удивленным
		this.inst.field.setAnimation('surprised');
		// Делаем ответ Жилина неправильным
		this.inst.text.edit(`<p class="text light">${phrases[Math.floor(Math.random()*phrases.length)]}</p>`);
		for (const inst of this.runtime.objects[`${this.question}Clue`].getAllInstances()) {
			uiManager.deleteButton(inst);
		}
		
		const endFalse = function() {
			this.list.clear(); // Очистили выбор
			this.inst.field.setAnimation('normal');
			this.inst.text.edit(`<p class="text light">${this[this.question].text}</p>`);
			// Обновляем плашку с уликами
			this.inst.clueText.edit(`<p class="clue light">0/${this[this.question].chosen.length}</p>`);
			
			for (const inst of this.runtime.objects[`${this.question}Clue`].getAllInstances()) {
				let type = '';
				if (inst.animationName.includes('true') || inst.animationName.includes('false')) {
					type = 'noanimation';
				} else if (!Number.isNaN(+inst.animationName)) {
					type = 'usual';
				} else {
					continue;
				}
				if (inst.animationFrame === 2) {
					[inst.x, inst.y] = this[this.question].answers[inst.animationName];
				}
				inst.animationFrame = 0;
				uiManager.addButton(inst, 'clicked', type);
			}	
		}.bind(this);
		
		controller.wait('click', `false-${this.question}`, endFalse, 16);
		return;
	},
	end() {
		// Делаем Жилина улыбающимся
		this.inst.field.setAnimation('smile');
		// Делаем ответ Жилина правильным
		let k = 0;
		this.inst.text.edit(`<p class="text light">${this[this.question].speech[k]}</p>`);
		for (const inst of this.runtime.objects[`${this.question}Clue`].getAllInstances()) {
			if (inst.animationName.includes('false')) {
				inst.destroy();
			}	
		}
		
		const end = function() {
			++k;
			if (k >= this[this.question].speech.length) { // Закончили вопрос
				this.list.clear(); // Очистили выбор
				for (const inst of this.runtime.objects[`${this.question}Clue`].getAllInstances()) {
					inst.destroy();
				}
				const value = Number(this.question.replace('question', ''))+1;
				if (value > 12) { // Кончился тест
					this.endChallenge();
				} else {
					this.question = `question${value}`;
					console.log(this.question)
					// Делаем Жилина нормальным
					this.inst.field.setAnimation('normal');
					if (this[this.question].chosen.hidden) {
						this.inst.clueText.isVisible = false;
						this.inst.clueField.isVisible = false;
					} else {
						this.inst.clueText.isVisible = true;
						this.inst.clueField.isVisible = true;						
					}
					this.inst.text.edit(`<p class="text light">${this[this.question].text}</p>`);
					this.inst.clueText.edit(`<p class="clue light">0/${this[this.question].chosen.length}</p>`);
					this.test();
				}
			} else {
				this.inst.text.edit(`<p class="text light">${this[this.question].speech[k]}</p>`);
				controller.wait('click', `true-${this.question}`, end, 16);
			}
		}.bind(this);
		
		controller.wait('click', `true-${this.question}`, end, 16);
	},
	endChallenge() {
		this.inst.back.destroy();
		this.inst.field.destroy();
		this.inst.text.destroy();
		this.inst.clueField.destroy();
		this.inst.clueText.destroy();
		this.inst.back = null;
		this.inst.field = null;
		this.inst.text = null;
		this.inst.clueField = null;
		this.inst.clueText = null;
		managerGame.waiting = false;
		managerGame.run();
	},
	inst: {
		back: null,
		field: null,
		text: null,
		clueField: null,
		clueText: null,		
	}		
}