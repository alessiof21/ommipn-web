import { main, errorManager, settingsManager, logger } from './main.js';
import { recalcOrigin } from './usefulFunctions.js';


export default class VideoManager {
	constructor(runtime, contextOpts) {
		if (VideoManager._instance === undefined) {
			VideoManager._instance = this;
			this.runtime = runtime;	
			logger.add({type: 'info', text: 'Successfully: videoManager was initialized'})
		} else {
			return VideoManager._instance;
		}
	}
	
	// Список всех видео, которые есть в игре
	lists = {
		'logo': {
			name: 'logoCaravan',
			size: [1920, 1080],
			
		},
		'menu': {
			name: 'menu',
			size: [1920, 1080],
		},
	}
	
	// Проигрывающиеся в данный момент видео
	currents = {}
	
	play(name, layer, pos, loop=false, endEvent=null) {
		try {
			const position = recalcOrigin(pos, this.lists[name].size);
			const inst = this.runtime.objects.video;
			let video = null;
			
			const startVideo = function() {
				inst.removeEventListener('instancecreate', startVideo);
				if (video !== null) {
					[video.width, video.height] = this.lists[name].size;
					this.currents[`${video.uid}`] = {video: video, name: name};
					if (endEvent !== null) {
						this.currents[`${video.uid}`].endEvent = endEvent;
					}
					this.runtime.callFunction('createVideo', `${this.lists[name].name}.mp4`, `${this.lists[name].name}.webm`, loop, video.uid);
				} else {
					globalThis.requestAnimationFrame(()=> startVideo());				
				}
			}.bind(this);
			
			inst.addEventListener('instancecreate', startVideo);
			video = inst.createInstance(layer, ...position);
		} catch(e) {
			errorManager.handle(e);
		}
		return;
	}
	
	stop(name) {
		for (const uid in this.currents) {
			if (this.currents[uid].name === name) {
				this.ended(+uid);
				break;
			}
		}
		return;
	}
	
	ended(uid) {
		const video = this.currents[`${uid}`].video;
		video.destroy();
		if (this.currents[`${uid}`].endEvent) { // Если нужно диспатчнуть событие после окончания видео
			if (this.currents[`${uid}`].endEvent.manager === 'settingsManager') {
				settingsManager.dispatch(this.currents[`${uid}`].endEvent.event);
			}
		}
		delete this.currents[`${uid}`];
		return;
	}
	
	loadError(uid) {
		errorManager.handle(new Error(`Failed to play video with name ${this.currents[`${uid}`].name}`));
		this.ended(uid);
		return;
	}
}