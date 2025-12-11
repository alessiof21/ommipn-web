// Аудио-менеджер
// Два режима: для систем, что поддерживают <audio>, и для тех систем, где это не применимо (например, iOs) -  вместо этого вся работа идет через audioContext (что невсегда поддерживают те системы, что поддерживают <audio>)

import { main, errorManager, logger } from './main.js';
import { recalcAudio } from './usefulFunctions.js';

export default class AudioManager {
	constructor(runtime, opts) {
		if (AudioManager._instance === undefined) {
			AudioManager._instance = this;
			this.runtime = runtime;
			this.list = structuredClone(opts);	
			logger.add({type: 'info', text: 'Successfully: audioManager was initialized'})
		} else {
			return AudioManager._instance;
		}
	}
	
	// Работает ли аудиоменеджер
	working = true;
	
	// Характеристики звука
	volume = {
		sound: 1, 
		music: 1, 
	}
	
	// Список звуков
	list = {}
	
	// Список играющих композиций
	currents = {
		sound: {},
		music: {},
	}
	
	// Проверка тех композиций, что закончились
	checkPlayback() {
		for (const type in this.currents) {
			for (const name in this.currents[type]) {
				if (this.currents[type][name].paused) continue;
				const answer = this.runtime.callFunction('checkPlayback', this.currents[type][name].tag);
				if (answer === 'ended') {
					delete this.currents[type][name];
				}
			}
		}
	}
	
	// Изменение громкости звука
	changeSound(newValue) {
		const newSound = newValue < 0 ? 0 : newValue > 1 ? 1 : newValue;
		if (newSound !== this.volume.sound) {
			this.setVolume({sound: Number(newSound.toFixed(2)), music: null})
		} 
		return;
	}
	
	// Изменение громкости музыки
	changeMusic(newValue) {
		const newMusic = newValue < 0 ? 0 : newValue > 1 ? 1 : newValue;
		if (newMusic !== this.volume.music) {
			this.setVolume({sound: null, music: Number(newMusic.toFixed(2))});
		}
		return;
	}
	// Сохранение играющих звуков
	save() {
		const saves = {sound: {}, music: {}};
		for (const type in this.currents) {
			for (const name in this.currents[type]) {
				saves[type][name] = structuredClone(this.currents[type][name]);
			}	
		}
		return saves;
	}
	
	// Загрузка звуков, которые играли при сохранении
	load(loads) {
		for (const type in loads) {
			for (const name in loads[type]) {
				this.play(name, loads[type][name].startVolume, loads[type][name].loop, loads[type][name].paused);
			}
		}
		logger.add({type: 'info', text: 'end loading audio'});
		return;
	}
		
	// По короткому имени получаем длинное
	getName(name, type = undefined) {
		if (type === undefined) {
			if (this.list.sound.hasOwnProperty(name)) {
				return this.list.sound[name];
			} else if (this.list.music.hasOwnProperty(name)) {
				return this.list.music[name];				
			} 
			errorManager.handle(new Error(`AudioError: don't exist audio with shortname ${name}`));
		} else {
			if (this.list.hasOwnProperty(type) && this.list[type].hasOwnProperty(name)) {
				return this.list[type][name];
			}
			errorManager.handle(new Error(`AudioError: don't exist ${type} in audioManager or don't exist audio with shortname ${name}`));
		}
		return null;
	}
	
	// По короткому имени определяет и возвращает тип аудио
	getType(name) {
		if (this.list.sound.hasOwnProperty(name)) {
			return 'sound';
		} else if (this.list.music.hasOwnProperty(name)) {
			return 'music';				
		}
		errorManager.handle(new Error(`AudioError: don't exist audio with shortname ${name}`));
		return null;
	}
	
	// Запустить аудио
	play(name, volume = 1, loop = false, paused = false) {
		// Определяем тип: sound или music
		const type = this.getType(name);
		if (type === null) return;
		// Определили имя полное композиции
		const realName = this.getName(name);
		if (realName === null) return;
		// Определили действительную громкость звука относительно общей громкости
		const realVolume = recalcAudio(volume*this.volume[type]);
		// Записываем композицию в список воспроизводимых сейчас, сохраняем ее изначальную громкость и нынешнюю громкость
		const tag = loop ? `${name} looping` : `${name} isNotLooping`;
		this.currents[type][name] = {
			volume: realVolume,
			startVolume: volume,
			paused: false,
			specialPaused: false,
			loop: loop,
			tag: tag
		}
		// Запускаем функцию
		this.runtime.callFunction(`${type}Play`, realName, realVolume, loop, tag);
		if (paused) {
			this.pause(name, true);
		}
		return;
	}
	
	// Загружаем декодированное аудио
	async loadAudio(url) {
		const arrayBuffer = await this.runtime.assets.fetchArrayBuffer(url);	
		const audioBuffer = await this.decodeAudioData(arrayBuffer);
		return audioBuffer;

	}
	
	// Декодируем аудио из wemb в аудиоформат для проигрывания
	async decodeAudioData(arrayBuffer) {
		if (this.runtime.assets.isWebMOpusSupported) {
			return new Promise((resolve, reject) => {
				this.audioContext.decodeAudioData(arrayBuffer, resolve, reject);
			});
		} else { // Не встроенная поддержка для WebM Opus: использовать декодер движка
			return await this.runtime.assets.decodeWebMOpus(this.audioContext, arrayBuffer);
		}
	}
	
	// Проигрывание декодированного аудио
	async playAudio(url, paused = false) {
		const audioBuffer = await this.loadAudio(url);
		const source = this.audioContext.createBufferSource();
		source.buffer = audioBuffer;		
		if (!paused) {
			source.start(0);		
		}

		return source;
	}
	
	// Закончить аудио 
	stop(name, dV = 0.5) {
		// Определили тип, что это: звук или музыка
		const type = this.getType(name);
		if (!this.currents[type].hasOwnProperty(name)) return;
		// Определили имя полное композиции
		const realName = this.currents[type][name].tag;
		// Текущая громкость
		let volume = this.currents[type][name].volume;
		delete this.currents[type][name];
		
		const step = function() {
			if (volume <= -40) {
				this.runtime.callFunction('stop', realName);
			} else {
				volume -= dV;
				this.runtime.callFunction('changeVolume', realName, volume);
				globalThis.nextTick(step);
				//globalThis.requestAnimationFrame(()=> step());
			}
		}.bind(this);
		
		step();
		return;
	}
	
	// Приостановить аудио
	pause(name, bool, special=false) {
		// Определяем тип: sound или music 
		const type = this.getType(name);
		if (type === null) return;
		if (!this.currents[type].hasOwnProperty(name)) return;
		// Определили имя полное композиции
		const realName = this.currents[type][name].tag;
		if (!this.currents[type][name].paused && bool) {
			const answer = this.runtime.callFunction('pause', realName, true);
			if (answer === 'true') {
				this.currents[type][name].paused = true;
				if (special) {
					this.currents[type][name].specialPaused = true;
				}
			}
		} else if (this.currents[type][name].paused && !bool) {
			// Если пауза неспециальная, но звук был остановлен специально
			if (!special && this.currents[type][name].specialPaused) {
				return;
			}
			const answer = this.runtime.callFunction('pause', realName, false);
			if (answer === 'false') {
				this.currents[type][name].paused = false;
				if (special) {
					this.currents[type][name].specialPaused = false;
				}
			}			
		}
		return;
	}
	
	// Приостановить сразу все
	pauseAll(bool, special=false) {
		for (const type in this.currents) {
			for (const name in this.currents[type]) {
				this.pause(name, bool, special);
			}
		}
		return;
	}
	
	// Выключить всю музыку, что есть
	stopAll() {
		for (const type in this.currents) {
			for (const name in this.currents[type]) {
				this.stop(name);
			}
		}
		return;	
	}
	
	// Меняем общую громкость => меняем громкость у всех аудио (audio = {sound, music})
	setVolume(audio) {
		for (const type in this.currents) {
			if (audio[type] === null) {
				continue;
			}
			for (const name in this.currents[type]) {
				const volume = recalcAudio(this.currents[type][name].startVolume * audio[type]); 
				this.currents[type][name].volume = volume;
				const realName = this.currents[type][name].tag;
				this.runtime.callFunction('changeVolume', realName, volume);
			}
		}
		this.volume.sound = audio.sound === null ? this.volume.sound : audio.sound;
		this.volume.music = audio.music === null ? this.volume.music : audio.music;
		return;		
	}
}
