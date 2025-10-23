
struct VsOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
};

struct VertexStruct {
	position: vec4f,
}

@group(0) @binding(0) var<storage, read> pos: array<VertexStruct>;
@group(0) @binding(1) var<storage, read> color: array<vec4f>;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {

	// PICKUP HERE. Up next camera.

	let fov = radians(120.0);  // 60° field of view
	let aspect = 16.0 / 9.0;         // canvas width / height (adjust later)
	let near = 0.1;
	let far = 100.0;
	let P = perspective(fov, aspect, near, far);
	// Translate
	let T = mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.03, 0.15, 0.0, 1.0	// move in X, move in Y
	);
	// Scale
	let s = 0.7; // scale factor.
	let S = mat4x4f(
		s, 0.0, 0.0, 0.0,
		0.0, s, 0.0, 0.0,
		0.0, 0.0, s, 0.0,
		0.0, 0.0, 0.0, 1.0,
	);
	// Rotation.
	let Rx = rotationX(radians(45));
	let Ry = rotationY(radians(15));
	let Rz = rotationZ(radians(15));
	var vsOut: VsOutput;
	vsOut.position = P * T * Rx * Ry * Rz * S * pos[vertexIndex].position;
	vsOut.color = color[vertexIndex]; // same color per triangle.
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	return vsOut.color;
}

fn rotationIdentity(angle: f32) -> mat4x4f {
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0,
	);
}

fn rotationX(angle: f32) -> mat4x4f {
	let c = cos(angle);
	let s = sin(angle);
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, c, s, 0.0,
		0.0, -s, c, 0.0,
		0.0, 0.0, 0.0, 1.0,
	);
}

fn rotationY(angle: f32) -> mat4x4f {
	let c = cos(angle);
	let s = sin(angle);
	return mat4x4f(
		c,    0.0,  -s,   0.0,
		0.0,  1.0,   0.0, 0.0,
		s,    0.0,   c,   0.0,
		0.0,  0.0,   0.0, 1.0,
	);
}

fn rotationZ(angle: f32) -> mat4x4f {
	let c = cos(angle);
	let s = sin(angle);
	return mat4x4f(
		c,    s,   0.0, 0.0,
		-s,   c,   0.0, 0.0,
		0.0,  0.0, 1.0, 0.0,
		0.0,  0.0, 0.0, 1.0,
	);
}

fn perspective(fovY: f32, aspect: f32, near: f32, far: f32) -> mat4x4f {
	let f = 1.0 / tan(fovY * 0.5);
	return mat4x4f(
		f / aspect, 0.0, 0.0, 0.0,
		0.0, f, 0.0, 0.0,
		0.0, 0.0, far / (far - near), 1.0,
		0.0, 0.0, (-far * near) / (far - near), 0.0,
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
