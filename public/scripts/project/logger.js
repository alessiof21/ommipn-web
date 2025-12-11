import { managerGame, options, settingsManager } from './main.js'; 

export default class Logger extends EventTarget {
	constructor(runtime) {
		if (Logger._instance === undefined) {
			super();
			this.runtime = runtime;
			Logger._instance = this;
		} else {
			return Logger._instance;
		}
	}
	
	// Текстовый файл логов ошибок
	logs = ''
	
	// Текстовый файл логов текстов
	texts = '';
	
	// Событие, которое должно произойти после сохранения
	event = ''
	
	// Добавить лог ошибки или информации 
	add(obj) {
		// Формируем лог
		const log = {
			time: new Date().toLocaleTimeString('ru-Ru'),
			text: obj.text
		}
		
		// Записываем ошибку
		if (obj.type === 'error') {
			log.text += `\n${obj.errMessage}\n${obj.errStack}`;
		} else if (obj.type === 'tester') { // Записываем комментарий тестера
			log.text = 'TESTER NOTE: ' + log.text;
		}
	
		// Добавляем лог в общий текст лога
		this.logs += `${log.time} >> ${log.text}\n\n`
		return;
	}
	
	// Выгрузить файл логов ошибок и информации 
	getLogs(event='none') {
		this.event = event;
		if (this.logs) {
			settingsManager.saveFiles('logs', this.logs, 'text',  this.completeSave, this.failSave);
			return true;
		}
		return false;
		/*settingsManager.createDialog('error');*/
		/*
		const button = this.runtime.objects.Button.createInstance('ui', 960, 540);
		button.addEventListener('click', ()=> {
			this.runtime.callFunction('saveLog', 'logs');
		});*/
		
	}
	
	
	// Добавить исправленный текст
	addText(text) {
		const log = {
			text: text
		}
		log.info = `chapter: ${options.chapter} label: ${options.label} line: ${options.line}`;
		if (options.temps.length !== 0) { // Есть развилки
			log.info += ` temp: ${options.temps[options.temps.length-1].type} line: ${options.temps[options.temps.length-1].line}`;
		} 
		this.texts += `${log.info} >> ${log.text}\n\n`;
		return;
	}
	
	getTexts(event='none') {
		this.event = event;
		
		if (this.texts) {
			settingsManager.saveFiles('texts', this.texts, 'text', this.completeSave, this.failSave);
			return true;
		}
		return false;
	}
	
	// То, что надо сделать после успешного сохранения
	completeSave = function () {
		if (this.event === 'closeApp') {
			managerGame.dispatch('main', 'closeApp');
		}
		this.event = '';
		return;
	}.bind(this);
	
	// То, что надо сделать после неуспешного сохранения
	failSave = function() {
		if (this.event === 'closeApp') {
			managerGame.dispatch('main', 'closeApp');
		}
		this.event = '';
		return;
	}.bind(this)
}