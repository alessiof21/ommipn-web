//-------------------------Необходимый импорт---------------------------------------------------
import ManagerGame from './gameManager.js'; // Управление игрой
import UiManager from './uiManager.js'; // Взаимодействие с кнопками и интерфейсами
import Controller from './controller.js'; // Взаимодействие с игроком
import AudioManager from './audioManager.js'; // Управление звуком
import VideoManager from './videoManager.js'; // Управление видео
import Logger from './logger.js'; // Логирование всех ошибок и заметок
import ErrorManager from './errors.js'; // Обработка ошибок
import SettingsManager from './settings.js'; // Управление настройками и меню
import { saveData, loadAchievements } from './saveload.js'; // Управление сохранением и загрузкой
import { prepareScripts, clearLocalVariables } from './scripts.js'; // Транскрипция txt в js
import { classesTick, clearInstances, preloadBigImages } from './classes.js'; // Взаимодействие с классами
import { initializate } from './initialization.js'; // Инициализация всех объектов
//----------------------------------------------------------------------------------------------

// Переменная для сохранения данных, полученных из файла с информацией main.json
let mainInfo = {};

// Главный объект игры, хранящий информацию о системе и т.д.
export let main = {};

// Главный объект, хранящий всю игровую информацию
export let options = {};

// Создаем переменные для главных объектов
export let managerGame = null;
export let uiManager = null;
export let settingsManager = null;
export let controller = null;
export let logger = null;
export let errorManager = null;
export let audioManager = null;
export let videoManager = null;

// Существующие платформы 
const platforms = []

// Получение информации о платформе
function getPlatform(os) {
	for (let i = 0; i < platforms.length; i++) {
		const platform = new RegExp(platforms[i].platform);
		if (platform.test(os)) {
			return platforms[i].device;
		}
	}
	return 'unknown OS'
}

// Список достижений
export let achievements = {};

// Получить размер экрана
function getCanvasSize(runtime) {
	const platformInfo = runtime.platformInfo;
	main.canvasSize = [platformInfo.canvasCssWidth, platformInfo.canvasCssHeight];
	// Залогируем разрешение экрана
	logger.add({type: 'info', text: `Screen size: ${main.canvasSize.join(' x ')}`});
	return;
}

// Получаем дополнительную информацию об устройстве
function getAdditionalInfo(runtime) {
	const platformInfo = runtime.platformInfo;
	if (main.os === 'unknown OS') {
		main.os = platformInfo.os;
	}
	if (main.type === 'unknown' && main.os !== 'unknown') {
		if (main.os === 'android' || main.os === 'ios') {
			main.type = 'mobile';
		} else {
			main.type = 'pc';
		}
	}
	main.browserEngine = platformInfo.browserEngine;
	main.renderer = platformInfo.renderer;
	main.rendererDetail = platformInfo.rendererDetail;
	main.exportType = platformInfo.exportType;
	return;
}

// Запуск приложения
runOnStartup(async runtime => {
	try {
		// Создаем логгер
		logger = new Logger(runtime);
		
		// Создаем менеджер ошибок
		errorManager = new ErrorManager(runtime);
		
		await fetch(`./main.json`)
			.then(async (response) => await response.json())
			.then((info) => mainInfo = structuredClone(info))
			.catch(async (err) => {
				logger.add({type: 'info', text: 'Fail to fetch "./main.json"'});
				errorManager.handle(err);
				await runtime.assets.fetchJson(`./main.json`)
				.then((info) => mainInfo = structuredClone(info))
			})
			.catch((err) => {
				logger.add({type: 'info', text: 'Fail to fetchJson "./main.json"'});
				errorManager.handle(err);
				errorManager.handle(new Error('Critical Error: failed to runOnStartup'))
			})
		
		// Копируем главную информацию
		main = structuredClone(mainInfo.main);

		// Получаем список платформ
		platforms.push(...(mainInfo.platforms ?? []));
		
		// Получаем игровую информацию
		//options = structuredClone(mainInfo.options);

		main.systemInfo = globalThis.navigator.appVersion;
		main.os = getPlatform(globalThis.navigator.userAgent);
			
		// Получаем настоящий размер canvas
		getCanvasSize(runtime);
		
		if (main.os === 'Linux' || main.os === 'Windows' || main.os === 'Macintosh') {
			main.type = 'pc';
		} else if (main.os !== 'unknown OS') {
			main.type = 'mobile';
		} else {
			main.type = 'unknown';
		}
		
		// Получаем дополнительную информацию об устройстве
		getAdditionalInfo(runtime);
				
		// Залогируем информацию об операционной системе
		logger.add({type: 'info', text: `os: ${main.os}, system: ${main.systemInfo}, type: ${main.type}, env: ${main.env}, browserEngine: ${main.browserEngine}, renderer: ${main.renderer}, rendererDetail: ${main.rendererDetail}`});
		
		// Залогируем, используется ли рабочий режим
		logger.add({type: 'info', text: `Using WORKER: ${runtime.isInWorker}`});
		
		// Загружаем существующие ачивки и фиксируем, какие уже были получены
		achievements = structuredClone(mainInfo.achievements);
		loadAchievements(runtime);
		
		// Инициализируем все объекты, назначаем классы и т.д.
		initializate(runtime, mainInfo.initialization);
	} catch(e) {
		errorManager.handle(e);
		errorManager.handle(new Error('Critical Error: failed to runOnStartup'));
	} finally {
		// Создаем обработчик события "до старта проекта" 
		runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
	}
})

// Сделать полноэкранный режим (для MacOs и linux)
function getFullscreen(runtime) {
	const script = 
		`try {
			var gui = require("nw.gui");
			var win_main = gui.Window.get();
			win_main.enterFullscreen();
		} catch(e) {
			console.error(e);
		}
		`
	globalThis.mainScript(runtime, script);	
}

// До загрузки проекта (спрайты уже созданы)
async function OnBeforeProjectStart(runtime) {
	try {	
		
		// Разворачиваем игру в полноэкранный режим
		//getFullscreen(runtime);
		
		// Создаем менеджер игры, самое главное
		managerGame = new ManagerGame(runtime, mainInfo.managerGame);
		
		// Создаем менеджер всех ui-функций (нажатие кнопок и тд)
		uiManager = new UiManager(runtime);
		
		// Менеджер UI окружения экраов меню и тд
		settingsManager = new SettingsManager(runtime, mainInfo.settings);
		
		// Создаем контроллер
		controller = new Controller(runtime);
		
		// создаем видеоменеджер
		videoManager = new VideoManager(runtime);
		
		// Создаем аудиоменеджер
		audioManager = new AudioManager(runtime, mainInfo.audioManager);
		
		// Добавляем обработчики событий на тик, клик и прокрутку
		runtime.addEventListener("tick", () => Tick(runtime));
		runtime.addEventListener("pointerdown", (e) => controller.click(e));
		runtime.addEventListener("pointerup", (e) => controller.up(e));
		runtime.addEventListener("pointermove", (e) => controller.move(e));
		runtime.addEventListener("pointercancel", (e)=> controller.cancel(e))
		runtime.addEventListener("wheel", (e) => controller.wheel(e));
		runtime.addEventListener("keydown", (e) => controller.keyboard(e));
		// Пересчитываем размер холста в зависимости от его реального нового размера
		runtime.addEventListener("resize", ()=> getCanvasSize(runtime));
		
		// Проверяем, была ли критическая ошибка в runOnStartup, если была - то выдаем ошибку, получаем логи и закрываем приложение
		await errorManager.check();	
		// Добавляем обработчик слоев
		const menu = runtime.getLayout('menu');
		menu.addEventListener("afterlayoutstart", async ()=> {
			audioManager.stopAll();
			// Добавляем информацию, что прогрузили layout меню успешно
			logger.add({type: 'info', text: 'Successfully: menulayout start after'});
			// Получаем игровую информацию
			options = structuredClone(mainInfo.options);
			clearInstances();
			managerGame.clear();
			clearLocalVariables();
			settingsManager.startGame();
		})
		
		const gameLayout = runtime.getLayout('gameLayout');
		gameLayout.addEventListener("afterlayoutstart", async ()=> {
			// Добавляем информацию, что прогрузили игровой layout успешно
			logger.add({type: 'info', text: 'Successfully: main gamelayout start after'});
			await preloadBigImages(); // Предзагружаем тяжелые картинки (работает ли?)
			//managerGame.waiting = false;
			settingsManager.dispatch('startGameLayout');
		})
		
		
		// Подготавливаем скрипты 
		await prepareScripts(runtime)
			.then((chapters) => {
				// Добавляем информацию, что прогрузили главы успешно
				logger.add({type: 'info', text: 'Successfully: loaded chapters'});			
			})
			.catch((e) => {
				errorManager.handle(e);
			});
			
	} catch(e) {
		errorManager.handle(e);
	}
	// Предзагрузка всех файлов - нужно ли это?
	// await preloadAllImages();
	
	// Облачное сохранение сделать?
	// fetch с сервера при работе интернета
}

// Добавление функции, которое выполнится в следующий тик
globalThis.nextTick = function(callback) {
	const date = Date.now();
	const name = Symbol(`nextTick`);
	queue[name] = {
		time: date,
		callback: callback
	}
	return;
}

// Выполнение кода в режиме основного потока
globalThis.mainScript = async function (runtime, code) {
	const script = runtime.objects.script.createInstance('ui', -100, -100);
	await script.setContent(`(()=> {\n${code} \n})();`);
	script.destroy(); 
	return;	
}

// Обработка очереди коллбэков
function handleQueue(runtime) {
	try { // На всякий случай обрабатываем от возможных ошибок 
		const keys = Object.getOwnPropertySymbols(queue);
		const date = Date.now();
		for (let i = 0; i < keys.length; i++) {
			if (date - queue[keys[i]].time >= 1000*runtime.dt) {
				const callback = queue[keys[i]].callback; // Коллбэк, который надо выполнить
				delete queue[keys[i]]; // Очищаем очередь, чтобы при ошибке задача тоже ушла
				try { // Запускаем коллбэк безопасно, чтобы не прерывать выполнение функции
					callback();
				} catch(e) { // В случае, если коллбэк выдал ошибку, то фиксируем это
					logger.add({type: 'info', text: `Error: unable to execute callback`});
					errorManager.handle(e);
				}

			} 
		}
	} catch(e) {
		errorManager.handle(e);
	}
	return;
}

// Очередь коллбэков, которые должны выполниться на следующем тике
const queue = {};

function Tick(runtime) {
	try {
		handleQueue(runtime); // Обработка коллбэков стэка nextTick
		uiManager.tick(); // Тиковая функция менеджера кнопок и интерфейсов
		// Работают только в случае запущенной игры и отсутствия паузы (аккуратно, проверить)
		if (managerGame.working && !settingsManager.isPaused) {
			managerGame.tick(); // Тиковая функция менеджера игры
			classesTick(); // Тиковая функция классов
		}
		settingsManager.tick(); // Тиковая функция менеджера настроек и меню
		controller.tick(); // Тиковая фукнция контроллера
	} catch(e) {
		errorManager.handle(e);
	}
	return;
}
