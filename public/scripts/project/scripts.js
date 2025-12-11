import { errorManager, settingsManager } from './main.js';

export const chaptersList = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6', 'chapter7', 'chapter8', 'chapter9', 'chapter10', 'ex'];

// Объект со скриптами
export const chapters = {};

// Начальное состояние всех локальных переменных
const initialVariables = {};

// Сбрасываем значения всех локальных переменных на изначальные
export function clearLocalVariables() {
	for (const chapter in chapters) {
		chapters[chapter].dependency.variables = structuredClone(initialVariables[chapter])
	}
	return;
}

// Сохранение локальных переменных
export function saveLocalVariables() {
	const saves = {};
	
	// Проходимся по главам
	for (const key in chapters) {
		saves[key] = {};
		for (const variable in chapters[key].dependency.variables) {
			// Тип переменной object
			if (typeof chapters[key].dependency.variables[variable] === 'object') {
				// Если переменная массив
				if (Array.isArray(chapters[key].dependency.variables[variable])) {
					saves[key][variable] = JSON.parse(JSON.stringify(chapters[key].dependency.variables[variable]));
				} else { // Если переменная обычный объект
					saves[key][variable] = structuredClone(chapters[key].dependency.variables[variable]);
				}
			} else { // Переменная примитивна
				saves[key][variable] = chapters[key].dependency.variables[variable];			
			}
		}
	}
	return saves;
}

// Сохранение глобальных переменных
export function loadLocalVariables(saves) {
	for (const key in chapters) {
		for (const variable in chapters[key].dependency.variables) {
			// Тип переменной object
			if (typeof saves[key][variable] === 'object') {
				// Если переменная массив
				if (Array.isArray(saves[key][variable])) {
					chapters[key].dependency.variables[variable] = JSON.parse(JSON.stringify(saves[key][variable]));
				} else { // Если переменная обычный объект
					chapters[key].dependency.variables[variable] = structuredClone(saves[key][variable]);
				}
			} else { // Переменная примитивна
				chapters[key].dependency.variables[variable] = saves[key][variable];			
			}
		}	
	}
}

// Подготовка скриптов для чтения
export function prepareScripts(runtime) {
	return new Promise(async (resolve, reject)=> {
		for (let c = 0; c < chaptersList.length; c++) {
			// Создаем главу с именем, это объект с зависимостями (где есть переменные) и со скриптом)
			chapters[chaptersList[c]] = {dependency: {variables: {}, functions: {}}, script: {}, info: {}, modules: {default: {}, usual: {}}};
			
			// Перезапись из текстового файла скрипта в js-файл скрипта
			function makeChapter(text) {
				const fileText = text.replace(/\r/gm, '');
				const arrStrings = fileText.split('\n');
				
				const info = arrStrings.slice(arrStrings.indexOf('<info>')+1, arrStrings.indexOf('</info>'));
				for (let i = 0; i < info.length; i++) {
					const infoArr = info[i].split('=');
					chapters[chaptersList[c]].info[infoArr[0].trim()] = infoArr[1].trim();
				}
				
				
				if (arrStrings.includes('<variables>')) {
					const variables = arrStrings.slice(arrStrings.indexOf('<variables>')+1, arrStrings.indexOf('</variables>'));
				
					for (let i = 0; i < variables.length; i++) {
						eval(`chapters['${chaptersList[c]}'].dependency.variables.${variables[i]}`);
					}
					initialVariables[chaptersList[c]] = structuredClone(chapters[chaptersList[c]].dependency.variables);
				} else {
					initialVariables[chaptersList[c]] = {};
				}
				
				if (arrStrings.includes('<functions>')) {
					const functions = arrStrings.slice(arrStrings.indexOf('<functions>')+1, arrStrings.indexOf('</functions>'));
					let count = 0;
					let func = '';
					for (let i = 0; i < functions.length; i++) {
						if (!functions[i].trim()) continue; // Пустая строка
						const matchS = functions[i].match(/{/g)?.length ?? 0;
    					const matchE = functions[i].match(/}/g)?.length ?? 0;
						if (count === 0 && matchS !== 0) {
							func += functions[i].slice(0, functions[i].indexOf('('));
							func += ' = function';
							func += functions[i].slice(functions[i].indexOf('('));
						} else if (count !== 0) {
							func += `\n${functions[i]}`;
						}
						
						count += matchS - matchE;
						if (count === 0) {
							console.log(func)
							eval(`chapters['${chaptersList[c]}'].dependency.functions.`+func)
							func = '';
						}
					}
				}
				
				if (arrStrings.includes('<module-js>')) {
					const modules = arrStrings.slice(arrStrings.indexOf('<module-js>')+1, arrStrings.indexOf('</module-js>'));
					for (let i = 0; i < modules.length; i++) {
						if (modules[i].startsWith('default')) {
							modules[i] = modules[i].replace('default', '').trim();
							const [moduleName, url] = modules[i].split(' from ');
							(async() => chapters[chaptersList[c]].modules.default[moduleName] = await import(eval(url)))();
							
						} else {
							const [moduleName, url] = modules[i].split(' from ');
							(async() => chapters[chaptersList[c]].modules.usual[moduleName] = await import(eval(url)))();
						}
					}
				}

				const scripts = arrStrings.slice(arrStrings.indexOf('<scripts>')+1, arrStrings.indexOf('</scripts>'));

				let currentLabel = ``;
				for (let i = 0; i < scripts.length; i++) {
					if (scripts[i].startsWith('label')) {
						currentLabel = scripts[i].slice(6, scripts[i].indexOf(':'));
						chapters[chaptersList[c]].script[currentLabel] = [[]];
					} else {
						if (!scripts[i]) {
							chapters[chaptersList[c]].script[currentLabel].push([]);
						} else {
							chapters[chaptersList[c]].script[currentLabel][chapters[chaptersList[c]].script[currentLabel].length-1].push(scripts[i]);		
						}
					}
				}
				for (const key in chapters[chaptersList[c]].script) {
					chapters[chaptersList[c]].script[key] = chapters[chaptersList[c]].script[key].filter(elem => elem.length !== 0);
				}
			}
			
			// Получаем имя файла, который нужно загрузить, согласно выбранному языку
			const nameChapter = `${chaptersList[c]}.${settingsManager.main.language}`;
			
			// Загружаем текстовый файл главы
			await fetch(`./chapters/${settingsManager.main.language}/${nameChapter}.txt`)
				.then(async (data)=> await data.text()).then((text) => makeChapter(text))
				.catch(async (err) => {
					errorManager.handle(err);
					await runtime.assets.fetchText(`./chapters/${settingsManager.main.language}/${nameChapter}.txt`).then((text) => makeChapter(text))
				})
				.catch((err) =>	{
					errorManager.handle(err);
					reject(new Error(`Critical: Error occurs during load script ${chaptersList[c]}.txt`));				
			})

		}	
		console.log(initialVariables);
		resolve(chapters);	
	});
}


