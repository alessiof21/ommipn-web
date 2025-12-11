// Импортируем классы объектов
import { SpriteObject, Background, Person, Picture, GameText, SVGPicture, HTMLPicture } from './classes.js';
// Импортируем логгер и менеджер ошибок
import { logger, errorManager } from './main.js'; 
// Импортируем интерфейсы для объектов
import interfaces from './interfaces.js';

// Редактируем входные данные
function editOpts(opts) {
	for (const name in opts) {
		if (opts[name]?.functions) {
			const args = opts[name].functions.arguments ?? [];
			opts[name].functions = interfaces[opts[name].functions.type](...args);
		}
	}
	return opts;
}

// Классы, которые необходимо инициализировать
const classes = {
	htmls: {
		parent:	HTMLPicture,
		one: true
	},
	sprites: {
		parent: SpriteObject,
		one: false
	},
	backgrounds: {
		parent: Background,
		one: false
	},
	persons: {
		parent: Person,
		one: false
	},
	pictures: {
		parent: Picture,
		one: false
	},
	texts: {
		parent: GameText,
		one: true
	},
	svgpictures: {
		parent: SVGPicture,
		one: true
	}
};

// Иницилизируем все объекты, что есть в игре
export function initializate(runtime, opts) {
	try {
		for (const className in classes) {
			initializateClass(runtime, className, opts[className]);
		}
		logger.add({type: 'info', text: 'Successfully: all objects were initialized'})
	} catch(e) {
		logger.add({type: 'info', text: 'Error: all objects were not initialized'})
		errorManager.handle(e);
		throw new Error('Failed to initialize all objects');
	}
	return;
}

// Инициализация всех объектов класса с именем className
function initializateClass(runtime, className, opts) {
	try {
		if (classes[className].one) {
			for (const name in opts) {
				const editOptions = editOpts(opts[name]);
				classes[className].parent.setClass(runtime.objects[name], editOptions);
			}
		} else {
			const editOptions = editOpts(opts);
			for (const name in editOptions) {
				classes[className].parent.setClass(runtime.objects[name], editOptions[name]);
			}
		}
		logger.add({type: 'info', text: `Successfully: ${className} objects were initialized`})
	} catch(e) {
		logger.add({type: 'info', text: `Error: ${className} objects were not initialized`});
		errorManager.handle(e);
		throw new Error(`${className} objects were not initialized`);
	}
}
