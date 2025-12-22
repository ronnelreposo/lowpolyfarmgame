
struct VsOutput {
	@builtin(position) position: vec4f,
	@location(0) normal: vec4f,
	@location(1) color: vec4f,
	@location(2) worldPos: vec4f, // world matrix.
	@location(3) @interpolate(flat) modelId: u32,
};

@group(0) @binding(0) var<storage, read> pos: array<vec4f>;
@group(0) @binding(1) var<storage, read> color: array<vec4f>;
@group(0) @binding(2) var<storage, read> normal: array<vec4f>;
@group(0) @binding(3) var<storage, read> models: array<mat4x4f>;
// Model ID per vertex.
@group(0) @binding(4) var<storage, read> modelIds: array<u32>;
@group(0) @binding(5) var<uniform> time: f32;
@group(0) @binding(6) var<uniform> cubeCount: u32;
@group(0) @binding(7) var<uniform> viewProjection: mat4x4f;
// aabb data.
@group(0) @binding(8) var<storage, read> aabbMins: array<vec4f>;
@group(0) @binding(9) var<storage, read> aabbMaxs: array<vec4f>;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {

	// Temporary assignment for usage, prevents error.
	let aabbMins = aabbMins[0];
	let aabbMaxs = aabbMaxs[0];

	let t = time; // temporary assignment, dummy usage.

	var vsOut: VsOutput;
	let model = models[modelIds[vertexIndex]];
	let worldPos = model * pos[vertexIndex];


	vsOut.position = viewProjection * worldPos;
	vsOut.color = color[vertexIndex];

	// Rotate the normal.
	let c0 = model[0].xyz; // col 0.
	let c1 = model[1].xyz; // col 1.
	let c2 = model[2].xyz; // col 2.
	let R = mat3x3f(normalize(c0), normalize(c1), normalize(c2));
	let nWorld = normalize(R * normal[vertexIndex].xyz);
	vsOut.normal = vec4f(nWorld, 0.0);

	vsOut.worldPos = worldPos;
	vsOut.modelId = modelIds[vertexIndex];
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	let Normal = normalize(vsOut.normal.xyz);
	let Light = normalize(vec3f(0.4, 0.7, 0.5));
	// let Light = normalize(vec3f(time, time, 0.5));
	let ndotl = max(dot(Normal, Light), 0.0);
	let ambient = 0.45;

	// Real hard shadow using per-cube OBBs from model matrices:
	var shadow = 1.0;
	if (ndotl > 0.0) {
		shadow = shadow_all_cubes_OBB(vsOut.worldPos.xyz, Normal, Light);
	}

	let lit = vsOut.color.rgb * (ambient + ndotl * shadow);
	return vec4(lit, vsOut.color.a);
}

// ---------- added: OBB shadow helpers ----------
const NO_HIT : f32 = 1e30;

struct BoxTRS { R: mat3x3<f32>, H: vec3<f32> }; // rotation, half-extents
fn extract_box_trs(m: mat4x4f) -> BoxTRS {
	let c0 = m[0].xyz;
	let c1 = m[1].xyz;
	let c2 = m[2].xyz;
	let sx = length(c0);
	let sy = length(c1);
	let sz = length(c2);
	let R  = mat3x3<f32>(
		c0 * (select(0.0, 1.0 / sx, sx > 0.0)),
		c1 * (select(0.0, 1.0 / sy, sy > 0.0)),
		c2 * (select(0.0, 1.0 / sz, sz > 0.0))
	);
	let H = 0.5 * vec3<f32>(sx, sy, sz);
	return BoxTRS(R, H);
}

fn intersect_obb(ro: vec3<f32>, rd: vec3<f32>, center: vec3<f32>,
		H: vec3<f32>, R: mat3x3<f32>, tMin: f32, tMax: f32) -> f32 {
	let Rt = transpose(R);
	let o  = Rt * (ro - center);
	let d  = Rt * rd;

	let invD = 1.0 / d;
	let t0   = (-H - o) * invD;
	let t1   = ( H - o) * invD;
	let tsm  = min(t0, t1);
	let tsM  = max(t0, t1);
	var tNear = max(max(tsm.x, tsm.y), max(tsm.z, tMin));
	var tFar  = min(min(tsM.x, tsM.y), min(tsM.z, tMax));
	if (tFar >= tNear) { return tNear; }
	return NO_HIT;
}

fn shadow_all_cubes_OBB(worldPos: vec3<f32>, worldN: vec3<f32>, lightDir: vec3<f32>) -> f32 {
	let rd    = normalize(lightDir);       // cast TOWARD the light
	let ro    = worldPos + worldN * 2e-3;  // bias
	let tMin  = 2e-4;
	let T_MAX = 100.0;                     // cap distance
	for (var i: u32 = 0u; i < cubeCount; i = i + 1u) {
		let M = models[i];
		let C = M[3].xyz;                  // center (translation)
		let trs = extract_box_trs(M);
		let thit = intersect_obb(ro, rd, C, trs.H, trs.R, tMin, T_MAX);
		if (thit < NO_HIT) { return 0.0; } // blocked
	}
	return 1.0;
}
