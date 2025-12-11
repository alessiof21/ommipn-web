export default function transformate(obj) {
	let script;
	if (typeof obj === 'object') {
		script = {};
		for (const key in obj) {
			script[key] = [];
			script[key][0] = [];

			const arr = obj[key].split('\n');

			let j = 0;
			for (let i = 0; i < arr.length; i++) {
				if (arr[i] === '') {
					++j;
					script[key][j] = [];
				} else {
					script[key][j].push(arr[i]);
				}
			}
		}
	} else if (typeof obj === 'string') {
		script = [];
		script[0] = [];
		
		const arr = obj.split('\n');
		
		let j = 0;
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] === '') {
				++j;
				script[j] = [];
			} else {
				script[j].push(arr[i]);
			}
		}
	}
	
    return script;
}