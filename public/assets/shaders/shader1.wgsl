
struct VsOutput {
	@builtin(position) position: vec4f,
	@location(0) normal: vec4f,
	@location(1) color: vec4f,
};

@group(0) @binding(0) var<storage, read> pos: array<vec4f>;
@group(0) @binding(1) var<storage, read> color: array<vec4f>;
@group(0) @binding(2) var<storage, read> normal: array<vec4f>;
@group(0) @binding(3) var<storage, read> models: array<mat4x4f>;
// Model ID per vertex.
@group(0) @binding(4) var<storage, read> modelIds: array<u32>;

@group(0) @binding(5) var<uniform> camera: vec4f;
@group(0) @binding(6) var<uniform> aspect: vec2f;
@group(0) @binding(7) var<uniform> time: f32;
@group(0) @binding(8) var<uniform> subj: vec4f;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {

	let t = time; // temporary assignment, dummy usage.

	let fov = radians(60.0);  // 45° field of view
	let aspect = aspect.x / aspect.y;
	let near = 0.1;
	let far = 100.0;
	let P = perspective(fov, aspect, near, far);

	// Camera
	let eye = camera.xyz; // where your camera in world space.
	// let orbitRadius = 5.1;
	// let PI = 3.141592653589793;
	// let eye = vec3f(
	// 	orbitRadius * cos(time * PI * 2.0),
	// 	camera.y,
	// 	orbitRadius * sin(time * PI * 2.0),
	// ); // where your camera in world space.
	let up = vec3f(0.0, 1.0, 0.0);
	let V = lookAt(eye, subj.xyz, up);

	var vsOut: VsOutput;
	vsOut.position = P * V * models[modelIds[vertexIndex]] * pos[vertexIndex];
	vsOut.color = color[vertexIndex];
	vsOut.normal = normal[vertexIndex];
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	let Normal = normalize(vsOut.normal.xyz);
	let Light = normalize(vec3f(0.4, 0.7, 0.5));
	let ndotl = max(dot(Normal, Light), 0.0);
	let ambient = 0.45;

	let lit = vsOut.color.rgb * (ambient + ndotl);
	return vec4(lit, vsOut.color.a);
}

fn perspective(fovY: f32, aspect: f32, near: f32, far: f32) -> mat4x4f {
	let f = 1.0 / tan(fovY * 0.5);
	return mat4x4f(
		f / aspect, 0.0, 0.0, 0.0,
		0.0, f, 0.0, 0.0,

		0.0, 0.0, far / (far - near), 1.0,
		0.0, 0.0, (-far * near) / (far - near), 0.0,

		// 0.0, 0.0, far / (near - far), 1.0,
		// 0.0, 0.0, (far * near) / (-near - far), 0.0,
	);
}

fn identityPerspective() -> mat4x4f {
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0
	);
}

fn lookAt(eye: vec3f, subj: vec3f, up: vec3f) -> mat4x4f {
	let zAxis = normalize(subj - eye);      // Forward (+Z goes into screen)
	let xAxis = normalize(cross(up, zAxis));  // Right
	let yAxis = cross(zAxis, xAxis);          // Up

	return mat4x4f(
		xAxis.x, yAxis.x, zAxis.x, 0.0,
		xAxis.y, yAxis.y, zAxis.y, 0.0,
		xAxis.z, yAxis.z, zAxis.z, 0.0,
		-dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1.0,
	);
}
