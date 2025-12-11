import { managerGame, logger, settingsManager, uiManager } from './main.js';

export default class ErrorManager extends EventTarget {
	constructor(runtime) {
		if (ErrorManager._instance === undefined) {
			super();
			this.runtime = runtime;
			ErrorManager._instance = this;
		} else {
			return ErrorManager._instance;
		}
	}
	
	runOnStartupError = false // Возникла ли критическая ошибка при runOnStartup
	
	async check() {
		if (!this.runOnStartupError) return;
		settingsManager.state = 'error';
		const dialog = this.runtime.objects.dialog.createInstance('ui', 960, 540);
		const text = this.runtime.objects.text.createInstance('ui', -1000, -1000);
		[text.width, text.height] = [512, 128];
		await text.setContent(`<p class="text dark">An exception occurred while starting game. App will closed.</p>`);
		globalThis.nextTick(()=> [text.x, text.y] = [960, 475]);
		const button = this.runtime.objects.exitButton.createInstance('ui', 800, 590);
		button.addEventListener('click', async ()=> {
			managerGame.addEvent('main', 'closeApp', managerGame.endGame);
			await logger.getLogs('closeApp');
		});
		return;
	}
	
	handle(e) {
		logger.add({type: 'error', text: 'Error!', errMessage: e.message, errStack: e.stack});
		if (e.message.startsWith('Critical')) {
			if (e.message === 'Critical Error: failed to runOnStartup') {
				// Здесь надо сделать на случай ошибки при загрузке, когда не прогрузились спрайты для диалогового окна и тд
				this.runOnStartupError = true;
				/*
				this.runtime.addEventListener("beforeprojectstart", ()=> {
					settingsManager.state = 'error';
					const button = this.runtime.objects.dialogButton.createInstance('ui', 960, 540);
					button.addEventListener('click', async ()=> {
						managerGame.addEvent('main', 'closeApp', managerGame.endGame);
						await logger.getLogs('closeApp');
					})
				});*/
			} else {
				this.endApp();		
			}
		}
	}
	
	async endApp() {
		logger.add({type: 'info', text: 'Critical Error has occurred, app will terminate.'});
		
		managerGame.addEvent('main', 'closeApp', managerGame.endGame);
		settingsManager.state = 'error';
		await settingsManager.createDialog('error');
		return;
	}
}



class SaveLoadError extends Error {
  constructor(message) {
    super(message); 
    this.name = "SaveLoad"; 
  }
}

