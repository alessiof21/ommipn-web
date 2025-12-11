/*
// Системные функции


// Функции
<functions>
functionName() {
	// Тело функции
}
</functions>

так как functions в одном блоке dependency с variables
то можно обращаться к переменным через this.variables['имя переменной']

Вызов функций
f% functionName() %

// Модули
<module-js>
default moduleName from 'url'
moduleName from 'url'
</module-js>

соответственно вызов
m% moduleName () % (если функция) для default
m% moduleName functionName() % если обычный



// Код в тексте
code-on
	...Код здесь
code-off

// Переменные
Добавление переменной
Локальной:
add local/global varName = value 

Глобальной:
add local/global varName = value

Разрешенные типы:
('', {}, [], Number, Boolean, null, undefined)

Динамическая типизация

Удаление переменной
Локальной:
del local varName

Глобальной:
del global varName

Обращение к переменным в любой строке начинается с #:
#varName

Обращение к стату в любой строке начинается с $:
$statName
//---------------------------------------------------------------

// Циклы

Цикл while (то, что после while, будет повторяться само по себе, пока условие истинно):
while condition [condition - условие, можно использовать переменные]

Цикл while-stop (то, что после while-stop, будет повторяться при проигрывании игроком, пока условие истинно):
while-stop condition [condition - условие, можно использовать переменные]
//---------------------------------------------------------------

// Условия

Если:
if condition [condition - условие, можно использовать переменные]

Иначе если:
elif condition [condition - условие, можно использовать переменные]

Иначе:
else

Множественное условие (switch):
switch #varName
case value [value - может быть переменной] - условие
default - дефолтное условие
break - прервать условие
//---------------------------------------------------------------









Переход на другую (главу, метку, строку):
go (chapter chapterName label labelName line lineNumber)
goback (chapter chapterName label labelName line lineNumber)

Создание выборов:




`exp var value` <=> dependency.var||options.var = value;
'exp var =(+=) value'
`if condition var` <=> if (dependency.var||options.var ? condition) {
`elif condition var`<=> } else if (dependency||options.var ? condition) {
`else ` <=> } else {
`break` <=> break;
`return expression` <=> return expression (если expression пустое, то просто return);
`switch var` <=> switch (dependecy||options.var) {
`case expression` <=> case (expression):
`default` <=> default:
`a` <=> (async ()=> { // начало асинхронности
`on name position effect` <=> await managerGame.moving(name, true, direction, X) (direction и X из position)
'off name effect' <=> await managerGame.moving(name, false, direction);
`say name animationName>>phrase`
`@say name animationName>>phrase` <=> анимация на одну фразу
'opacity name %'
'@opacity name %'
`b-on name effect` <=> await managerGame.showBackground(name, effect='none', [])
'b-off name effect' <=> await managerGame.hideBackground(name, effect='none', [])
'choice text' <=> showChoice(text, false - показать выбор (без времени)
'@choice text' <=> showChoice(text, true - показать выбор на время
'option chapter label line>>textOption' <=> ,[textOption, chapter, label, line] 
'option-if condition var>>chapter label line>>textOption'
'nrt text' <=> текст от имени рассказчика
'i-on nameImg position' <=> position - X Y
'i-off
'svg-on nameImg position' 
'svg-off'
stop'

input "Текст инпута" (правильный ответ)
*/

import { options, logger, errorManager } from './main.js';
import { chapters } from './scripts.js'

function prepareLine(line, cmd = false) {
	const end = ['.', '+', '-', '*', '/', '%', '=', '!', ')', '[', ','];
	for (let i = 0; i < line.length; i++) {
		if (line[i].includes('#') && !line[i].includes('{#')) {
			line[i] = line[i].replace(/#/g, ' #');
			let chLine = '';
			let lineArr = line[i].split(' ');
			for (let j = 0; j < lineArr.length; j++) {
				if (lineArr[j].includes('#')) {
					let flag = false;
					for (let k = 0; k < end.length; k++) {
						if (lineArr[j].includes(end[k])) {
							chLine += defineVar(lineArr[j].slice(1, lineArr[j].indexOf(end[k])), cmd) + lineArr[j].slice(lineArr[j].indexOf(end[k]));
							flag = true;
							break;
						}
					}
					if (!flag) { // Ничего нет в конце
						chLine += defineVar(lineArr[j].slice(1), cmd);
					}
				} else {
					chLine += lineArr[j];
				}
			}
			line[i] = chLine;
		} // Переменные
		if (line[i].includes('$') && !line[i].includes('{$')) {
			line[i] = line[i].replace(/\$/g, ' $');
			let chLine = '';
			let lineArr = line[i].split(' ');
			for (let j = 0; j < lineArr.length; j++) {
				if (lineArr[j].includes('$')) {
					let flag = false;
					for (let k = 0; k < end.length; k++) {
						if (lineArr[j].includes(end[k])) {
							chLine += defineStat(lineArr[j].slice(1, lineArr[j].indexOf(end[k])), cmd) + lineArr[j].slice(lineArr[j].indexOf(end[k]));
							flag = true;
							break;
						}
					}
					if (!flag) { // Ничего нет в конце
						chLine += defineStat(lineArr[j].slice(1), cmd);
					}
				} else {
					chLine += lineArr[j];
				}
			}
			line[i] = chLine;
		} // Статы
	}
	return line;
}

function prepareText(text) {
	const arr = text.split(' ');
	for (let i = 0; i < arr.length; i++) {
		const matchVar = arr[i].match(/{#.+}/g);
		if (matchVar) {
			arr[i] = arr[i].slice(0, arr[i].indexOf('{#')) + eval(defineVar(matchVar[0].slice(2,-1))) + arr[i].slice(arr[i].indexOf('}')+1);
		}
		const matchStat = arr[i].match(/{\$.+}/g);
		if (matchStat) {
			arr[i] = arr[i].slice(0, arr[i].indexOf('{$')) + eval(defineStat(matchStat[0].slice(2,-1))) + arr[i].slice(arr[i].indexOf('}')+1);		
		}
	}
	return arr.join(' ') || null;
}

function defineStat(name, cmd=false) {
	if (options.stats.hasOwnProperty(name)) {
		if (cmd) {
			return `options.stats['${name}']`;
		}
		return `\`${options.stats[name]}\``;
	} else {
		throw new Error(`Undefined state ${name}`)
	}
}

function defineVar(name, cmd=false) {
	if (chapters[options.chapter].dependency?.variables?.hasOwnProperty(name)) { // Переменная локальная
		if (cmd) {
			return `chapters['${options.chapter}'].dependency.variables['${name}']`;	
		}
		return `\`${chapters[options.chapter].dependency.variables[name]}\``;
	} else if (options.variables.hasOwnProperty(name)) { // Переменная глобальная
		if (cmd) {
			return `options.variables['${name}']`;
		}
		return `\`${options.variables[name]}\``;
	} else {
		throw new Error(`Undefined variable ${name}`);
	}
}

function defineCode(directive) {
	const code = directive.slice(2, directive.length-1).trim();
	try {
		return eval(code);
	} catch(e) {
		errorManager.handle(e);
		return '';
	}
}

function defineVariable(directive) { 
	const name = directive.slice(2, directive.length-1).trim();
	if (chapters[options.chapter].dependency?.variables?.hasOwnProperty(name)) {
		return `${chapters[options.chapter].dependency.variables[name]}`;
	} else if (options.variables.hasOwnProperty(name)) {
		return `${options.variables[name]}`;
	} else {
		throw new Error(`Undefined variable ${name}`);
	}
}

function defineModule(directive) {
	let [moduleName, ...expression] = directive.slice(2, directive.length-1).trim().split(' ');
	expression = expression.join(' ').trim();
	let code = `chapters['${options.chapter}'].modules.`
	if (chapters[options.chapter].modules?.default?.hasOwnProperty(moduleName)) {
		code += `default['${moduleName}'].default`;
		if (!expression.startsWith('(')) {
			code += `.`;
		}
		code += expression;
		return eval(code);
	} else if (chapters[options.chapter].modules?.usual?.hasOwnProperty(moduleName)) {
		code += `usual['${moduleName}'].` + expression;
		return eval(code);
	} else {
		throw new Error(`Undefined module ${moduleName}`);
	}
}

function defineFunction(directive) {
	let func = directive.slice(2, directive.length-1).trim();
	const funcName = func.slice(0,func.indexOf('('));
	func = func.replace(`${funcName}(`, '');
	if (chapters[options.chapter].dependency?.functions?.hasOwnProperty(funcName)) {
		let code = `chapters['${options.chapter}'].dependency.functions.`;
		code += funcName;
		code += `.call(chapters['${options.chapter}'].dependency,`;
		code += func;
		return eval(code);
	} else {
		throw new Error(`Undefined function ${funcName}`);
	}
}

function checkLength(name, arr, ...condition) {
	if (condition.indexOf(arr.length) === -1) {
		throw new Error(`Ошибка в строкe ${name + ' ' + arr.join(' ')} (chapter = ${options.chapter}, label = ${options.label}, line = ${options.line}): для команды ${name} необходимое количество аргументов: ${condition.join(' или ')}; введено ${arr.length}`);
	}
	return;
}

function handleComment(comment) {
	const commentText = comment.slice(2).trim();
	const data = `chapter: ${options.chapter} | label: ${options.label} | line: ${options.line}`;
	const width = commentText.length > data.length? commentText.length : data.length;
	const firstLine = '|' + data + ' '.repeat(width-data.length) + '|';
	const sepLine = '_'.repeat(width);
	const secondLine =  '|' + commentText + ' '.repeat(width-commentText.length) + '|';
	const answer = ` ${sepLine}\n${firstLine}\n|${sepLine}|\n${secondLine}\n|${sepLine}|`;
	logger.add({type: 'comment', text: `\n${answer}`});
	return;
}

export default function (arr) {
	let script = '(async ()=> {';
	script += 'await this.save("autosave");\n';
	let type = 'async';
	let usual = true; // Флаг, true - перемещаемся на следующую строчку, false - нет
	let stop = false; // Флаг, true - остановка выполнение скрипта
	let next = false; // Нужно ли перейти на следующую строку скрипта
	
	const operations = { // Отслеживаем начатые операции
		choice: {
			active: false, // Идет ли выбор
			type: null, // Тип выборного меню
			option: false, // Входит ли опция в выбор
			tab: 0,
		},
		show: {
			active: false,
			branch: false,
			tab: 0,
			lines: ``
		},
		temp: {
			active: false,
			lines: ``,
		}, 
		timeout: {
			active: false,
		},
		interval: {
			active: false
		},
		condition: {
			active: false,
			tab: 0,
			bool: false,
		},
		brace: 0,
		while: 0,
	};

	const polyLineComment = {
		bool: false,
		text: ''
	}
	
	const code = {
		bool: false,
		text: ''
	}

	for (let i = 0; i < arr.length; i++) {
		if (polyLineComment.bool) {
			const endComment = arr[i].match(/.*\*\//g);
			if (endComment === null) {
				polyLineComment.text += `${arr[i]} `;
				continue;
			} else {
				polyLineComment.text += `${endComment[0].slice(0, endComment[0].length-2)} `;
				polyLineComment.bool = false;
				arr[i] = arr[i].replace(endComment[0], '').trim();
			}
		} else {
			const endComment = arr[i].match(/\/\*.+/g);
			if (endComment !== null) {
				polyLineComment.bool = true;
				if (arr[i].includes('*/')) {
					polyLineComment.bool = false;
					polyLineComment.text += arr[i].slice(arr[i].indexOf('/*'), arr[i].indexOf('*/')) + ' ';
					arr[i] = (arr[i].slice(0, arr[i].indexOf('/*')) + arr[i].slice(arr[i].indexOf('*/')+2)).trim();
				} else {
					polyLineComment.text += arr[i].slice(arr[i].indexOf('/*')) + ' ';
					continue;
				}
			}
		}
		
		if (!polyLineComment.bool && polyLineComment.text.length !== 0) {
			handleComment(polyLineComment.text);
			polyLineComment.text = '';
		} 		

		const commentMatch = arr[i].match(/\/\/.+/g);
		if (commentMatch !== null) {
			const [comment] = commentMatch;
			arr[i] = arr[i].slice(0, arr[i].indexOf(comment));
			handleComment(comment);
		}

		// Определим количество отступов в строке
		let lineTab = 0;
		const lineTabs = arr[i].match(/\t/g);
		if (lineTabs !== null) {
			lineTab = lineTabs.length;
		}
		arr[i] = arr[i].replace(/\t/g, '');
		
		const codeMatch = arr[i].match(/c%[^%]+%/g);
		if (codeMatch !== null) {
			for (let j = 0; j < codeMatch.length; j++) {
				const value = defineCode(codeMatch[j]);
				arr[i] = arr[i].replace(codeMatch[j], value);
			}
		}
		
		const variablesMatch = arr[i].match(/v%[^%]+%/g);
		if (variablesMatch !== null) {
			for (let j = 0; j < variablesMatch.length; j++) {
				const value = defineVariable(variablesMatch[j]);
				arr[i] = arr[i].replace(variablesMatch[j], value);
			}
		}
		
		const moduleMatch = arr[i].match(/m%[^%]+%/g);
		if (moduleMatch !== null) {
			const answerModule = defineModule(moduleMatch[0]) ?? '';
			if (Array.isArray(answerModule)) {
				arr.splice(i+1, 0, ...answerModule.slice(1));
				arr[i] = arr[i].replace(moduleMatch[0], answerModule[0]);
			} else {
				arr[i] = arr[i].replace(moduleMatch[0], answerModule)			
			}
		}
		
		const functionMatch = arr[i].match(/f[^%]+%/g);
		if (functionMatch !== null) {
			const answerFunction = defineFunction(functionMatch[0]) ?? '';
			if (Array.isArray(answerFunction)) {
				arr.splice(i+1, 0, ...answerFunction.slice(1));
				arr[i] = arr[i].replace(functionMatch[0], answerFunction[0]);
			} else {
				arr[i] = arr[i].replace(functionMatch[0], answerFunction);
			}
		}
			
		let line = arr[i].trimEnd().split(' ');
		const cmd = line.shift();
		let ctx; 
		let sep; // Сепаратор
		const polyLines = []; // Собрать по частям
		let allFlag = false;
		const all = [];
		
		function makeOption(str) {
			if (operations.choice.option) {
				if (script.endsWith(',')) {
					script = script.slice(0, -1);
				}
				script += ']]],';
			}
			script += '[' + str + ', [[';
			operations.choice.option = true;
			if (i === arr.length - 1) { // На этом все заканчивается
				script += ']]]]);'
			}
		}
		
		// Добавляем дополнительную развилку
		if (operations.temp.active) {
			if (cmd === 'temp-stop') {
				operations.temp.active = false;
				script += `this.addTemp(\`${operations.temp.lines}\`);\n`;
			} else {
				operations.temp.lines += arr[i] + '\n';
				if (i === arr.length-1) {
					script += `this.addTemp(\`${operations.temp.lines}\`);\n`;
				}
			}
			continue;
		}
		
		// Идет выбор
		if (operations.choice.active) {
			if ((cmd !== 'option' || (cmd === 'option' && lineTab !== operations.choice.tab)) && (cmd !== 'loop' || (cmd === 'loop' && lineTab !== operations.choice.tab))) {	
				if (lineTab <= operations.choice.tab) {
					// Нет вариантов ответов
					if (script.endsWith('}, [')) {
						script += ']);'
					} else {
						script = script.slice(0, -1);
						script += ']]]]);'
					}
					operations.choice.active = false;
					operations.choice.option = false;
				} else {
					if (operations.choice.option) {
						if (lineTab === operations.choice.tab+1 && arr[i] == false) {
							script = script.slice(0, -1);
							script += '], [';
						} else {
							const str = `\`${"\t".repeat(lineTab-1)}${cmd.trim()} ${line.join(' ')}\``;
							script += str + ",";
						}
					}
					if (i == arr.length - 1) { // Конец выбора
						// Нет вариантов ответов
						if (script.endsWith('}, [') || script.endsWith(']]],')) {
							if (script.endsWith(']]],')) {
								script = script.slice(0, -1);
							}
							script += ']);'
						} else {
							script = script.slice(0, -1);
							script += ']]]]);'
						}
					} 
					if (lineTab >= operations.choice.tab) {
						continue;
					}
				}
			}			
		}
		
		// Идет развилка
		if (operations.show.active) {
			if (lineTab > operations.show.tab) {
				if (operations.show.branch) {
					// Пустая строка
					if (arr[i] == false && operations.show.lines[operations.show.lines.length-1] !== '], [' && lineTab === operations.show.tab+1) {
						if (operations.show.lines[operations.show.lines.length-1] === ',') {
							operations.show.lines = operations.show.lines.slice(0, operations.show.lines.length-1);
						}
						operations.show.lines += '], [';
					} else {
						operations.show.lines += `\`${"\t".repeat(lineTab-1)}${cmd.trim()} ${line.join(' ')}\`,`;
					}
				}
				// Конец
				if (i === arr.length - 1) {
					if (operations.show.lines[operations.show.lines.length-1] === ',') {
						operations.show.lines = operations.show.lines.slice(0, operations.show.lines.length-1);
					} else if (operations.show.lines === '') {
						operations.show.lines += '[';
					}
					script += operations.show.lines;
					script += ']]);'
				} 
				continue;
			} else {
				if (cmd !== 'show-elif' && cmd !== 'show-else' && cmd !== 'loop') {
					if (operations.show.lines[operations.show.lines.length-1] === ',') {
						operations.show.lines = operations.show.lines.slice(0, operations.show.lines.length-1);
					}
					operations.show.active = false;
					script += operations.show.lines;
					script += ']]);'
				}
			}
		}
		
		// Идет задержка
		if (operations.timeout.active) {
			if (lineTab === 0) { // Закончилась задержка
				operations.timeout.active = false;
				script += '`);\n'
			}
		}
		
		// Идет интервал
		if (operations.interval.active) {
			if (lineTab === 0) { // Закончился интервал
				operations.interval.active = false;
				script += '`);\n'
			}
		}
		
		if (code.bool) {
			if (cmd === 'code-off') {
				script += `this.handleCode(\`${code.text}\`);`
				code.text = '';
			} else {
				code.text += `${arr[i]}\n`;
			}
			continue;
		}
		
		line = prepareLine(line, cmd === 'exp' || cmd === 'option' || cmd === 'if' || cmd === 'elif' || cmd === 'switch' || cmd === 'show-if' || cmd === 'show-elif' || cmd.includes('input') ? true : false);
	

		
		// Идет условие
		if (operations.condition.active) {

			while (lineTab < operations.condition.tab) {
				script += '}';
				--operations.condition.tab;
			}

			if (lineTab === 0 && cmd !== 'else' && cmd !== 'elif') {
				operations.condition.active = false;
			}
		}
		
		
		const lengthCheck = function(...needArg) {
			checkLength(cmd, line, ...needArg);
		}
		
		// Добавляет await при необходимости
		function checkAsync() {
			script += type === 'async' ? 'await ' : '';
			return;
		}
		
		switch (cmd) {
			case 'saving':
				script += `this.allowSaving = ${line[0]};\n`
				break;
			case 'code-on':
				code.bool = true;
				break;
			case 'dispatch':
				script += `globalThis.nextTick(()=> this.dispatch('${line[0]}', '${line[1]}'));\n`
				break;		
			case 'temp-start': 
				operations.temp.active = true;
				break;
		
			case 'stay': 
				usual = false;
				break;
			
			// Получение информации
			case cmd.match(/info/)?.input:
				script += `this.getInfo(${cmd.startsWith('@')}, ${line.join(' ')}, ${cmd.includes('top')});\n`
				break;
			// Получение достижения
			case 'ach': 
				script += `this.getAchievement('${line[0]}');\n`;
				break;
			
			// Изменение статов
			case 'stat':
				script += `this.stat('${line[0]}', ${line[1]});\n`;
				break;
			// Создание ввода текста
			case 'input': // Регистрозависимый инпут
			case '@input': // Регистронезависимый инпут
				stop = true;
				const input = line.join(' ');
				ctx = input.split('=');	
				script += `this.input(\`${ctx[0]}\`, ${prepareText(ctx[1])}, ${cmd.startsWith('@')});\n`;
				break;
			
			// Создание меню выбора
			case cmd.match(/choice/)?.input:
				stop = true;
				usual = false;
				const choiceOptions = {
				    type: cmd.match(/i-/) === null ? `usual` : `image`, 
    				settings: null,
    				text: null,
    				time: cmd.startsWith('@'),
					random: line[line.length-1] === 'random'
				}
				if (choiceOptions.random) {
					line.pop();
				}
				if (choiceOptions.type !== `usual`) {
					if (!line[0].startsWith('"') && !line[0].startsWith("'")) { // Есть уточнения
						choiceOptions.settings = `'${line.shift()}'`;
					}
				}
				choiceOptions.text = prepareText(line.join(' '));
				checkAsync();
				script += `this.choice({type: '${choiceOptions.type}', settings: ${choiceOptions.settings}, text: ${choiceOptions.text}, time: ${choiceOptions.time}, random: ${choiceOptions.random}}, [`
				operations.choice.active = true;
				operations.choice.type = choiceOptions.type;
				operations.choice.tab = lineTab;	
				break;
			
			// Создание опции выбора
			case 'option':			
				if (operations.choice.type === 'usual') { // Выбор для текстового меню
					sep = line[0].startsWith('"') ? '"' : "'";
					if (line.lastIndexOf('if') !== -1 && line[line.lastIndexOf('if')-1].endsWith(sep)) { // Есть условие на выполнение
					
						if (eval(prepareLine(line.slice(line.lastIndexOf('if')+1)).join(' '))) {
							makeOption(prepareText(line.slice(0, line.lastIndexOf('if')).join(' ')));
						} else {
							if (operations.choice.option) {
								if (script.endsWith(',')) {
									script = script.slice(0, -1);
								}
								script += ']]],';
								operations.choice.option = false;
							}
						}
					} else {
						makeOption(prepareText(line.join(' ')));
					}
				} else {
					if (line.lastIndexOf('if') !== -1) {
						if (eval(prepareLine(line.slice(line.lastIndexOf('if')+1)).join(' '))) { 
							let optStr = '[';
							for (let j = 0; j < line.lastIndexOf('if'); j++) {
								if (j < 2) {
									optStr += `'${line[j]}',`;
								} else {
									optStr += `${line[j]},`;
								}
							}
							optStr = optStr.slice(0, optStr.length-1) + ']';
							makeOption(optStr);
						} else {
							if (operations.choice.option) {
								if (script.endsWith(',')) {
									script = script.slice(0, -1);
								}
								script += ']]],';
								operations.choice.option = false;
							}
						}
					} else {
						let optStr = '[';
						for (let j = 0; j < line.length; j++) {
							if (j < 2) {
								optStr += `'${line[j]}',`;
							} else {
								optStr += `${line[j]},`;
							}
						}
						optStr = optStr.slice(0, optStr.length-1) + ']';
						makeOption(optStr);
					}
				}
				break;
			
			// Все, что связано с аудио
			case cmd.match(/audio-play/)?.input:
				script += `this.audio('play', '${line[0]}', ${line.length > 1 ? line[1] : 1}, ${cmd.startsWith('@') ? true : false}, ${line.length > 2 ? line[2] : false});\n`;
				break;
				
			case 'audio-stop':
				script += `this.audio('stop', '${line[0]}');\n`;
				break;
				
			case 'audio-pause':
				script += `this.audio('pause', '${line[0]}'`;
				if (line.length > 1) {
					script += `, ${line[1]}`;
				}
				script += ', true);\n';
				break;
				
			case 'audio-pauseAll':
				script += `this.audio('pauseAll', ${line[0]});`;
				break;
				
				
			// Сохранение
			case 'save':
				checkAsync();
				script += `this.save('${line[0]}');\n`
				break;
				
			// Тип скрипта: синхронный или асинхронный (по умолчанию асинхронный)
			case 'sync': // Выключаем режим асинхронности и включаем синхронность
				if (type === 'async') {
					type = 'sync';
					script += ' })();'				
				}
				break;
			case 'async': // Выключаем режим синхронности и включаем асинхронность
				if (type === 'sync') {
					type = 'async';
					script += '(async ()=> {';				
				}
				break;

			// Манипуляции с chapter, label и line
			// Смена без run (без перехода на следующую строку)
			case 'chapter':
				lengthCheck(1);
				script += ` options.chapter = '${line[0]}'; options.label = 'start'; options.line = 0;`;
				usual = false;
				break;
			case 'label':
				lengthCheck(1);
				script += ` options.label = '${line[0]}'; options.line = 0;`;
				usual = false;
				break;
			case 'line':
				lengthCheck(1);
				if (options.temps.length !== 0) {
					script += ` options.temps[options.temps.length-1].line = ${+line[0]};`;
				} else {
					script += ` options.line = ${+line[0]};`;					
				}
				usual = false;
				break; 
			
			// Смена с переходом на следующую строку
			// Переход куда-то с возвращением на следующую строку (goback)
			case 'goback': 
				next = true;
				usual = false;
				
				let backLine = 1;
				if (line.length % 2 !== 0) { // Есть уточнение по строке, на которую надо вернуться
					backLine += Number(line.shift());
				} 
				
				if (options.temps.length === 0) {
					options.line += backLine;
				} else {
					options.temps[options.temps.length-1].line += backLine;
				}
				
				const point = {};
				
				const backChange = { // Объект, который проверяет, что мы изменяем
					label: false,
					line: false,
				}
				
				for (let i = 0; i < line.length; i += 2) {
					if (line[i] === 'chapter') {
						point.script = `${line[i+1]}`;
						if (!backChange.label) { // Не изменяем специально label
							point.label = 'start';
						}
						if (!backChange.line) {
							point.line = 0;
						}
					} else if (line[i] === 'label') {
						backChange.label = true;
						point.label = `${line[i+1]}`;
						if (!backChange.line) {
							point.line = 0;
						}
					} else if (line[i] === 'line') {
						backChange.line = true;
						point.line = line[i+1];
					} else {
						throw new Error(`ScriptError: undefined command go ${line[i]}, expected chapter, label or line`)
					}
					
				}
				
				if (!point.hasOwnProperty('chapter')) {
					point.chapter = options.chapter;
				}
				
				script += `options.temps.push({type: 'goback', chapter: '${point.chapter}', label: '${point.label}', line: ${point.line}});`
				break;
			
			case 'back':
				next = true;
				usual = false;
				if (options.temps.length !== 0) {
					while (options.temps[options.temps.length -1 ].type !== 'goback' && options.temps.length !== 0) {
						options.temps.pop();
					}
					options.temps.pop();
				} 
				break;
			
			case 'wait':
				script += `controller.refresh();\nthis.waiting = ${line.join(' ')};\n`
				break;
			case 'repeat':
				usual = false;
				if (options.temps.length !== 0) {
					script += 'options.temps[options.temps.length-1].line = 0;'
				} else {
					script += 'options.line = 0;';
				}
				script += 'this.running = false; return '
				//script += type === 'async' ? 'await ' : '';
				checkAsync();
				script += 'this.run()';	
				break;
			// Переход без возвращения
			case 'go':
				next = true;
				usual = false;
				
				const change = { // Объект, который проверяет, что мы изменяем
					label: false,
					line: false,
				}
				while (options.temps.length !== 0 && options.temps[options.temps.length-1].type !== 'goback') {
					options.temps.pop();
				}
				let changeParam = options.temps.length === 0 ? 'options' : 'options.temps[options.temps.length-1]';
				for (let i = 0; i < line.length; i += 2) {
					if (line[i] === 'chapter') {
						const chapter = line[i+1].startsWith('"') || line[i+1].startsWith('`') || line[i+1].startsWith("'") ? line[i+1] : `'${line[i+1]}'`;
						script += `${changeParam}.chapter = ${chapter};`;
						if (!change.label) { // Не изменяем специально label
							script += `${changeParam}.label = 'start';`;
						}
						if (!change.line) { // Не изменяем специально line
							script += `${changeParam}.line = 0;`;
						}
					} else if (line[i] === 'label') {
						change.label = true;
						const label = line[i+1].startsWith('"') || line[i+1].startsWith('`') || line[i+1].startsWith("'") ? line[i+1] : `'${line[i+1]}'`;
						script += `${changeParam}.label = ${label};`;
						if (!change.line) { // Не изменяем специально line
							script += `${changeParam}.line = 0;`;
						}
					} else if (line[i] === 'line') {
						change.line = true;
						script += `${changeParam}.line = ${line[i+1]};`;
					} else {
						throw new Error(`ScriptError: undefined command go ${line[i]}, expected chapter, label or line`)
					}
				}
				break;	
			
			// Таймеры
			case 'delay': // Задержка
				checkAsync();
				script += `this.delay(${line[0]});`
				break;
				
			case 'timeout': 
				operations.timeout.active = true;
				script += `this.timeout(${line[0]}, \``;
				break;
				
			case 'interval-on': 
				operations.interval.active = true;
				script += `this.interval(true, '${line[0]}', ${line[1]}, \``
				break;
				
			case 'interval-off':
				script += `this.interval(false, '${line[0]}', 0, '');\n`
				break;
			
			case 'show-if':
				stop = true;
				usual = false;
				script += 'this.showLines([';
				//next = true;
				operations.show.active = true;
				if (eval(line.join(' '))) {
					operations.show.branch = true;
					operations.show.tab = lineTab;
					operations.show.lines = '[';
				}
				break;
			case 'show-elif':
				if (!operations.show.branch && operations.show.lines.length === 0 && eval(line.join(' '))) {
					operations.show.branch = true;
					operations.show.tab = lineTab;
					operations.show.lines = '[';
				} else {
					operations.show.branch = false;
				}
				break;
			case 'show-else':
				if (!operations.show.branch && operations.show.lines.length === 0) {
					operations.show.branch = true;
					operations.show.tab = lineTab;
					operations.show.lines = '[';
				} else {
					operations.show.branch = false;
					//script += 
				}
				break;
			// Манипуляции с переменными и т.д.
			case 'exp': // Выражение
				script += line.join(' ') + ';';
				break;			
			
			// Логические операции
			case 'if': // Логическое если
				operations.condition.active = true;
			case 'elif': // Логическое иначе если
				++operations.condition.tab;
				if (cmd === 'elif') {
					script += 'else ';
				}
				line = prepareLine(line);
				script += `if (${line.join(' ')}) {`
				break;
			case 'else': // Логическое иначе
				++operations.condition.tab;
				script += 'else { '
				break;
				
			case 'while':
				operations.condition.active = true;
				++operations.condition.tab;
				line = prepareLine(line);
				script += `while (${line.join(' ')}) {`;
				break;
			
			case 'while-stop':
				line = prepareLine(line);
				if (eval(`${line.join(' ')}`)) {
					usual = false;
				} else {
					script += 'return;';
				}
				break;
			case 'break':
				script += ' break;'
				break;
			case 'return':
				line = prepareLine(line);
				script += ` return ${line.length === 1 ? line[0] : ''};`
				break; 
			case 'switch':
				operations.condition.active = true;
				++operations.condition.tab;
				line = prepareLine(line);
				script += `switch (${line[0]}) {`
				break;
			case 'case':
				line = prepareLine(line);
				script += ` case (${line[0]}):`
				break;
			case 'default': 
				script += ' default:'
				break;
			
			case 'display':
				script += `this.changeDisplay('${line[0]}'`
				for (let j = 1; j < line.length; j++) {
					let arg = line[j];
					if (j === 1) {
						arg = `'${arg}'`;
					} 
					script += `, ${arg}`;
				}
				script += ');\n';
				break;
			// Манипуляции с фоном
			case 'b-on': // Добавить фона
			case 'b-off': // Убрать фон
				//script += type === 'async' ? 'await ' : '';
				checkAsync();
				script += 'this.'
				if (cmd === 'b-on') {
					script += 'show';
				} else {
					script += 'hide';
				}
				script += `Background('${line[0]}', '${line.length === 2 ? line[1] : 'none'}');\n`;
				break;
			
			case 'b-shadowOn':
				script += `this.shadowBackground('show'`;
				if (line[0]) {
					script += `, ${line[0]}`;
				}
				script +=  `);\n`;
				break;
			case 'b-shadowOff': 
				script += `this.shadowBackground('hide');\n`;
				break;
			// Манипуляции с персонажами
			// on person1 position1 (effect1), person2 position2 (effect2), person3 position3 (effect3)
				
			// off person1 (effect1), person2 (effect2), person3 (effect3)
			case 'on': // Добавить персонажа
			case 'syncOn': // без await даже если асинхронная функция
			case 'off': // Убрать персонажа
			case 'syncOff': // без await даже если асинхронная функция
				ctx = line.join(' ');
				ctx = ctx.split(',').map(elem => elem = elem.trim());
				for (let j = 0; j < ctx.length; j++) {
					polyLines.push([]);
					const subLine = ctx[j].split(' ');
					
					if (!subLine[0].startsWith(`\``)) {
						subLine[0] = `'${subLine[0]}'`;
					}
					polyLines[j].push(subLine[0]);
					for (let k = 1; k < subLine.length; k++) {
						if (subLine[k] === 'all') {
							allFlag = true;
							continue;
						}
						if (subLine[k].startsWith('moving-')) {
							subLine[k] = subLine[k].split('-');
							for (let l = 0; l < subLine[k].length; l++) {
								if (allFlag) {
									all.push(`${subLine[k][l]}`);
								} else {
									polyLines[j].push(`${subLine[k][l]}`);
								}
							}
						} else {
							if (allFlag) {
								all.push(`${subLine[k]}`)
							} else {
								polyLines[j].push(`${subLine[k]}`);	
							}
						}
					}
					//script += ');\n';
				}
				if (allFlag) {
					for (let j = 0; j < polyLines.length; j++) {
						polyLines[j].push(...all);
					}
				}
				for (let j = 0; j < polyLines.length; j++) {
					if (j === ctx.length - 1) {
						if (!cmd.startsWith('sync')) {
							checkAsync();	
						}
					} 
					if (cmd === 'on' || cmd === 'syncOn') {
						script += `this.showPerson(`
					} else {
						script += `this.hidePerson(`
					}
					for (let k = 0; k < polyLines[j].length; k++) {
						if (k === 0) {
							script += `${polyLines[j][k]}`;
						} else {
							script += `, '${polyLines[j][k]}'`
						}
					}
					script += ');\n'
				}
				break;
			// ДОРАБОТАТЬ ЭТО
			case 'change': // Поменять свойство у персонажа
				script += ` this.change(`;
				if (!line[0].startsWith(`\``)) {
					line[0] = `'${line[0]}'`;
				}
				script += `${line[0]}, '${line[1]}', ${line[2]});\n`
				break;
			case cmd.match(/animate/)?.input:
			case cmd.match(/mirror/)?.input:
			case cmd.match(/active/)?.input:
			case cmd.match(/opacity/)?.input:
			case cmd.match(/shadow/)?.input:
				ctx = line.join(' ');
				ctx = ctx.split(',').map(elem => elem = elem.trim());
				for (let j = 0; j < ctx.length; j++) {
					polyLines.push([]);
					const subLine = ctx[j].split(' ');
					if (!subLine[0].startsWith(`\``)) {
						subLine[0] = `'${subLine[0]}'`;
					}
					polyLines[j].push(subLine[0]);
					for (let k = 1; k < subLine.length; k++) {
						if (subLine[k] === 'all') {
							allFlag = true;
							continue;
						}
						if (allFlag) {
							all.push(`${subLine[k]}`)
						} else {
							polyLines[j].push(`${subLine[k]}`);	
						}
					}
				}
				if (allFlag) {
					for (let j = 0; j < polyLines.length; j++) {
						polyLines[j].push(...all);
					}
				}
				for (let j = 0; j < polyLines.length; j++) {
					script += ` this.${cmd.startsWith('@') ? cmd.slice(1) : cmd}(`;
					for (let k = 0; k < polyLines[j].length; k++) {
						if (k === 0) {
							script += `${polyLines[j][k]}`;
						} else {
							script += `, '${polyLines[j][k]}'`
						}
					}
					if (cmd.startsWith('@')) {
						script += ', true';
					}
					script += ');\n'
				}
				break;
			case 'say': // Сказать фразу
			case '@say': // Сказать фразу с анимацией на 1 действие
				let text; 
				for (let j = 0; j < line.length; j++) {
					if (line[j].startsWith('"') || line[j].startsWith("'")) {
						text = prepareText(line.slice(j).join(' '));
						ctx = line.slice(0, j);
						break;
					}
				}
				if (!ctx[0].startsWith(`\``)) {
					ctx[0] = `'${ctx[0]}'`;
				} 
				
				if (ctx.length === 2) { // Если есть анимация	
					script += ` this.animate(${ctx[0]}, '${ctx[1]}'`;
					if (cmd === '@say') {
						script += ', true'
					} 
					script += ');\n'
				}
				checkAsync();
				script += `this.showPhrase(${ctx[0]}, ${text});\n`
				break;
			case 'loop':
				if (operations.choice.active) {
					if (script.endsWith('}, [') || script.endsWith(']]],')) {
						if (script.endsWith(']]],')) {
							script = script.slice(0, -1);					
						}
						script += '], true);'
					} else {
						if (script.endsWith(',')) {
							script = script.slice(0, -1);						
						}
						script += ']]]], true);'					
					}				
				} else if (operations.show.active) {
					if (operations.show.lines[operations.show.lines.length-1] === ',') {
						operations.show.lines = operations.show.lines.slice(0, operations.show.lines.length-1);
					} else if (operations.show.lines === '') {
						operations.show.lines += '[';
					}
					script += operations.show.lines;
					script += ']], true);'					
				}

				break;
				
			case 'end': 
				usual = false;
				stop = true;
				script += 'this.end();\n'
				break;
			case 'next':
				next = true;
				break;		
				
			// Текст от лица рассказчика
			case 'nrt':
				//script += type === 'async' ? 'await ' : '';
				checkAsync();
				script += `this.showNarrator(${prepareText(line.join(' '))});\n`
				break;
				
			// Показ картинок
			case 'i-on':
				lengthCheck(3);
				checkAsync();
				script += `this.showImage('${line[0]}', ${line[1]}, ${line[2]});\n`;
				break;
			case 'i-off':
				lengthCheck(1);
				checkAsync();
				script += `this.hideImage('${line[0]}');\n`;
				break;
			case 'i-show':
				checkAsync();
				script += `this.switchImage('${line[0]}', true);\n`;
				break;
			case 'i-hide':
				checkAsync();
				script += `this.switchImage('${line[0]}', false);\n`;
				break;
			case 'svg-on':
				lengthCheck(3);
				checkAsync();
				script += `this.showSVGImage('${line[0]}', ${line[1]}, ${line[2]});\n`;
				break;
			case 'svg-off':
				script += `this.hideSVGImage('${line[0]}');\n`;
				break;			
			// Остановить выполнение
			case 'stop':
				stop = true;
				break;
			default:
			    line.unshift(cmd);
				script += `${line.join(' ')}\n`;
		}
	}
	
	// Если закончилось все таймаутом
	if (operations.timeout.active) {
		script += '`);\n'
		operations.timeout.active = false;
	}
	
	// Если закончилось все интервалом
	if (operations.interval.active) {
		script += '`);\n'
		operations.interval.active = false;
	}
	
	// Если скрипт закончился, а условный блок так и не закрылся
	if (operations.condition.active) {
		while (operations.condition.tab !== 0) {
			script += '}';
			--operations.condition.tab;
		}
	}
	
	/*if (!save) {
		script = `this.save('${save}'); ` + script;
	} */
	
	if (usual) {
		if (options.temps.length === 0) {
			script += ` ++options.line;`;
		} else {
			script += `  ++options.temps[options.temps.length-1].line;`; 
		}
	}
	
	if (!stop && !next) {
		script += ` this.running = false;`;
	}

	if (next) {
		script += ' this.running = false;';
		script += type === 'async' ? 'await ' : ' ';
		script += 'this.run();'
	}

	if (type === 'async') {
		script += ' })();'
	}
	
	//console.log(script)
	return script;
}