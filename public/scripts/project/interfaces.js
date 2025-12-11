import { managerGame ,uiManager, controller } from './main.js';
import { HTMLPicture } from './classes.js';
import { relateCentr } from './usefulFunctions.js';

export default {
	zoom() {
		return {
			async start(pic) {
				pic.functions['do'] = this.do.bind(this);
				[this.width, this.height] = [pic.width, pic.height];
				[this.dw, this.dh] = [this.width/10, this.height/10];
				[this.maxWidth, this.maxHeight] = [pic.width*2, pic.height*2];
				if (!managerGame.isInventory) {
						this.exitButton = await HTMLPicture.create('svgReturn', 129, 980);

					this.exitButton.addEventListener('clicked', ()=> globalThis.nextTick(()=> this.end(pic)));

					uiManager.addButton(this.exitButton, 'clicked', 'noanimation-hover-sound(c-button)');
				}

			},
			do(pic) {
				// Zoom
				const dZoom = controller.type === 'mouse' ? 25 : 15;
				const zoom = controller.isZoom();
				if (zoom !== null) {
					if (zoom.direction === 'in') {
						if (pic.width + this.dw <= this.maxWidth && pic.height + this.dh <= this.maxHeight) {
							const oldSize = [pic.width, pic.height];
							pic.width += this.dw;
							pic.height += this.dh;
							[pic.x, pic.y] = relateCentr(zoom.position, [pic.x, pic.y], oldSize, [pic.width, pic.height]);
						} else {
							[pic.width, pic.height] = [this.maxWidth, this.maxHeight];
						}
					} else {
						if (pic.width - this.dw >= this.width && pic.height - this.dh >= this.height) {
							const oldSize = [pic.width, pic.height];
							pic.width -= this.dw;
							pic.height -= this.dh;
							[pic.x, pic.y] = relateCentr(zoom.position, [pic.x, pic.y], oldSize, [pic.width, pic.height]);
						} else {
							[pic.width, pic.height] = [this.width, this.height];
						}
					}
				} 
				const drag = controller.isDrag() && !controller.isMultiTouch();
				const direction = controller.getDirection() || [0,0];
				if (pic.x - dZoom*direction[0] >= 960 - (pic.width-this.width)/2) {
					if (pic.x - dZoom*direction[0] <= 960 + (pic.width-this.width)/2) {
						if (drag) {
							pic.x -= dZoom*direction[0];
						}
					} else {
						pic.x = 960 + (pic.width-this.width)/2;
					}
				} else {
					pic.x = 960 - (pic.width-this.width)/2;
				} 
				if (pic.y - dZoom*direction[1] >= 540 - (pic.height - this.height)/2) {
					if (pic.y - dZoom*direction[1] <= 540 + (pic.height - this.height)/2) {
						if (drag) {
							pic.y -= dZoom*direction[1];
						}
					} else {
						pic.y = 540 + (pic.height - this.height)/2;
					}
				} else {
					pic.y = 540 - (pic.height - this.height)/2;
				}
				return;
			},
			end(pic) {
				this.exitButton.destroy();
				this.exitButton = null;
				[pic.width, pic.height] = [this.width, this.height];
				managerGame.hideSVGImage(pic.name);
				managerGame.run();
				return;
			},
			width: 0,
			height: 0,
			dw: 0,
			dh: 0,
			maxWidth: 0,
			maxHeight: 0,
			exitButton: null
		}
	},
	button(eventName, buttonType = 'usual') {
		const start = function(inst) {
			uiManager.addButton(inst, eventName, buttonType)
		}
		
		return {
			"start" : start 
		}
	}
};

