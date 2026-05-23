export type ParsedObj = {
	positions: number[],
	normals: number[],
	vertexCount: number,
}

export function parseOBJ(objText: string): ParsedObj {
	const positions: number[] = [];
	const normals: number[] = [];

	const vList: number[][] = [];
	const vnList: number[][] = [];

	const lines = objText.split('\n');

	for (let line of lines) {
		line = line.trim();
		if (!line || line.startsWith('#')) continue;

		const parts = line.split(/\s+/);
		const type = parts[0];

		if (type === 'v') {
			vList.push([
				parseFloat(parts[1]),
				parseFloat(parts[2]),
				parseFloat(parts[3]),
				1.0
			]);
		} else if (type === 'vn') {
			vnList.push([
				parseFloat(parts[1]),
				parseFloat(parts[2]),
				parseFloat(parts[3]),
				0.0
			]);
		} else if (type === 'f') {
			const fIndices = parts.slice(1).map(p => {
				const sub = p.split('/');
				return {
					vIdx: parseInt(sub[0]) - 1,
					vnIdx: sub[2] ? parseInt(sub[2]) - 1 : -1
				};
			});

			for (let i = 1; i < fIndices.length - 1; i++) {
				const tri = [fIndices[0], fIndices[i], fIndices[i + 1]];

				for (const vertex of tri) {
					positions.push(...vList[vertex.vIdx]);

					if (vertex.vnIdx >= 0 && vnList[vertex.vnIdx]) {
						normals.push(...vnList[vertex.vnIdx]);
					} else {
						normals.push(0, 1, 0, 0);
					}
				}
			}
		}
	}

	return {
		positions,
		normals,
		vertexCount: positions.length / 4
	};
}