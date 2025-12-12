
// Put imports here that you wish to use for script blocks in event sheets, e.g.:
import { main, managerGame, options, audioManager, logger, settingsManager, controller, videoManager } from './main.js';
import ManagerGame from './gameManager.js';
import { SVGPicture, HTMLPicture, GameText } from './classes.js';
import { chapters } from './scripts.js';

// import * as myModule from "./mymodule.js";

// Then you can use 'myModule' in script blocks in event sheets.

const scriptsInEvents = {

	async Settings_Event7_Act1(runtime, localVars)
	{
		const video = runtime.objects.video.getFirstPickedInstance();
		videoManager.loadError(video.uid);
	},

	async Settings_Event8_Act1(runtime, localVars)
	{
		const video = runtime.objects.video.getFirstPickedInstance();
		videoManager.ended(video.uid);
	},

	async Settings_Event24_Act1(runtime, localVars)
	{
		audioManager.checkPlayback();
	},

	async Settings_Event27_Act1(runtime, localVars)
	{
		localVars.data = settingsManager.savingFile;
	},

	async Settings_Event28_Act1(runtime, localVars)
	{
		localVars.data = '';
		settingsManager.dispatch('failSave', true);
	},

	async Settings_Event29_Act1(runtime, localVars)
	{
		localVars.data = '';
		settingsManager.dispatch('successSave', true);
	},

	async Settings_Event30_Act1(runtime, localVars)
	{
		localVars.data = '';
		settingsManager.dispatch('failSave', true);
	},

	async Settings_Event31_Act1(runtime, localVars)
	{

	},

	async Settings_Event33_Act2(runtime, localVars)
	{

	},

	async Menu_Event1_Act1(runtime, localVars)
	{
		/*const autosave = await runtime.storage.getItem('autosave');
		
		const callback = () => console.log('Успешно');
		const errCallback = () => console.log('Неуспешно');
		
		await settingsManager.saveFiles('autosave', JSON.stringify(autosave), 'save', callback, errCallback);*/
	},

	async Menu_Event2_Act1(runtime, localVars)
	{
		const startText = runtime.getInstanceByUid(19); 
		startText.destroy();
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
