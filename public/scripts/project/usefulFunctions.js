import { main } from './main.js'
 
export function containPoint(point, obj, size) {
	return ((point[0] >= obj[0] - size[0]) && (point[0] <= obj[0] + size[0]) && (point[1] >= obj[1] - size[1]) && (obj[1] <= obj[1] + size[1]));
}

export function areaContainPoint(point, area) {
	if (area.type === 'subtraction') {
		const main = area.objects[0];
		const min = area.objects[1];
		if (main.type === 'circle' && min.type === 'circle') {
			if (((point[0] - main.centr[0])**2 + (point[1] - main.centr[1])**2) <= main.radius**2 && ((point[0] - min.centr[0])**2 + (point[1] - min.centr[1])**2) > min.radius**2) {
				return true;
			} 
			return false;
		}
	}
}

export function findDistance(pos1, pos2) {
	const minX = Math.min(pos1[0], pos2[0]);
	const maxX = Math.max(pos1[0], pos2[0]);
	const minY = Math.min(pos1[1], pos2[1]);
	const maxY = Math.max(pos1[1], pos2[1]);
	
	const distance = ((maxX-minX)**2 + (maxY - minY)**2)**0.5;
	const position = [minX + (maxX-minX)/2, minY + (maxY - minY)/2];
	
	return {distance: distance, position: position};
}

export function findDirection(pos1, pos2) {
	const direction = [];
	if (pos2[0] - pos1[0] >= 2) {
		direction[0] = 1;
	} else if (pos2[0] - pos1[0] <= -2) {
		direction[0] = -1;
	} else {
		direction[0] = 0;
	}
	if (pos2[1] - pos1[1] >= 2) {
		direction[1] = 1;
	} else if (pos2[1] - pos1[1] <= -2) {
		direction[1] = -1;
	} else {
		direction[1] = 0;
	}
	return direction;
}

export function recalcPos(x, y) {
	return [main.resolution[0]/main.canvasSize[0]*x, main.resolution[1]/main.canvasSize[1]*y];
}

export function relateCentr(point, pos, size1, size2) {
	return [point[0]-(point[0]-pos[0]+size1[0]/2)*size2[0]/size1[0]+size2[0]/2, point[1]-(point[1]-pos[1]+size1[1]/2)*size2[1]/size1[1]+size2[1]/2];
}

export function recalcOrigin(pos, size) {
	return [pos[0] - size[0]/2, pos[1]-size[1]/2];
}

export function recalcAudio(volume) {
	if (volume > 1) {
		return 0;
	} else if (1 >= volume && volume >= 0.5) {
		return 20 * volume - 20;
	} else if (0 <= volume && volume < 0.5) {
		return 100 * volume - 60;
	} else {
		return -60;
	}
}
