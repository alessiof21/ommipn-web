import { main, options, managerGame, audioManager, settingsManager, achievements, logger } from './main.js';
import { saveClasses, loadClasses } from './classes.js';
import { saveLocalVariables, loadLocalVariables } from './scripts.js';

export function saveMain() {
	const saves = {
		volume: {
			sound: audioManager.volume.sound,
			music: audioManager.volume.music,
		},
		language: settingsManager.main.language,
		power: settingsManager.main.power,
		text: settingsManager.main.text,
		achievements: structuredClone(options.achievements)
	};
	
	return saves;
}

export function loadMain(loads) {
	audioManager.volume.sound = loads.volume.sound;
	audioManager.volume.music = loads.volume.music;
	settingsManager.main.language = loads.language;
	settingsManager.main.power = loads.power;
	settingsManager.main.text = loads.text;
	return;
}

export async function saveAchievements(runtime) {
	const saves = {};
	for (const key in achievements) {
		if (achievements[key]) {
			saves[key] = true;
		}
	}
	await runtime.storage.setItem('achievements', saves);
	return;
}

export async function loadAchievements(runtime) {
	const loads = await runtime.storage.getItem('achievements');
	if (loads !== null) {
		for (const key in loads) {
			achievements[key] = loads[key];
		}
	}
	return;
}

export function saveData() {
	const saves = {};
	// Сохраняем главные опции
	saves.options = structuredClone(savesOptions());
	// Сохраняем переменные
	saves.variables = structuredClone(savesVariables());
	// Сохраняем статы
	saves.stats = structuredClone(savesStats());
	// Сохраняем объекты классов
	saves.classes = structuredClone(saveClasses());
	// Сохраняем аудио
	saves.audio = structuredClone(audioManager.save());
	
	// Сохраняем состояние менеджера игры
	saves.managerGame = structuredClone(managerGame.saveStates());
	
	return saves;
}

function savesOptions() {
	const saves = {main: {}, temps: []};
	saves.main.chapter = options.chapter;
	saves.main.label = options.label;
	saves.main.line = options.line;
	saves.temps = JSON.parse(JSON.stringify(options.temps));
	return saves;
}

function savesVariables() {
	const saves = {global: {}, local: {}};
	// Сохраняем глобальные переменные
	for (const key in options.variables) {
		if (typeof options.variables[key] === 'object') {
			if (Array.isArray(options.variables[key])) {
				saves.global[key] = JSON.parse(JSON.stringify(options.variables[key]));
			} else {
				saves.global[key] = structuredClone(options.variables[key]);
			}
		} else {
			saves.global[key] = options.variables[key];
		}
	}
	// Сохраняем локальные переменные
	saves.local = structuredClone(saveLocalVariables());
	return saves;
}

function savesStats() {
	const saves = {};
	// Сохраняем статы
	for (const key in options.stats) {
		saves[key] = options.stats[key];
	}
	return saves;
}

export async function loadData(saves) {
	try {
		logger.add({type: 'info', text: 'LOAD START'});
		// Загружаем главные опции
		loadsOptions(saves.options);	
		// Загружаем все переменные
		loadsVariables(saves.variables);
		// Загружаем все статы
		loadStats(saves.stats);
		// Загружаем все объекты классов
		await loadClasses(saves.classes);
		// Загружаем аудио
		audioManager.load(saves.audio);
		// Загружаем состояние менеджера игры
		managerGame.loadStates(saves.managerGame);
		logger.add({type: 'info', text: 'LOAD END'});
	} catch(e) {
		errorManager.handle(e);
		logger.add({type: 'info', text: 'fail loading data'})
	}

	return;
}

function loadsOptions(loads) {
	options.chapter = loads.main.chapter;
	options.label = loads.main.label;
	options.line = loads.main.line;
	options.temps = JSON.parse(JSON.stringify(loads.temps));
	logger.add({type: 'info', text: 'end loading options'});
	return;
}

function loadsVariables(variables) {
	// Загружаем глобальные переменные
	for (const key in options.variables) {
		if (typeof variables.global[key] === 'object') {
			if (Array.isArray(variables.global[key])) {
				options.variables[key] = JSON.parse(JSON.stringify(variables.global[key]));
			} else {
				options.variables[key] = structuredClone(variables.global[key]);
			}
		} else {
			options.variables[key] = variables.global[key];
		}
	}
	// Загружаем локальные переменные
	loadLocalVariables(variables.local);
	logger.add({type: 'info', text: 'end loading variables'});
	return;
}

function loadStats(stats) {
	for (const key in options.stats) {
		options.stats[key] = stats[key];
	}
	logger.add({type: 'info', text: 'end loading stats'});
	return;
}