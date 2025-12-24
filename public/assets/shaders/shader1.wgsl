
struct Vertex {
	@location(0) position: vec4f,
	@location(1) normal: vec4f,
	@location(2) color: vec4f,
}

struct MeshData {
	vertices: array<Vertex>,
}
struct VsOutput {
	@builtin(position) position: vec4f,
	@location(0) normal: vec4f,
	@location(1) color: vec4f,
};

@group(0) @binding(0) var<storage, read> meshes: MeshData;
@group(0) @binding(1) var<uniform> viewProjection: mat4x4f;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {

	let vertex = meshes.vertices[vertexIndex];
	let m = viewProjection;

	var vsOut: VsOutput;
	vsOut.position = m * vertex.position;
	vsOut.normal = vertex.normal;
	vsOut.color = vertex.color;

	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	let Normal = normalize(vsOut.normal.xyz);
	let Light = normalize(vec3f(0.4, 0.7, 0.5));
	// let Light = normalize(vec3f(time, time, 0.5));
	let ndotl = max(dot(Normal, Light), 0.0);
	let ambient = 0.45;

	// // Real hard shadow using per-cube OBBs from model matrices:
	// var shadow = 1.0;
	// if (ndotl > 0.0) {
	// 	shadow = shadow_all_cubes_OBB(vsOut.worldPos.xyz, Normal, Light);
	// }
	// let lit = vsOut.color.rgb * (ambient + ndotl * shadow);

	let lit = vsOut.color.rgb * (ambient + ndotl);
	return vec4(lit, vsOut.color.a);
}

// // ---------- added: OBB shadow helpers ----------
// const NO_HIT : f32 = 1e30;

// struct BoxTRS { R: mat3x3<f32>, H: vec3<f32> }; // rotation, half-extents
// fn extract_box_trs(m: mat4x4f) -> BoxTRS {
// 	let c0 = m[0].xyz;
// 	let c1 = m[1].xyz;
// 	let c2 = m[2].xyz;
// 	let sx = length(c0);
// 	let sy = length(c1);
// 	let sz = length(c2);
// 	let R  = mat3x3<f32>(
// 		c0 * (select(0.0, 1.0 / sx, sx > 0.0)),
// 		c1 * (select(0.0, 1.0 / sy, sy > 0.0)),
// 		c2 * (select(0.0, 1.0 / sz, sz > 0.0))
// 	);
// 	let H = 0.5 * vec3<f32>(sx, sy, sz);
// 	return BoxTRS(R, H);
// }

// fn intersect_obb(ro: vec3<f32>, rd: vec3<f32>, center: vec3<f32>,
// 		H: vec3<f32>, R: mat3x3<f32>, tMin: f32, tMax: f32) -> f32 {
// 	let Rt = transpose(R);
// 	let o  = Rt * (ro - center);
// 	let d  = Rt * rd;

// 	let invD = 1.0 / d;
// 	let t0   = (-H - o) * invD;
// 	let t1   = ( H - o) * invD;
// 	let tsm  = min(t0, t1);
// 	let tsM  = max(t0, t1);
// 	var tNear = max(max(tsm.x, tsm.y), max(tsm.z, tMin));
// 	var tFar  = min(min(tsM.x, tsM.y), min(tsM.z, tMax));
// 	if (tFar >= tNear) { return tNear; }
// 	return NO_HIT;
// }

// fn shadow_all_cubes_OBB(worldPos: vec3<f32>, worldN: vec3<f32>, lightDir: vec3<f32>) -> f32 {
// 	let rd    = normalize(lightDir);       // cast TOWARD the light
// 	let ro    = worldPos + worldN * 2e-3;  // bias
// 	let tMin  = 2e-4;
// 	let T_MAX = 100.0;                     // cap distance
// 	for (var i: u32 = 0u; i < cubeCount; i = i + 1u) {
// 		let M = models[i];
// 		let C = M[3].xyz;                  // center (translation)
// 		let trs = extract_box_trs(M);
// 		let thit = intersect_obb(ro, rd, C, trs.H, trs.R, tMin, T_MAX);
// 		if (thit < NO_HIT) { return 0.0; } // blocked
// 	}
// 	return 1.0;
// }
