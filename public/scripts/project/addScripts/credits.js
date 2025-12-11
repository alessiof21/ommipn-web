import { managerGame } from '../main.js';
import { GameText } from '../classes.js';

export function main() {
	let count = 0;
	
	const create = async function() {
		if (count >= data.credits.length || !managerGame.working) return;
		const text = await GameText.create('credit', [512, 1200], `<p class="text black">${data.credits[count].text}</p>`);
		text.width *= data.credits[count].size[0];
		text.height *= data.credits[count].size[1];
		let flag = -1;
		const step = function() {
			if (!managerGame.working) return;
			if (text.y < -200) {
				text.destroy();
				if (flag === data.credits.length - 1) {
					managerGame.run();
				}
			} else {
				text.y -= 3;
				if (text.y <= (950 - text.height/2) && flag === -1) {
					flag = count;
					++count;
					create();
				}
				globalThis.nextTick(step);
			}
		}
		
		globalThis.nextTick(step);
	}
	
	create();
}

const data = {
	credits: [
		{
			size: [1, 1.5],
			text: `По мотивам вселенной сериала<br>Антона Лапенко и Алексея Смирнова`
		},
		{
			size: [1, 1],
			text: `<b>Сценарист</b><br>Виктория Федоренко`			
		},
		{
			size: [1, 1.5],
			text: `<b>Редакторы</b><br>Виктория Федоренко<br>Алексей Федоренко`			
		},
		{
			size: [1, 1],
			text: `<b>Художник</b><br>Виктория Федоренко`			
		},
		{
			size: [1, 1],
			text: `<b>Программист</b><br>Алексей Федоренко`			
		},
		{
			size: [1, 1.5],
			text: `<b>Геймдизайнеры</b><br>Алексей Федоренко<br>Виктория Федоренко`			
		},
		{
			size: [1, 1.5],
			text: `<b>Работа со звуком</b><br>Алексей Федоренко<br>Виктория Федоренко`		
		},
		{
			size: [1, 2.5],
			text: `Выражаем благодарность нашим тестерам!<br>отдельное спасибо:<br>Дмитрий Федоренко<br>Ксения Блоха<br>Алексей Хвостов`			
		},
		/*{
			size: [1, 1],
			text: `<b>Переводчики</b><br>Здесь будут ваши фамилии`			
		} */
	]
}